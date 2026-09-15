import cron from "node-cron";
import { getDB } from "../db";
import pg from 'pg';
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

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
  ticket_id?: string;
  token?: string;
}

export function startDailyAlertsCron() {
  // Run every day at 11:13 AM
  // You can adjust the cron expression as needed: '13 11 * * *'
  cron.schedule("44 10   * * *", async () => {
    await runDailyAlertsJob();
    console.log("? Running automatic offline emails to vendors...");
    await sendAutomaticOfflineEmails();
  });
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
      const isValidId = schemeId && validSchemeIds.has(schemeId);
      const isValidName = schemeName && validSchemeNames.has(schemeName);

      if (!isValidId && !isValidName) {
        return; // Skip schemes that do not have water_supply = 'Yes'
      }

      if (schemeId) {
        if (!allAlertsBySchemeId[schemeId]) allAlertsBySchemeId[schemeId] = [];
        allAlertsBySchemeId[schemeId].push(alert);
      }
      if (schemeName) {
        if (!allAlertsBySchemeName[schemeName]) allAlertsBySchemeName[schemeName] = [];
        allAlertsBySchemeName[schemeName].push(alert);
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
        });
      }
    });

    // 3. Check Water Scheme Data (Keep ONLY LPCD < 55; water value 0 removed as lpcd 0 is included)
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
        });
      }
    });

    // 4. Check Offline Sensors Data (communication_status)
    try {
      const offlineRowsRes = await pool.query(`
        SELECT 
          scheme_id,
          scheme_name,
          region,
          village_name,
          esr_name,
          chlorine_status,
          pressure_status,
          flow_meter_status
        FROM communication_status
        WHERE chlorine_status = 'Offline' 
           OR pressure_status = 'Offline' 
           OR flow_meter_status = 'Offline'
      `);

      offlineRowsRes.rows.forEach((row: any) => {
        const offlineSensorsList: string[] = [];
        if (row.chlorine_status === 'Offline') offlineSensorsList.push('Chlorine');
        if (row.pressure_status === 'Offline') offlineSensorsList.push('Pressure');
        if (row.flow_meter_status === 'Offline') offlineSensorsList.push('Flow Meter');

        addAlert(row.scheme_id, row.scheme_name, {
          scheme_id: row.scheme_id || "N/A",
          scheme_name: row.scheme_name || "N/A",
          village_name: row.village_name || "N/A",
          esr_name: row.esr_name || "N/A",
          offline_issue: true,
          offline_sensors: offlineSensorsList.join(', '),
        });
      });
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

    // We'll query all engineer details and filter locally to avoid complex OR clauses if lists are huge
    const allEngineerDetails = await db.select().from(schemeEngineerDetails);

    // We will batch insert into emailAlertLogs at the end
    const emailLogsToInsert: any[] = [];

    // Group alerts by Engineer Email
    const emailsToSend: Record<string, { name: string; alerts: Alert[] }> = {};

    // Group alerts by Engineer Mobile
    const smsToSend: Record<string, { name: string; alerts: Alert[] }> = {};

    allEngineerDetails.forEach((engineer) => {
      let schemeAlerts: Alert[] = [];

      // Match by scheme_id or scheme_name
      if (engineer.scheme_id && allAlertsBySchemeId[engineer.scheme_id]) {
        schemeAlerts = schemeAlerts.concat(allAlertsBySchemeId[engineer.scheme_id]);
      } else if (engineer.scheme && allAlertsBySchemeName[engineer.scheme]) {
        schemeAlerts = schemeAlerts.concat(allAlertsBySchemeName[engineer.scheme]);
      }

      if (schemeAlerts.length > 0) {
        const sanitizeEmail = (email: string | null | undefined): string | null => {
          if (!email) return null;
          const cleaned = email.trim().replace(/^['"]+|['"]+$/g, '').trim().toLowerCase();
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          return emailRegex.test(cleaned) ? cleaned : null;
        };

        // Civil Engineer
        const civEmail = sanitizeEmail(engineer.civil_engineer_email);
        if (civEmail) {
          if (!emailsToSend[civEmail]) {
            emailsToSend[civEmail] = {
              name: engineer.civil_engineer_name || "Civil Engineer",
              alerts: [],
            };
          }
          emailsToSend[civEmail].alerts.push(...schemeAlerts);
        }

        // Mechanical Engineer
        const mechEmail = sanitizeEmail(engineer.mechanical_engineer_email);
        if (mechEmail) {
          if (!emailsToSend[mechEmail]) {
            emailsToSend[mechEmail] = {
              name: engineer.mechanical_engineer_name || "Mechanical Engineer",
              alerts: [],
            };
          }
          emailsToSend[mechEmail].alerts.push(...schemeAlerts);
        }

        // Site Supervisor
        const siteEmail = sanitizeEmail(engineer.site_supervisor_email);
        if (siteEmail) {
          if (!emailsToSend[siteEmail]) {
            emailsToSend[siteEmail] = {
              name: engineer.site_supervisor_name || "Site Supervisor",
              alerts: [],
            };
          }
          emailsToSend[siteEmail].alerts.push(...schemeAlerts);
        }

        // --- SMS Grouping ---
        // Civil Engineer Mobile
        if (engineer.civil_engineer_mobile && engineer.civil_engineer_mobile.length >= 10) {
          if (!smsToSend[engineer.civil_engineer_mobile]) {
            smsToSend[engineer.civil_engineer_mobile] = {
              name: engineer.civil_engineer_name || "Civil Engineer",
              alerts: [],
            };
          }
          smsToSend[engineer.civil_engineer_mobile].alerts.push(...schemeAlerts);
        }

        // Mechanical Engineer Mobile
        if (engineer.mechanical_engineer_mobile && engineer.mechanical_engineer_mobile.length >= 10) {
          if (!smsToSend[engineer.mechanical_engineer_mobile]) {
            smsToSend[engineer.mechanical_engineer_mobile] = {
              name: engineer.mechanical_engineer_name || "Mechanical Engineer",
              alerts: [],
            };
          }
          smsToSend[engineer.mechanical_engineer_mobile].alerts.push(...schemeAlerts);
        }

        // Site Supervisor Mobile
        if (engineer.site_supervisor_mobile && engineer.site_supervisor_mobile.length >= 10) {
          if (!smsToSend[engineer.site_supervisor_mobile]) {
            smsToSend[engineer.site_supervisor_mobile] = {
              name: engineer.site_supervisor_name || "Site Supervisor",
              alerts: [],
            };
          }
          smsToSend[engineer.site_supervisor_mobile].alerts.push(...schemeAlerts);
        }

        // Build emailAlertLogs entries for each issue in this scheme
        schemeAlerts.forEach((alert) => {
          const baseLog = {
            scheme_id: alert.scheme_id,
            scheme_name: alert.scheme_name,
            region: engineer.region || null,
            village_name: alert.village_name || null,
            esr_name: alert.esr_name || null,
            civil_engineer_name: engineer.civil_engineer_name || null,
            civil_engineer_email: engineer.civil_engineer_email || null,
            mechanical_engineer_name: engineer.mechanical_engineer_name || null,
            mechanical_engineer_email: engineer.mechanical_engineer_email || null,
            site_supervisor_name: engineer.site_supervisor_name || null,
            site_supervisor_email: engineer.site_supervisor_email || null,
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

    // First: ensure email_acknowledgements table exists (with correct schema)
    const dbClient = await pool.connect();
    try {
      await dbClient.query(`
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
            sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
            acknowledged_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON email_acknowledgements(token);
          CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON email_acknowledgements(scheme_id, alert_type, sent_date);
        `);
    } catch (e) {
      // Table may already exist with old schema — that's OK, we'll work with what we have
    } finally {
      dbClient.release();
    }

    // Send the consolidated emails
    const emails = Object.keys(emailsToSend);
    console.log(`📧 Preparing to send ${emails.length} alert emails...`);

    for (const email of emails) {
      const { name, alerts } = emailsToSend[email];
      // Deduplicate alerts for this person just in case
      const uniqueAlertsMap = new Map();
      alerts.forEach(a => {
        const key = `${a.scheme_id}-${a.village_name}-${a.esr_name}-${a.chlorine_issue}-${a.chlorine_type}-${a.pressure_issue}-${a.lpcd_issue}-${a.offline_issue}-${a.offline_sensors}`;
        uniqueAlertsMap.set(key, a);
      });
      const uniqueAlerts: Alert[] = Array.from(uniqueAlertsMap.values());

      // Master token for "Acknowledge All" button
      const masterToken = generateAcknowledgeToken();
      const tokenClient = await pool.connect();
      try {
        for (const alert of uniqueAlerts) {
          const alertType = alert.offline_issue
            ? 'Offline'
            : alert.chlorine_issue
              ? (alert.chlorine_type || (parseFloat(String(alert.chlorine_value || "0").replace(/[^0-9.]/g, '')) > 0.5 ? 'High Chlorine' : 'Low Chlorine'))
              : alert.pressure_issue
                ? 'Low Pressure'
                : 'Low LPCD';

          // Individual token for separate per-alert acknowledgement button
          const itemToken = generateAcknowledgeToken();
          alert.token = itemToken;

          // 1. Insert per-alert token
          await tokenClient.query(
            `INSERT INTO email_acknowledgements (token, scheme_id, alert_type, esr_name, engineer_email, engineer_name, sent_date)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
            [itemToken, alert.scheme_id, alertType, alert.esr_name || null, email, name]
          );

          // 2. Insert master token for bulk action
          await tokenClient.query(
            `INSERT INTO email_acknowledgements (token, scheme_id, alert_type, esr_name, engineer_email, engineer_name, sent_date)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
            [masterToken, alert.scheme_id, alertType, alert.esr_name || null, email, name]
          );
        }
      } finally {
        tokenClient.release();
      }

      try {
        // Pass uniqueAlerts with alert.token attached and masterToken for Acknowledge All
        await sendDailyAlertEmail(email, name, uniqueAlerts, masterToken);
        console.log(`✅ Sent alert email to ${email} for ${uniqueAlerts.length} issues.`);
      } catch (err) {
        console.error(`❌ Failed to send alert email to ${email}:`, err);
      }

      // Add 1-second delay between outgoing emails to prevent mail server rate-limit blocks
      await new Promise(r => setTimeout(r, 1000));
    }

    // Send the consolidated SMS alerts
    const mobiles = Object.keys(smsToSend);
    if (mobiles.length > 0) {
      console.log(`📱 Preparing to send ${mobiles.length} alert SMS messages...`);
      for (const mobile of mobiles) {
        const { name, alerts } = smsToSend[mobile];

        // Deduplicate alerts
        const uniqueAlertsMap = new Map();
        alerts.forEach(a => {
          const key = `${a.scheme_id}-${a.village_name}-${a.esr_name}-${a.chlorine_issue}-${a.pressure_issue}-${a.lpcd_issue}`;
          uniqueAlertsMap.set(key, a);
        });
        const uniqueAlerts = Array.from(uniqueAlertsMap.values());

        try {
          await sendDailyAlertSMS(mobile, name, uniqueAlerts);
        } catch (err) {
          console.error(`❌ Failed to send alert SMS to ${mobile}:`, err);
        }
      }
    }

    // Persist logs in database
    if (emailLogsToInsert.length > 0) {
      console.log(`💾 Saving ${emailLogsToInsert.length} alert logs to the database...`);
      // We do batch inserts to prevent inserting thousands of rows in one query block
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
