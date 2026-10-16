import cron from "node-cron";
import { getDB } from "../db";
import {
  chlorineData,
  pressureData,
  waterSchemeData,
  schemeEngineerDetails,
  emailAlertLogs,
  schemeStatuses,
} from "../../shared/schema";
import { sendDailyAlertEmail, generateAcknowledgeToken, sendAutomaticOfflineEmails } from "../services/email-service";
import { eq, or, lt, and, isNotNull, sql } from "drizzle-orm";
import { sendDailyAlertSMS } from "../services/sms-service";
import { getExecutiveContacts } from "../services/escalation-service";

interface Alert {
  scheme_id: string;
  scheme_name: string;
  village_name?: string;
  esr_name?: string;
  chlorine_issue?: boolean;
  chlorine_type?: string;
  chlorine_value?: string | number;
  pressure_issue?: boolean;
  pressure_value?: string | number;
  lpcd_issue?: boolean;
  lpcd_value?: string | number;
  water_issue?: boolean;
  water_value?: string | number;
  offline_issue?: boolean;
  offline_sensors?: string;
  flow_offline?: boolean;
  pressure_offline?: boolean;
  chlorine_offline?: boolean;
  offline_time?: string | Date | null;
  telemetry_date?: string;
  ticket_id?: string;
  token?: string;
  streak_days?: number;
}

// Global scheduler state for monitoring & reliability
let isJobRunning = false;
let lastDispatchedDate: string | null = null;
let lastDispatchedTimestamp: string | null = null;
let lastJobDurationMs: number = 0;
let cronHeartbeatInterval: NodeJS.Timeout | null = null;
let isDailyAlertTablesReady = false;

/**
 * Returns current IST time breakdown using standard Intl API.
 */
export function getIstTimeParts(): {
  dateStr: string;
  hour: number;
  minute: number;
  second: number;
  displayStr: string;
} {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);

  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
    if (p.type === "second") second = parseInt(p.value, 10);
  }

  const displayStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return { dateStr, hour, minute, second, displayStr };
}

/**
 * Checks database to see if daily alerts have already been recorded for a specific IST date.
 */
export async function hasAlertsBeenSentToday(targetDateStr?: string): Promise<boolean> {
  try {
    const db = await getDB();
    const dateToCheck = targetDateStr || getIstTimeParts().dateStr;
    const res: any = await db.execute(sql`
      SELECT COUNT(*)::int as count 
      FROM email_alert_logs 
      WHERE sent_date = ${dateToCheck}::date
    `);
    const count = parseInt(res.rows?.[0]?.count || "0", 10);
    return count > 0;
  } catch (err) {
    console.warn("⚠️ Could not check today's alert logs count in DB:", err);
    return false;
  }
}

/**
 * Safely executes the daily alerts job and automatic offline notifications.
 * Enforces a concurrency lock and a 15-minute failsafe execution timeout.
 */
export async function triggerDailyJobIfNotSentToday(triggerSource: string): Promise<boolean> {
  const { dateStr, displayStr } = getIstTimeParts();

  if (isJobRunning) {
    console.log(`⏳ [${triggerSource}] Daily alerts job is currently already in progress. Skipping trigger.`);
    return false;
  }

  if (lastDispatchedDate === dateStr) {
    // Already executed today in this running server instance
    return false;
  }

  const alreadySentInDb = await hasAlertsBeenSentToday(dateStr);
  if (alreadySentInDb) {
    console.log(`ℹ️ [${triggerSource}] Daily alerts already recorded in database for today (${dateStr}). Syncing local state.`);
    lastDispatchedDate = dateStr;
    return false;
  }

  isJobRunning = true;
  const startTime = Date.now();
  console.log(`\n============================================================`);
  console.log(`🚀 [Daily Alerts Engine] Initiating 11:00 AM dispatch (Trigger: ${triggerSource})`);
  console.log(`   Time: ${displayStr} IST | Date: ${dateStr}`);
  console.log(`============================================================\n`);

  // 15-minute failsafe timer to unlock isJobRunning if an unexpected hang occurs
  const timeoutHandle = setTimeout(() => {
    if (isJobRunning) {
      console.error("⚠️ [Daily Alerts Engine] Execution exceeded 15 minutes! Force releasing lock.");
      isJobRunning = false;
    }
  }, 15 * 60 * 1000);

  try {
    await runDailyAlertsJob();
    console.log("📨 Running automatic offline emails to vendors...");
    await sendAutomaticOfflineEmails();

    lastDispatchedDate = dateStr;
    lastDispatchedTimestamp = new Date().toISOString();
    lastJobDurationMs = Date.now() - startTime;
    console.log(`✅ [Daily Alerts Engine] Completed 11:00 AM dispatch for ${dateStr} in ${(lastJobDurationMs / 1000).toFixed(1)}s.`);
    return true;
  } catch (err) {
    console.error("❌ [Daily Alerts Engine] Dispatch encountered an error:", err);
    return false;
  } finally {
    clearTimeout(timeoutHandle);
    isJobRunning = false;
  }
}

/**
 * Returns current status of the daily alerts scheduler for API reporting.
 */
export function getDailyAlertsCronStatus() {
  const rawExpression = process.env.DAILY_ALERTS_CRON_SCHEDULE || "0 11 * * *";
  const cronExpression = rawExpression.replace(/^['"]+|['"]+$/g, '').trim();
  const ist = getIstTimeParts();

  return {
    isConfigured: true,
    cronPattern: cronExpression,
    currentTimeIST: ist.displayStr,
    currentDateIST: ist.dateStr,
    isJobRunning,
    lastDispatchedDate,
    lastDispatchedTimestamp,
    lastJobDurationSeconds: (lastJobDurationMs / 1000).toFixed(1),
  };
}

/**
 * Ensures supporting tables for email acknowledgements and failures exist.
 */
async function ensureDailyAlertTables(db: any) {
  if (isDailyAlertTablesReady) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_acknowledgements (
        id SERIAL PRIMARY KEY,
        token VARCHAR(128) NOT NULL,
        scheme_id VARCHAR(50) NOT NULL,
        alert_type VARCHAR(20) NOT NULL,
        alert_id INTEGER,
        ticket_id VARCHAR(100),
        esr_name VARCHAR(255),
        engineer_email VARCHAR(255) NOT NULL,
        engineer_name VARCHAR(255),
        sent_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON email_acknowledgements(token);
      CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON email_acknowledgements(scheme_id, alert_type, sent_date);

      CREATE TABLE IF NOT EXISTS email_delivery_failures (
        id SERIAL PRIMARY KEY,
        recipient_email VARCHAR(255),
        engineer_name VARCHAR(255),
        scheme_id VARCHAR(100),
        scheme_name VARCHAR(255),
        alert_count INTEGER,
        alert_summary TEXT,
        error_message TEXT,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS consolidated_email_dispatches (
        id SERIAL PRIMARY KEY,
        dispatch_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
        sent_time VARCHAR(20),
        engineer_name VARCHAR(255) NOT NULL,
        engineer_email VARCHAR(255) NOT NULL,
        engineer_role VARCHAR(100) DEFAULT 'DE/AE (Civil)',
        engineer_mobile VARCHAR(30),
        total_schemes INTEGER NOT NULL DEFAULT 1,
        scheme_ids JSONB DEFAULT '[]'::jsonb,
        scheme_names JSONB DEFAULT '[]'::jsonb,
        total_alerts INTEGER NOT NULL DEFAULT 1,
        lpcd_alerts_count INTEGER DEFAULT 0,
        chlorine_alerts_count INTEGER DEFAULT 0,
        pressure_alerts_count INTEGER DEFAULT 0,
        offline_alerts_count INTEGER DEFAULT 0,
        master_token VARCHAR(128),
        subject VARCHAR(255) DEFAULT '🚨 Critical Water Scheme Alerts - Action Required',
        status VARCHAR(50) DEFAULT 'SENT',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_consolidated_email_dispatches_date ON consolidated_email_dispatches(dispatch_date);
      CREATE INDEX IF NOT EXISTS idx_consolidated_email_dispatches_email ON consolidated_email_dispatches(engineer_email);
    `);
    isDailyAlertTablesReady = true;
  } catch (e) {
    // Schema may already exist
  }
}

export function startDailyAlertsCron() {
  const rawExpression = process.env.DAILY_ALERTS_CRON_SCHEDULE || "0 11 * * *";
  const cronExpression = rawExpression.replace(/^['"]+|['"]+$/g, '').trim();

  const parts = cronExpression.split(/\s+/);
  const targetMinute = parseInt(parts[0], 10) || 0;
  const targetHour = parseInt(parts[1], 10) || 11;

  console.log(`⏰ Daily alerts job scheduled for ${targetHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')} IST daily (Pattern: "${cronExpression}")`);

  // 1. Primary Precision Heartbeat: Checks every 30 seconds
  // This guarantees that even if node-cron drifts or sleeps, the job executes exactly once per day
  if (cronHeartbeatInterval) {
    clearInterval(cronHeartbeatInterval);
  }

  cronHeartbeatInterval = setInterval(async () => {
    try {
      const { dateStr, hour, minute } = getIstTimeParts();

      // Check if current IST time matches target hour and is within a 15-minute dispatch window
      const isTargetWindow = (hour === targetHour && minute >= targetMinute && minute <= targetMinute + 15);

      if (isTargetWindow && lastDispatchedDate !== dateStr) {
        await triggerDailyJobIfNotSentToday("precision-heartbeat");
      }
    } catch (hbErr) {
      console.error("⚠️ Error in daily alerts precision heartbeat:", hbErr);
    }
  }, 30000); // 30 seconds ticker

  // 2. Secondary redundant node-cron scheduler
  try {
    cron.schedule(
      cronExpression,
      async () => {
        console.log(`⏰ [node-cron Triggered] Scheduled tick fired for daily alerts.`);
        await triggerDailyJobIfNotSentToday("node-cron");
      },
      {
        timezone: "Asia/Kolkata",
      }
    );
  } catch (cronErr) {
    console.warn("⚠️ node-cron schedule setup warning:", cronErr);
  }

  // 3. Initial startup check: if server starts between 11:00 AM and 11:15 AM and alerts were not sent yet today, trigger catchup
  setTimeout(async () => {
    try {
      const { dateStr, hour, minute } = getIstTimeParts();
      if (hour === targetHour && minute >= targetMinute && minute <= targetMinute + 15) {
        console.log(`⏰ [Server Startup] Detected current time within 11:00 AM window. Verifying if today's alerts were sent...`);
        await triggerDailyJobIfNotSentToday("startup-catchup");
      }
    } catch (startupErr) {
      console.warn("⚠️ Startup alert catchup check warning:", startupErr);
    }
  }, 6000);
}

export async function runDailyAlertsJob() {
  console.log("⏰ Running daily alerts job...");
  try {
    const db = await getDB();
    const allAlertsBySchemeId: Record<string, Alert[]> = {};
    const allAlertsBySchemeName: Record<string, Alert[]> = {};

    const validSchemesRes = await db
      .select({ scheme_id: schemeStatuses.scheme_id, scheme_name: schemeStatuses.scheme_name })
      .from(schemeStatuses)
      .where(eq(schemeStatuses.water_supply, 'Yes'));

    const validSchemeIds = new Set(validSchemesRes.map(r => r.scheme_id).filter(Boolean));
    const validSchemeNames = new Set(validSchemesRes.map(r => r.scheme_name).filter(Boolean));

    const addAlert = (schemeId: string | null, schemeName: string | null, alert: Alert) => {
      const trimmedId = schemeId ? String(schemeId).trim() : "";
      const trimmedName = schemeName ? String(schemeName).trim() : "";
      const lowerName = trimmedName.toLowerCase();

      const isValidId = trimmedId && (validSchemeIds.has(trimmedId) || validSchemeIds.has(schemeId as string));
      const isValidName = trimmedName && (validSchemeNames.has(trimmedName) || validSchemeNames.has(schemeName as string));

      if (!isValidId && !isValidName) {
        return; // Skip schemes that do not have water_supply = 'Yes'
      }

      if (trimmedId) {
        if (!allAlertsBySchemeId[trimmedId]) allAlertsBySchemeId[trimmedId] = [];
        allAlertsBySchemeId[trimmedId].push(alert);
      }
      if (trimmedName) {
        if (!allAlertsBySchemeName[trimmedName]) allAlertsBySchemeName[trimmedName] = [];
        allAlertsBySchemeName[trimmedName].push(alert);
        if (!allAlertsBySchemeName[lowerName]) allAlertsBySchemeName[lowerName] = [];
        allAlertsBySchemeName[lowerName].push(alert);
      }
    };

    // 1. Check Chlorine Data (Low Chlorine < 0.2 mg/L, High Chlorine > 0.5 mg/L)
    const chlorineIssues = await db
      .select()
      .from(chlorineData)
      .where(
        sql`chlorine_value_7 IS NOT NULL
            AND NULLIF(REGEXP_REPLACE(chlorine_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
            AND (
              (NULLIF(REGEXP_REPLACE(chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
              OR (NULLIF(REGEXP_REPLACE(chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) > 0.5
            )`
      );

    chlorineIssues.forEach((row) => {
      const numVal = parseFloat(String(row.chlorine_value_7 || "0"));
      const isHigh = numVal > 0.5;
      addAlert(row.scheme_id, row.scheme_name, {
        scheme_id: row.scheme_id || "N/A",
        scheme_name: row.scheme_name || "N/A",
        village_name: row.village_name || "N/A",
        esr_name: row.esr_name || "N/A",
        chlorine_issue: true,
        chlorine_type: isHigh ? "High Chlorine" : "Low Chlorine",
        chlorine_value: row.chlorine_value_7,
        telemetry_date: row.chlorine_date_day_7 ? String(row.chlorine_date_day_7) : undefined,
      });
    });

    // 2. Check Pressure Data (Strictly LOW PRESSURE ONLY: < 0.2 Bar, never >= 0.2)
    const pressureIssues = await db
      .select()
      .from(pressureData)
      .where(
        sql`pressure_value_7 IS NOT NULL
            AND NULLIF(REGEXP_REPLACE(pressure_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
            AND (NULLIF(REGEXP_REPLACE(pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
            AND (NULLIF(REGEXP_REPLACE(pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) >= 0`
      );

    pressureIssues.forEach((row) => {
      const numVal = parseFloat(String(row.pressure_value_7 || "0"));
      // Strict guard in JS: only send alert email when pressure is strictly below 0.2 Bar
      if (!isNaN(numVal) && numVal < 0.2 && numVal >= 0) {
        addAlert(row.scheme_id, row.scheme_name, {
          scheme_id: row.scheme_id || "N/A",
          scheme_name: row.scheme_name || "N/A",
          village_name: row.village_name || "N/A",
          esr_name: row.esr_name || "N/A",
          pressure_issue: true,
          pressure_value: row.pressure_value_7,
          telemetry_date: row.pressure_date_day_7 ? String(row.pressure_date_day_7) : undefined,
        });
      }
    });

    // 3. Check Water Scheme Data (Keep ONLY LPCD < 55)
    const lpcdIssues = await db
      .select()
      .from(waterSchemeData)
      .where(
        and(
          isNotNull(waterSchemeData.lpcd_value_day7),
          lt(waterSchemeData.lpcd_value_day7, "55")
        )
      );

    lpcdIssues.forEach((row) => {
      const isLpcdIssue = row.lpcd_value_day7 !== null && parseFloat(row.lpcd_value_day7 as any) < 55;

      if (isLpcdIssue) {
        addAlert(row.scheme_id, row.scheme_name, {
          scheme_id: row.scheme_id || "N/A",
          scheme_name: row.scheme_name || "N/A",
          village_name: row.village_name || "N/A",
          lpcd_issue: true,
          lpcd_value: row.lpcd_value_day7,
          telemetry_date: row.lpcd_date_day7 ? String(row.lpcd_date_day7) : undefined,
        });
      }
    });

    // 4. Check Offline Sensors Data (communication_status)
    try {
      const offlineRowsRes: any = await db.execute(sql`
        SELECT
          scheme_id,
          scheme_name,
          region,
          village_name,
          esr_name,
          chlorine_status,
          pressure_status,
          flow_meter_status,
          last_seen,
          pressure_last_seen
        FROM communication_status
        WHERE chlorine_status = 'Offline'
           OR pressure_status = 'Offline'
           OR flow_meter_status = 'Offline'
      `);

      const offlineRows = offlineRowsRes.rows || offlineRowsRes;
      if (Array.isArray(offlineRows)) {
        offlineRows.forEach((row: any) => {
          const offlineSensorsList: string[] = [];
          const isChlorine = row.chlorine_status === 'Offline';
          const isPressure = row.pressure_status === 'Offline';
          const isFlow = row.flow_meter_status === 'Offline';

          if (isChlorine) offlineSensorsList.push('Chlorine');
          if (isPressure) offlineSensorsList.push('Pressure');
          if (isFlow) offlineSensorsList.push('Flow Meter');

          const offlineDate = row.last_seen || row.pressure_last_seen || null;

          addAlert(row.scheme_id, row.scheme_name, {
            scheme_id: row.scheme_id || "N/A",
            scheme_name: row.scheme_name || "N/A",
            village_name: row.village_name || "N/A",
            esr_name: row.esr_name || "N/A",
            offline_issue: true,
            offline_sensors: offlineSensorsList.join(', '),
            flow_offline: isFlow,
            pressure_offline: isPressure,
            chlorine_offline: isChlorine,
            offline_time: offlineDate,
            telemetry_date: offlineDate ? (typeof offlineDate === 'object' ? new Date(offlineDate).toISOString() : String(offlineDate)) : undefined,
          });
        });
      }
    } catch (offlineErr) {
      console.error("⚠️ Error checking offline sensors for daily alerts:", offlineErr);
    }

    // 5. Fetch Scheme Engineer Details for all schemes that have alerts
    const schemeIdsWithAlerts = Object.keys(allAlertsBySchemeId);
    const schemeNamesWithAlerts = Object.keys(allAlertsBySchemeName);

    if (schemeIdsWithAlerts.length === 0 && schemeNamesWithAlerts.length === 0) {
      console.log("✅ No critical alerts found today.");
      return;
    }

    // Query all engineer details and executive contacts
    const allEngineerDetails = await db.select().from(schemeEngineerDetails);
    const execContacts = await getExecutiveContacts();

    // Query past alert logs (up to 30 days in IST) to compute repeat streak for each alert
    const pastAlertsMap = new Map<string, string[]>();
    try {
      const pastAlertsRes: any = await db.execute(sql`
        SELECT 
          scheme_id, 
          alert_type, 
          COALESCE(NULLIF(TRIM(village_name), ''), '-') as village_name, 
          COALESCE(NULLIF(TRIM(esr_name), ''), '-') as esr_name, 
          ARRAY_AGG(DISTINCT sent_date::text ORDER BY sent_date::text DESC) as past_dates 
        FROM email_alert_logs 
        WHERE sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days' 
          AND sent_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        GROUP BY scheme_id, alert_type, COALESCE(NULLIF(TRIM(village_name), ''), '-'), COALESCE(NULLIF(TRIM(esr_name), ''), '-')
      `);
      (pastAlertsRes.rows || []).forEach((r: any) => {
        const key = `${r.scheme_id}|${r.alert_type}|${r.village_name}|${r.esr_name}`.toLowerCase();
        pastAlertsMap.set(key, r.past_dates || []);
      });
    } catch (pastErr) {
      console.warn("⚠️ Could not load past alert logs for streak calculation:", pastErr);
    }

    const getAlertStreak = (alert: Alert): number => {
      const alertType = alert.offline_issue
        ? 'Offline'
        : alert.chlorine_issue
          ? (alert.chlorine_type || (parseFloat(String(alert.chlorine_value || "0").replace(/[^0-9.]/g, '')) > 0.5 ? 'High Chlorine' : 'Low Chlorine'))
          : alert.pressure_issue
            ? 'Low Pressure'
            : 'Low LPCD';
      const village = (alert.village_name && alert.village_name.trim()) ? alert.village_name.trim() : '-';
      const esr = (alert.esr_name && alert.esr_name.trim()) ? alert.esr_name.trim() : '-';
      const key = `${alert.scheme_id}|${alertType}|${village}|${esr}`.toLowerCase();

      const pastDates = pastAlertsMap.get(key) || [];
      // Calculate consecutive days backwards from yesterday in IST
      let streak = 1;
      const today = new Date();
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
        if (pastDates.includes(dStr)) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    };

    // We will batch insert into emailAlertLogs at the end
    const emailLogsToInsert: any[] = [];

    // Group alerts by Engineer (email + role + name) to ensure each designated officer receives a consolidated email
    const emailsToSend: Record<string, { email: string; name: string; role: string; alerts: Alert[] }> = {};

    // Group alerts by Engineer Mobile
    const smsToSend: Record<string, { name: string; email?: string; alerts: Alert[] }> = {};

    const now = new Date();
    const istTimeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
    const istDayOfWeek = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(now);
    console.log(`📅 Daily Alerts Dispatch Day (IST): ${istDayOfWeek}`);

    allEngineerDetails.forEach((engineer) => {
      let schemeAlerts: Alert[] = [];
      const engSchemeId = engineer.scheme_id ? String(engineer.scheme_id).trim() : "";
      const engSchemeName = engineer.scheme ? String(engineer.scheme).trim().toLowerCase() : "";

      // Match by scheme_id
      if (engSchemeId && allAlertsBySchemeId[engSchemeId]) {
        schemeAlerts = schemeAlerts.concat(allAlertsBySchemeId[engSchemeId]);
      }
      // Match by scheme name exact or case-insensitive
      if (engSchemeName && allAlertsBySchemeName[engSchemeName]) {
        schemeAlerts = schemeAlerts.concat(allAlertsBySchemeName[engSchemeName]);
      }
      // Fuzzy / substring match if still empty
      if (schemeAlerts.length === 0 && engSchemeName) {
        for (const [key, alerts] of Object.entries(allAlertsBySchemeName)) {
          const lKey = key.toLowerCase();
          if (lKey.includes(engSchemeName) || engSchemeName.includes(lKey)) {
            schemeAlerts = schemeAlerts.concat(alerts);
            break;
          }
        }
      }

      // Deduplicate alerts for this engineer's scheme and calculate persistence streak
      const uniqueSchemeAlertsMap = new Map();
      schemeAlerts.forEach(a => {
        const key = `${a.scheme_id}-${a.village_name}-${a.esr_name}-${a.chlorine_issue}-${a.chlorine_type}-${a.pressure_issue}-${a.lpcd_issue}-${a.offline_issue}-${a.offline_sensors}`;
        if (!a.streak_days) {
          a.streak_days = getAlertStreak(a);
        }
        uniqueSchemeAlertsMap.set(key, a);
      });
      schemeAlerts = Array.from(uniqueSchemeAlertsMap.values());

      if (schemeAlerts.length > 0) {
        const sanitizeEmails = (raw: string | null | undefined): string[] => {
          if (!raw) return [];
          return raw
            .split(/[,;\/]+/)
            .map(e => e.trim().replace(/^['"]+|['"]+$/g, '').trim().toLowerCase())
            .filter(e => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e));
        };

        const addEngineerEmails = (emails: string[], name: string, role: string, alerts: Alert[]) => {
          if (!alerts || alerts.length === 0) return;
          const taggedAlerts = alerts.map(a => ({
            ...a,
            assignedEngineerName: name,
            assignedEngineerRole: role,
          }));
          emails.forEach(email => {
            const groupKey = `${email}:::${role}:::${name}`;
            if (!emailsToSend[groupKey]) {
              emailsToSend[groupKey] = {
                email,
                name,
                role,
                alerts: [],
              };
            }
            emailsToSend[groupKey].alerts.push(...taggedAlerts);
          });
        };

        // --- SMS Grouping ---
        const sanitizeMobiles = (raw: string | null | undefined): string[] => {
          if (!raw) return [];
          return raw
            .split(/[,;\/]+/)
            .map(m => m.trim().replace(/[^0-9]/g, ''))
            .filter(m => m.length >= 10);
        };

        const addEngineerMobiles = (mobiles: string[], name: string, email: string | undefined, alerts: Alert[]) => {
          if (!alerts || alerts.length === 0) return;
          mobiles.forEach(mobile => {
            if (!smsToSend[mobile]) {
              smsToSend[mobile] = {
                name,
                email,
                alerts: [],
              };
            }
            smsToSend[mobile].alerts.push(...alerts);
          });
        };

        // --- Cadence Filtering Across 5 Escalation Tiers ---
        // 1. DE / AE (Civil): DAILY (all active alerts on this scheme)
        const deCivilAlerts = schemeAlerts;

        // 2. EE (Civil): Executive Engineers receive daily alerts for all schemes in their division
        const eeCivilAlerts = schemeAlerts;

        // 3. Superintending Engineer (SE) & Chief Engineer (CE): EVERY 7 DAYS FOR REPEATING ALERTS (Day 7, 14, 21, etc.)
        const ceSeAlerts = schemeAlerts.filter(a => (a.streak_days || 1) >= 7 && (a.streak_days || 1) % 7 === 0);

        // 4. Member Secretary (MS): EVERY 10 DAYS FOR PERSISTING ISSUES (Day 10, 20, 30, etc.)
        const msAlerts = schemeAlerts.filter(a => (a.streak_days || 1) >= 10 && (a.streak_days || 1) % 10 === 0);

        // 5. Principal Secretary (PS): EVERY 15 DAYS FOR PERSISTING ISSUES (Day 15, 30, etc.)
        const psAlerts = schemeAlerts.filter(a => (a.streak_days || 1) >= 15 && (a.streak_days || 1) % 15 === 0);

        // --- Dispatch by Role ---
        // 1. DE/AE (Civil) - Daily Email & Daily SMS
        addEngineerEmails(
          sanitizeEmails(engineer.de_ae_civil_email || engineer.civil_engineer_email),
          engineer.de_ae_civil_name || engineer.civil_engineer_name || "DE/AE (Civil)",
          "DE/AE (Civil)",
          deCivilAlerts
        );
        addEngineerMobiles(
          sanitizeMobiles(engineer.de_ae_civil_mobile || engineer.civil_engineer_mobile),
          engineer.de_ae_civil_name || engineer.civil_engineer_name || "DE (Civil)",
          engineer.de_ae_civil_email || engineer.civil_engineer_email,
          deCivilAlerts
        );

        // 2. EE (Civil) - Executive Engineer (Daily Email)
        addEngineerEmails(
          sanitizeEmails(engineer.ee_civil_email),
          engineer.ee_civil_name || "Executive Engineer (Civil)",
          "Executive Engineer (Civil)",
          eeCivilAlerts
        );
        addEngineerMobiles(
          sanitizeMobiles(engineer.ee_civil_mobile),
          engineer.ee_civil_name || "EE (Civil)",
          engineer.ee_civil_email,
          eeCivilAlerts
        );

        // 3. Superintending Engineer (SE) - Repeating Alerts Every 7 Days (Email & SMS)
        addEngineerEmails(
          sanitizeEmails(engineer.se_email),
          engineer.se_name || "Superintending Engineer (SE)",
          "Superintending Engineer (SE)",
          ceSeAlerts
        );
        addEngineerMobiles(
          sanitizeMobiles(engineer.se_mobile),
          engineer.se_name || "Superintending Engineer (SE)",
          engineer.se_email,
          ceSeAlerts
        );

        // 4. Chief Engineer (CE) - Repeating Alerts Every 7 Days (Email & SMS)
        addEngineerEmails(
          sanitizeEmails(engineer.chief_engineer_email),
          engineer.chief_engineer_name || "Chief Engineer (CE)",
          "Chief Engineer (CE)",
          ceSeAlerts
        );
        addEngineerMobiles(
          sanitizeMobiles(engineer.chief_engineer_mobile),
          engineer.chief_engineer_name || "Chief Engineer (CE)",
          engineer.chief_engineer_email,
          ceSeAlerts
        );

        // 5. Member Secretary (MS) - Repeating Alerts Every 10 Days
        if (msAlerts.length > 0 && execContacts.ms.email) {
          addEngineerEmails(
            sanitizeEmails(execContacts.ms.email),
            execContacts.ms.name || "Member Secretary (MS)",
            "Member Secretary (MS)",
            msAlerts
          );
        }
        if (msAlerts.length > 0 && execContacts.ms.mobile) {
          addEngineerMobiles(
            sanitizeMobiles(execContacts.ms.mobile),
            execContacts.ms.name || "Member Secretary (MS)",
            execContacts.ms.email,
            msAlerts
          );
        }

        // 6. Principal Secretary (PS) - Repeating Alerts Every 15 Days
        if (psAlerts.length > 0 && execContacts.ps.email) {
          addEngineerEmails(
            sanitizeEmails(execContacts.ps.email),
            execContacts.ps.name || "Principal Secretary (PS)",
            "Principal Secretary (PS)",
            psAlerts
          );
        }
        if (psAlerts.length > 0 && execContacts.ps.mobile) {
          addEngineerMobiles(
            sanitizeMobiles(execContacts.ps.mobile),
            execContacts.ps.name || "Principal Secretary (PS)",
            execContacts.ps.email,
            psAlerts
          );
        }

        // Build emailAlertLogs entries for each issue in this scheme
        schemeAlerts.forEach((alert) => {
          const baseLog = {
            scheme_id: alert.scheme_id,
            scheme_name: alert.scheme_name,
            region: engineer.region || null,
            village_name: alert.village_name || null,
            esr_name: alert.esr_name || null,
            ee_civil_name: engineer.ee_civil_name || null,
            ee_civil_email: engineer.ee_civil_email || null,
            ee_mech_name: engineer.ee_mech_name || null,
            ee_mech_email: engineer.ee_mech_email || null,
            civil_engineer_name: engineer.de_ae_civil_name || engineer.civil_engineer_name || null,
            civil_engineer_email: engineer.de_ae_civil_email || engineer.civil_engineer_email || null,
            de_ae_civil_name: engineer.de_ae_civil_name || engineer.civil_engineer_name || null,
            de_ae_civil_email: engineer.de_ae_civil_email || engineer.civil_engineer_email || null,
            mechanical_engineer_name: engineer.de_ae_mech_name || engineer.site_supervisor_name || engineer.mechanical_engineer_name || null,
            mechanical_engineer_email: engineer.de_ae_mech_email || engineer.site_supervisor_email || engineer.mechanical_engineer_email || null,
            site_supervisor_name: engineer.de_ae_mech_name || engineer.site_supervisor_name || null,
            site_supervisor_email: engineer.de_ae_mech_email || engineer.site_supervisor_email || null,
            de_ae_mech_name: engineer.de_ae_mech_name || engineer.site_supervisor_name || engineer.mechanical_engineer_name || null,
            de_ae_mech_email: engineer.de_ae_mech_email || engineer.site_supervisor_email || engineer.mechanical_engineer_email || null,
            se_name: engineer.se_name || null,
            se_email: engineer.se_email || null,
            chief_engineer_name: engineer.chief_engineer_name || null,
            chief_engineer_email: engineer.chief_engineer_email || null,
            member_secretary_name: execContacts.ms.name || null,
            member_secretary_email: execContacts.ms.email || null,
            principal_secretary_name: execContacts.ps.name || null,
            principal_secretary_email: execContacts.ps.email || null,
            dispatch_type: 'daily',
            telemetry_date: alert.telemetry_date || null,
            sent_time: istTimeStr,
          };

          const generateTicketId = () => `TKT-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          if (alert.chlorine_issue) {
            const chlorineType = alert.chlorine_type || (parseFloat(String(alert.chlorine_value || "0").replace(/[^0-9.]/g, '')) > 0.5 ? "High Chlorine" : "Low Chlorine");
            emailLogsToInsert.push({ ...baseLog, alert_type: chlorineType, alert_value: String(alert.chlorine_value), ticket_id: generateTicketId() });
          }
          if (alert.pressure_issue) {
            emailLogsToInsert.push({ ...baseLog, alert_type: "Low Pressure", alert_value: String(alert.pressure_value), ticket_id: generateTicketId() });
          }
          if (alert.lpcd_issue) {
            emailLogsToInsert.push({ ...baseLog, alert_type: "Low LPCD", alert_value: String(alert.lpcd_value), ticket_id: generateTicketId() });
          }
          if (alert.offline_issue) {
            emailLogsToInsert.push({ ...baseLog, alert_type: "Offline", alert_value: String(alert.offline_sensors || "Offline"), ticket_id: generateTicketId() });
          }
        });
      }
    });

    // Ensure email supporting tables exist once
    await ensureDailyAlertTables(db);

    // Send the consolidated emails (keyed engineer-wise: email + role + name)
    const groupKeys = Object.keys(emailsToSend);
    console.log(`📧 Preparing to send ${groupKeys.length} consolidated alert emails...`);

    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;
    const failedDeliveries: Array<{
      email: string;
      name: string;
      scheme_id: string | null;
      scheme_name: string | null;
      error: string;
      count: number;
    }> = [];

    for (const groupKey of groupKeys) {
      const { email, name, role, alerts } = emailsToSend[groupKey];
      const uniqueAlertsMap = new Map();
      alerts.forEach(a => {
        const key = `${a.scheme_id}-${a.village_name}-${a.esr_name}-${a.chlorine_issue}-${a.chlorine_type}-${a.pressure_issue}-${a.lpcd_issue}-${a.offline_issue}-${a.offline_sensors}`;
        uniqueAlertsMap.set(key, a);
      });
      const uniqueAlerts: Alert[] = Array.from(uniqueAlertsMap.values());

      // Master token for "Acknowledge All" button
      const masterToken = generateAcknowledgeToken();
      try {
        for (const alert of uniqueAlerts) {
          const alertType = alert.offline_issue
            ? 'Offline'
            : alert.chlorine_issue
              ? (alert.chlorine_type || (parseFloat(String(alert.chlorine_value || "0").replace(/[^0-9.]/g, '')) > 0.5 ? 'High Chlorine' : 'Low Chlorine'))
              : alert.pressure_issue
                ? 'Low Pressure'
                : 'Low LPCD';

          const itemToken = generateAcknowledgeToken();
          alert.token = itemToken;

          const engName = (alert as any).assignedEngineerName || name;

          await db.execute(sql`
            INSERT INTO email_acknowledgements (token, scheme_id, alert_type, esr_name, engineer_email, engineer_name, sent_date)
            VALUES (${itemToken}, ${alert.scheme_id}, ${alertType}, ${alert.esr_name || null}, ${email}, ${engName}, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
          `);

          await db.execute(sql`
            INSERT INTO email_acknowledgements (token, scheme_id, alert_type, esr_name, engineer_email, engineer_name, sent_date)
            VALUES (${masterToken}, ${alert.scheme_id}, ${alertType}, ${alert.esr_name || null}, ${email}, ${engName}, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
          `);
        }
      } catch (tokenErr) {
        console.warn("Could not insert email acknowledgement token:", tokenErr);
      }

      let isSuccess = false;
      let failureError: string | null = null;

      try {
        // Enforce 25-second timeout on each email send to prevent SMTP freezing cron
        const sendPromise = sendDailyAlertEmail(email, name, uniqueAlerts, masterToken);
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("SMTP send timeout (25s exceeded)")), 25000)
        );

        isSuccess = await Promise.race([sendPromise, timeoutPromise]);
        if (!isSuccess) {
          failureError = "Mail server rejected message or transporter error (sendEmail returned false)";
        }
      } catch (err: any) {
        isSuccess = false;
        failureError = err?.message || String(err);
      }

      if (isSuccess) {
        totalEmailsSent++;
        console.log(`✅ Sent alert email to ${email} (${name} - ${role}) for ${uniqueAlerts.length} issues.`);
      } else {
        totalEmailsFailed++;
        const primarySchemeId = uniqueAlerts[0]?.scheme_id || null;
        const primarySchemeName = uniqueAlerts[0]?.scheme_name || null;
        const alertSummary = uniqueAlerts
          .map(a => `${a.scheme_name || a.scheme_id} (${a.village_name || a.esr_name || 'Main'}): ${a.chlorine_issue ? (a.chlorine_type || 'Chlorine') : a.pressure_issue ? 'Pressure' : a.lpcd_issue ? 'LPCD' : 'Offline'}`)
          .slice(0, 5)
          .join('; ');

        failedDeliveries.push({
          email,
          name,
          scheme_id: primarySchemeId,
          scheme_name: primarySchemeName,
          error: failureError || 'Unknown delivery failure',
          count: uniqueAlerts.length,
        });

        console.error(`❌ Failed to send alert email to ${email} (${name}):`, failureError);

        try {
          await db.execute(sql`
            INSERT INTO email_delivery_failures (recipient_email, engineer_name, scheme_id, scheme_name, alert_count, alert_summary, error_message, attempted_at)
            VALUES (${email}, ${name}, ${primarySchemeId}, ${primarySchemeName}, ${uniqueAlerts.length}, ${alertSummary}, ${failureError}, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'))
          `);
        } catch (dbErr) {
          console.error("⚠️ Error saving failure to email_delivery_failures table:", dbErr);
        }
      }

      // Record this consolidated email dispatch into consolidated_email_dispatches table
      try {
        const distinctSchemeIds = Array.from(new Set(uniqueAlerts.map(a => a.scheme_id).filter(Boolean)));
        const distinctSchemeNames = Array.from(new Set(uniqueAlerts.map(a => a.scheme_name || a.scheme_id).filter(Boolean)));
        const lpcdCount = uniqueAlerts.filter(a => a.lpcd_issue).length;
        const clCount = uniqueAlerts.filter(a => a.chlorine_issue).length;
        const prCount = uniqueAlerts.filter(a => a.pressure_issue).length;
        const offCount = uniqueAlerts.filter(a => a.offline_issue).length;

        await db.execute(sql`
          INSERT INTO consolidated_email_dispatches (
            dispatch_date, sent_time, engineer_name, engineer_email, engineer_role,
            total_schemes, scheme_ids, scheme_names, total_alerts,
            lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count, offline_alerts_count,
            master_token, subject, status, error_message
          ) VALUES (
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
            ${istTimeStr},
            ${name},
            ${email},
            ${role || 'DE/AE (Civil)'},
            ${distinctSchemeIds.length || 1},
            ${JSON.stringify(distinctSchemeIds)}::jsonb,
            ${JSON.stringify(distinctSchemeNames)}::jsonb,
            ${uniqueAlerts.length},
            ${lpcdCount},
            ${clCount},
            ${prCount},
            ${offCount},
            ${masterToken},
            '🚨 Critical Water Scheme Alerts - Action Required',
            ${isSuccess ? 'SENT' : 'FAILED'},
            ${failureError || null}
          )
        `);
      } catch (insertErr) {
        console.error("Could not log consolidated email dispatch:", insertErr);
      }

      // Add 1-second delay between outgoing emails to prevent mail server rate-limit blocks
      await new Promise(r => setTimeout(r, 1000));
    }

    // Print clear dispatch audit summary in server console
    console.log(`\n============================================================`);
    console.log(`📊 DAILY ALERTS EMAIL DISPATCH AUDIT`);
    console.log(`   Total Attempted: ${emails.length}`);
    console.log(`   ✅ Successfully Sent: ${totalEmailsSent}`);
    console.log(`   ❌ Failed: ${totalEmailsFailed}`);
    if (failedDeliveries.length > 0) {
      console.log(`\n❌ Failed Emails (Recorded in 'email_delivery_failures' table):`);
      failedDeliveries.forEach((f, idx) => {
        console.log(`   ${idx + 1}. [${f.email}] (${f.name}) - Scheme: ${f.scheme_name || f.scheme_id}`);
        console.log(`      Error: ${f.error}`);
      });
    } else {
      console.log(`   🎉 All alert emails delivered with 100% success.`);
    }
    console.log(`============================================================\n`);

    // Send the consolidated SMS alerts
    const mobiles = Object.keys(smsToSend);
    if (mobiles.length > 0) {
      console.log(`📱 Preparing to send ${mobiles.length} alert SMS messages...`);
      for (const mobile of mobiles) {
        const { name, email, alerts } = smsToSend[mobile];

        const uniqueAlertsMap = new Map();
        alerts.forEach(a => {
          const key = `${a.scheme_id}-${a.village_name}-${a.esr_name}-${a.chlorine_issue}-${a.pressure_issue}-${a.lpcd_issue}-${a.flow_offline}-${a.pressure_offline}-${a.chlorine_offline}`;
          uniqueAlertsMap.set(key, a);
        });
        const uniqueAlerts = Array.from(uniqueAlertsMap.values());

        try {
          await sendDailyAlertSMS(mobile, name, uniqueAlerts, email);
        } catch (err) {
          console.error(`❌ Failed to send alert SMS to ${mobile}:`, err);
        }
      }
    }

    // Persist logs in database
    if (emailLogsToInsert.length > 0) {
      console.log(`💾 Saving ${emailLogsToInsert.length} alert logs to the database...`);
      const batchSize = 100;
      for (let i = 0; i < emailLogsToInsert.length; i += batchSize) {
        const batch = emailLogsToInsert.slice(i, i + batchSize);
        await db.insert(emailAlertLogs).values(batch);
      }
      console.log("✅ Alert logs saved successfully.");
    }

  } catch (error) {
    console.error("❌ Error running daily alerts cron job:", error);
  }
}
