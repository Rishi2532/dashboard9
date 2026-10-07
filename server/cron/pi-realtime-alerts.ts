import cron from "node-cron";
import pg from "pg";
import { getDB } from "../db";
import {
  realtimeSensorData,
  schemeStatuses,
  schemeEngineerDetails,
  emailAlertLogs,
  realtimeAcknowledgements,
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import {
  getAllESRs,
  extractHierarchyFromPath,
  fetchWithRetry,
  PIElement,
} from "../services/pi-web-api-service";
import {
  sendRealtimeConsolidatedAlertEmail,
  generateAcknowledgeToken,
  RealtimeConsolidatedAlertItem,
} from "../services/email-service";
import {
  sendRealtimeSingleAlertSMS,
  normalizeIndianMobile,
} from "../services/sms-service";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface ESRTelemetry {
  webId: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  flowRate: number | null;
  flowRateTimestamp: string | null;
  flowCommStatus: "Online" | "Offline" | null;
  chlorine: number | null;
  chlorineTimestamp: string | null;
  chlorineCommStatus: "Online" | "Offline" | null;
  pressure: number | null;
  pressureTimestamp: string | null;
  pressureCommStatus: "Online" | "Offline" | null;
}

interface RealtimeAlert {
  scheme_id: string;
  scheme_name: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  village_name?: string;
  esr_name?: string;
  alert_key: string;
  sms_alert_type:
    | "flow_offline"
    | "chlorine_offline"
    | "pressure_offline"
    | "chlorine_low"
    | "chlorine_high"
    | "pressure_low";
  alert_type_display: string;
  alert_value: string | number;
  flow_rate?: number | null;
  telemetry_timestamp?: string | null;
}

/**
 * Initializes and starts the 5-minute Real-Time Alert Cron Engine
 */
// Flag to pause real-time alerts (Default: true / STOPPED to prevent SMS and email costs)
export let isRealtimeAlertsStopped = process.env.ENABLE_REALTIME_ALERTS === "true" ? false : true;

export function setRealtimeAlertsStopped(stopped: boolean) {
  isRealtimeAlertsStopped = stopped;
  console.log(`[Real-Time Alerts Engine] Status changed: ${stopped ? "STOPPED ⏸️" : "RUNNING ⚡"}`);
}

export function startPiRealtimeAlertsCron() {
  if (isRealtimeAlertsStopped) {
    console.log(
      "⏸️ [Real-Time Alerts Engine] STOPPED for now as requested. No real-time crons, SMS, or emails will be dispatched."
    );
    return;
  }

  const cronExpression =
    process.env.PI_REALTIME_ALERTS_CRON_SCHEDULE || "*/15 * * * *";
  console.log(
    `⚡ [Real-Time Alerts Engine] Scheduled with 15-min cron pattern: "${cronExpression}" (Asia/Kolkata)`
  );

  // Trigger an initial telemetry run on startup after 10 seconds
  setTimeout(() => {
    console.log("⚡ [Real-Time Alerts Engine] Running initial startup telemetry cycle...");
    runPiRealtimeAlertsJob().catch((err) =>
      console.error("❌ Error in initial real-time cycle:", err)
    );
  }, 10000);

  cron.schedule(
    cronExpression,
    async () => {
      try {
        console.log(
          `⚡ [Real-Time Cron Triggered] Starting live telemetry check at ${new Date().toLocaleString(
            "en-IN",
            { timeZone: "Asia/Kolkata" }
          )} IST`
        );
        await runPiRealtimeAlertsJob();
      } catch (err) {
        console.error("❌ Error executing PI Real-time Alerts Job:", err);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
}

/**
 * Helper to extract numeric value from PI stream value
 */
function extractNumericValue(valObj: any): number | null {
  if (valObj === undefined || valObj === null) return null;
  const raw = typeof valObj === "object" && valObj !== null && "Value" in valObj ? valObj.Value : valObj;
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "object" && raw !== null && raw.IsSystem) return null;
  if (typeof raw === "number" && !isNaN(raw) && isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Helper to extract timestamp from PI stream value
 */
function extractTimestamp(valObj: any): string | null {
  if (valObj === undefined || valObj === null) return null;
  if (typeof valObj === "object" && valObj !== null && valObj.Timestamp) {
    return valObj.Timestamp;
  }
  return null;
}

/**
 * Helper to map communication status attribute
 */
function mapCommStatus(pt: any): "Online" | "Offline" | null {
  if (pt === undefined || pt === null) return null;
  const raw = typeof pt === "object" && pt !== null && "Value" in pt ? pt.Value : pt;
  if (raw === 1 || String(raw) === "1" || raw === 2 || String(raw) === "2") {
    return "Online";
  }
  if (raw === 0 || String(raw) === "0") {
    return "Offline";
  }
  return null;
}

let isRealtimeAlertsRunning = false;

/**
 * Main Real-Time Alert Engine Job
 */
export async function runPiRealtimeAlertsJob(rootPath?: string) {
  if (isRealtimeAlertsStopped) {
    console.log(
      "⏸️ [Real-Time Alerts Engine] Real-time alerts dispatch is currently STOPPED to avoid excess costs. No SMS or emails sent."
    );
    return;
  }
  if (isRealtimeAlertsRunning) {
    console.log("⏳ [Real-Time Alerts Engine] A real-time cycle is already in progress. Skipping overlapping trigger.");
    return;
  }
  isRealtimeAlertsRunning = true;
  const startTime = Date.now();
  console.log("⚡ [Real-Time Alerts Engine] Polling live telemetry streams...");

  try {
    const db = await getDB();

    // 1. Get all ESRs
    const esrs: PIElement[] = await getAllESRs(rootPath);
    if (!esrs || esrs.length === 0) {
      console.warn("⚠️ No ESR elements found in PI AF. Skipping real-time cycle.");
      return;
    }

    // 2. Fetch schemes with assigned engineers for real-time alerts
    const allEngineerDetails = await db.select().from(schemeEngineerDetails);
    const targetSchemeIds = new Set(
      allEngineerDetails.map((r) => String(r.scheme_id || "").trim()).filter(Boolean)
    );
    const targetSchemeNames = new Set(
      allEngineerDetails.map((r) => String(r.scheme || "").trim().toLowerCase()).filter(Boolean)
    );

    // Filter ESRs to target schemes so we ONLY poll live telemetry for schemes where alerts can actually be sent
    const targetEsrs = (targetSchemeIds.size > 0 || targetSchemeNames.size > 0)
      ? esrs.filter((esr) => {
          const hierarchy = extractHierarchyFromPath(esr.Path);
          const sId = hierarchy.scheme_id ? String(hierarchy.scheme_id).trim() : "";
          const sName = hierarchy.scheme_name ? String(hierarchy.scheme_name).trim().toLowerCase() : "";
          return (sId && targetSchemeIds.has(sId)) || (sName && targetSchemeNames.has(sName));
        })
      : esrs;

    console.log(`📡 Polling live telemetry for ${targetEsrs.length} target ESRs (out of ${esrs.length} total ESRs)...`);

    // 3. Fetch active scheme filter (water_supply = 'Yes')
    const validSchemesRes = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
      })
      .from(schemeStatuses)
      .where(eq(schemeStatuses.water_supply, "Yes"));

    const validSchemeIds = new Set(
      validSchemesRes.map((r) => (r.scheme_id ? String(r.scheme_id).trim() : "")).filter(Boolean)
    );
    const validSchemeNames = new Set(
      validSchemesRes.map((r) => (r.scheme_name ? String(r.scheme_name).trim().toLowerCase() : "")).filter(Boolean)
    );

    const isSchemeActive = (schemeId?: string | null, schemeName?: string | null): boolean => {
      const sId = schemeId ? String(schemeId).trim() : "";
      const sName = schemeName ? String(schemeName).trim().toLowerCase() : "";
      if (sId && validSchemeIds.has(sId)) return true;
      if (sName && validSchemeNames.has(sName)) return true;
      return false;
    };

    // 4. Batch fetch live streamsets for target ESRs (BATCH_SIZE = 12)
    const telemetryList: ESRTelemetry[] = [];
    const BATCH_SIZE = 12;

    for (let i = 0; i < targetEsrs.length; i += BATCH_SIZE) {
      const batch = targetEsrs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (esr) => {
          try {
            const hierarchy = extractHierarchyFromPath(esr.Path);
            if (!hierarchy.scheme_id || !hierarchy.esr_name) {
              return;
            }

            const streamsetRes = await fetchWithRetry(`/streamsets/${esr.WebId}/value`);
            const items = streamsetRes?.data?.Items || [];

            let flowRate: number | null = null;
            let flowRateTimestamp: string | null = null;
            let flowCommStatus: "Online" | "Offline" | null = null;

            let chlorine: number | null = null;
            let chlorineTimestamp: string | null = null;
            let chlorineCommStatus: "Online" | "Offline" | null = null;

            let pressure: number | null = null;
            let pressureTimestamp: string | null = null;
            let pressureCommStatus: "Online" | "Offline" | null = null;

            for (const item of items) {
              const name = (item.Name || "").trim();
              const val = item.Value;

              // Flow Rate
              if (name === "Flow Rate") {
                flowRate = extractNumericValue(val);
                flowRateTimestamp = extractTimestamp(val);
              } else if (
                name === "Communication Status - Flow Rate - Realtime" ||
                name === "Communication Status - Flow Rate"
              ) {
                flowCommStatus = mapCommStatus(val) || flowCommStatus;
              } else if (name === "Updating Flow Rate") {
                if (flowCommStatus === null) {
                  flowCommStatus = mapCommStatus(val);
                }
              }

              // Chlorine
              if (name === "Chlorine") {
                chlorine = extractNumericValue(val);
                chlorineTimestamp = extractTimestamp(val);
              } else if (
                name === "Communication Status - Chlorine - Realtime" ||
                name === "Communication Status - Chlorine"
              ) {
                chlorineCommStatus = mapCommStatus(val) || chlorineCommStatus;
              } else if (name === "Updating Chlorine Sensor") {
                if (chlorineCommStatus === null) {
                  chlorineCommStatus = mapCommStatus(val);
                }
              }

              // Pressure
              if (name === "Pressure") {
                pressure = extractNumericValue(val);
                pressureTimestamp = extractTimestamp(val);
              } else if (
                name === "Communication Status - Pressure - Realtime" ||
                name === "Communication Status - Pressure"
              ) {
                pressureCommStatus = mapCommStatus(val) || pressureCommStatus;
              } else if (name === "Updating Pressure Sensor") {
                if (pressureCommStatus === null) {
                  pressureCommStatus = mapCommStatus(val);
                }
              }
            }

            telemetryList.push({
              webId: esr.WebId,
              region: hierarchy.region,
              circle: hierarchy.circle,
              division: hierarchy.division,
              sub_division: hierarchy.sub_division,
              block: hierarchy.block,
              scheme_id: hierarchy.scheme_id,
              scheme_name: hierarchy.scheme_name,
              village_name: hierarchy.village_name,
              esr_name: hierarchy.esr_name,
              flowRate,
              flowRateTimestamp,
              flowCommStatus,
              chlorine,
              chlorineTimestamp,
              chlorineCommStatus,
              pressure,
              pressureTimestamp,
              pressureCommStatus,
            });
          } catch (itemErr: any) {
            // Silently handle single ESR fetch error
          }
        })
      );
    }

    console.log(
      `📊 Fetched telemetry for ${telemetryList.length} ESRs in ${(
        (Date.now() - startTime) /
        1000
      ).toFixed(2)}s. Upserting snapshot into realtime_sensor_data...`
    );

    // 4. In-Place Upsert into realtime_sensor_data (tracking previous chlorine state for delta analysis)
    const client = await pool.connect();
    try {
      for (const t of telemetryList) {
        // Current chlorine status: 'Critical' (<0.2 or >0.5 with flow>0), 'Offline', or 'Good'
        let currentChlorineStatus = 'Good';
        if (t.chlorineCommStatus === 'Offline') {
          currentChlorineStatus = 'Offline';
        } else if (t.flowRate !== null && t.flowRate > 0 && t.chlorine !== null && (t.chlorine < 0.2 || t.chlorine > 0.5)) {
          currentChlorineStatus = 'Critical';
        }

        await client.query(
          `
          INSERT INTO realtime_sensor_data (
            scheme_id, village_name, esr_name,
            chlorine_value, chlorine_timestamp, chlorine_comm_status,
            pressure_value, pressure_timestamp, pressure_comm_status,
            flow_rate_value, flow_rate_timestamp, flow_rate_comm_status,
            prev_chlorine_status, prev_chlorine_value,
            last_updated_values, last_updated_comm
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
          ) ON CONFLICT (scheme_id, village_name, esr_name) DO UPDATE SET
            prev_chlorine_status = CASE 
              WHEN realtime_sensor_data.chlorine_value IS DISTINCT FROM EXCLUDED.chlorine_value THEN
                CASE 
                  WHEN realtime_sensor_data.chlorine_comm_status = 'Offline' THEN 'Offline'
                  WHEN realtime_sensor_data.flow_rate_value > 0 AND (realtime_sensor_data.chlorine_value < 0.2 OR realtime_sensor_data.chlorine_value > 0.5) THEN 'Critical'
                  ELSE 'Good'
                END
              ELSE realtime_sensor_data.prev_chlorine_status
            END,
            prev_chlorine_value = realtime_sensor_data.chlorine_value,
            chlorine_value = EXCLUDED.chlorine_value,
            chlorine_timestamp = EXCLUDED.chlorine_timestamp,
            chlorine_comm_status = EXCLUDED.chlorine_comm_status,
            pressure_value = EXCLUDED.pressure_value,
            pressure_timestamp = EXCLUDED.pressure_timestamp,
            pressure_comm_status = EXCLUDED.pressure_comm_status,
            flow_rate_value = EXCLUDED.flow_rate_value,
            flow_rate_timestamp = EXCLUDED.flow_rate_timestamp,
            flow_rate_comm_status = EXCLUDED.flow_rate_comm_status,
            last_updated_values = NOW(),
            last_updated_comm = NOW()
        `,
          [
            t.scheme_id,
            t.village_name,
            t.esr_name,
            t.chlorine,
            t.chlorineTimestamp,
            t.chlorineCommStatus,
            t.pressure,
            t.pressureTimestamp,
            t.pressureCommStatus,
            t.flowRate,
            t.flowRateTimestamp,
            t.flowCommStatus,
            currentChlorineStatus,
            t.chlorine,
          ]
        );
      }
    } finally {
      client.release();
    }

    // 5. Query alerts that have ALREADY been sent today (to enforce once-per-day cadence for Flow Offline & Pressure)
    const sentAlertsTodayRes = await pool.query(
      `
      SELECT scheme_id, esr_name, alert_type 
      FROM email_alert_logs 
      WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    `
    );

    const sentOnceAlertsSet = new Set<string>();
    sentAlertsTodayRes.rows.forEach((r: any) => {
      const key = `${r.scheme_id || ""}|${r.esr_name || ""}|${r.alert_type || ""}`.toLowerCase();
      sentOnceAlertsSet.add(key);
    });

    // 5b. Query communication_status to ensure real-time alerts are ONLY sent for sensors with 'Connected' status
    const commStatusRes = await pool.query(`
      SELECT scheme_id, village_name, esr_name, 
             chlorine_connected, flow_meter_connected, pressure_connected
      FROM communication_status
    `);
    const commConnectedMap = new Map<string, {
      chlorineConnected: boolean;
      flowConnected: boolean;
      pressureConnected: boolean;
    }>();
    commStatusRes.rows.forEach((r: any) => {
      const key = `${r.scheme_id || ""}|${r.village_name || ""}|${r.esr_name || ""}`.toLowerCase();
      const altKey = `${r.scheme_id || ""}|${r.esr_name || ""}`.toLowerCase();
      const connInfo = {
        chlorineConnected: String(r.chlorine_connected || "").trim().toLowerCase() === 'connected',
        flowConnected: String(r.flow_meter_connected || "").trim().toLowerCase() === 'connected',
        pressureConnected: String(r.pressure_connected || "").trim().toLowerCase() === 'connected',
      };
      commConnectedMap.set(key, connInfo);
      if (!commConnectedMap.has(altKey)) {
        commConnectedMap.set(altKey, connInfo);
      }
    });

    // 6. Evaluate Real-Time Alert Rules & Cadences (Strictly for Connected Sensors)
    const triggeredAlerts: RealtimeAlert[] = [];

    for (const t of telemetryList) {
      if (!isSchemeActive(t.scheme_id, t.scheme_name)) {
        continue; // Skip inactive schemes
      }

      const key = `${t.scheme_id || ""}|${t.village_name || ""}|${t.esr_name || ""}`.toLowerCase();
      const altKey = `${t.scheme_id || ""}|${t.esr_name || ""}`.toLowerCase();
      const commConn = commConnectedMap.get(key) || commConnectedMap.get(altKey);

      // Only alert if the specific sensor is marked Connected in communication_status
      const isChlorineConnected = commConn ? commConn.chlorineConnected : false;
      const isFlowConnected = commConn ? commConn.flowConnected : false;
      const isPressureConnected = commConn ? commConn.pressureConnected : false;

      const isWaterFlowing = t.flowRate !== null && t.flowRate > 0;

      // --- RULE 1: Chlorine Real-Time Alert (Flow-Gated: ONLY when flowRate > 0 AND Chlorine is Connected) ---
      if (isChlorineConnected && isWaterFlowing && t.chlorine !== null) {
        if (t.chlorine < 0.2) {
          triggeredAlerts.push({
            scheme_id: t.scheme_id,
            scheme_name: t.scheme_name,
            region: t.region,
            circle: t.circle,
            division: t.division,
            sub_division: t.sub_division,
            block: t.block,
            village_name: t.village_name,
            esr_name: t.esr_name,
            alert_key: `${t.scheme_id}|${t.village_name}|${t.esr_name}|chlorine_low`,
            sms_alert_type: "chlorine_low",
            alert_type_display: "Low Chlorine",
            alert_value: `${t.chlorine} mg/l`,
            flow_rate: t.flowRate,
            telemetry_timestamp: t.chlorineTimestamp,
          });
        } else if (t.chlorine > 0.5) {
          triggeredAlerts.push({
            scheme_id: t.scheme_id,
            scheme_name: t.scheme_name,
            region: t.region,
            circle: t.circle,
            division: t.division,
            sub_division: t.sub_division,
            block: t.block,
            village_name: t.village_name,
            esr_name: t.esr_name,
            alert_key: `${t.scheme_id}|${t.village_name}|${t.esr_name}|chlorine_high`,
            sms_alert_type: "chlorine_high",
            alert_type_display: "High Chlorine",
            alert_value: `${t.chlorine} mg/l`,
            flow_rate: t.flowRate,
            telemetry_timestamp: t.chlorineTimestamp,
          });
        }
      }

      // --- RULE 2: Chlorine Sensor Real-Time Offline (ONLY when Chlorine is Connected) ---
      if (isChlorineConnected && t.chlorineCommStatus === "Offline") {
        triggeredAlerts.push({
          scheme_id: t.scheme_id,
          scheme_name: t.scheme_name,
          region: t.region,
          circle: t.circle,
          division: t.division,
          sub_division: t.sub_division,
          block: t.block,
          village_name: t.village_name,
          esr_name: t.esr_name,
          alert_key: `${t.scheme_id}|${t.village_name}|${t.esr_name}|chlorine_offline`,
          sms_alert_type: "chlorine_offline",
          alert_type_display: "Chlorine Sensor Offline",
          alert_value: "Offline",
          flow_rate: t.flowRate,
          telemetry_timestamp: t.chlorineTimestamp,
        });
      }

      // --- RULE 3: Flow Meter Real-Time Offline (ONLY when Flow Meter is Connected -> SENT ONCE per day) ---
      if (isFlowConnected && t.flowCommStatus === "Offline") {
        const flowKey = `${t.scheme_id}|${t.esr_name}|Flow Sensor Offline`.toLowerCase();
        const flowGenericKey = `${t.scheme_id}|${t.esr_name}|Offline`.toLowerCase();
        if (!sentOnceAlertsSet.has(flowKey) && !sentOnceAlertsSet.has(flowGenericKey)) {
          triggeredAlerts.push({
            scheme_id: t.scheme_id,
            scheme_name: t.scheme_name,
            region: t.region,
            circle: t.circle,
            division: t.division,
            sub_division: t.sub_division,
            block: t.block,
            village_name: t.village_name,
            esr_name: t.esr_name,
            alert_key: `${t.scheme_id}|${t.village_name}|${t.esr_name}|flow_offline`,
            sms_alert_type: "flow_offline",
            alert_type_display: "Flow Sensor Offline",
            alert_value: "Offline",
            flow_rate: t.flowRate,
            telemetry_timestamp: t.flowRateTimestamp,
          });
          sentOnceAlertsSet.add(flowKey);
        }
      }

      // --- RULE 4: Pressure Real-Time Alert & Offline (ONLY when Pressure is Connected -> SENT ONCE per day) ---
      if (isPressureConnected && t.pressure !== null && t.pressure < 0.2 && t.pressure >= 0) {
        const pressureKey = `${t.scheme_id}|${t.esr_name}|Low Pressure`.toLowerCase();
        if (!sentOnceAlertsSet.has(pressureKey)) {
          triggeredAlerts.push({
            scheme_id: t.scheme_id,
            scheme_name: t.scheme_name,
            region: t.region,
            circle: t.circle,
            division: t.division,
            sub_division: t.sub_division,
            block: t.block,
            village_name: t.village_name,
            esr_name: t.esr_name,
            alert_key: `${t.scheme_id}|${t.village_name}|${t.esr_name}|pressure_low`,
            sms_alert_type: "pressure_low",
            alert_type_display: "Low Pressure",
            alert_value: `${t.pressure} Bar`,
            flow_rate: t.flowRate,
            telemetry_timestamp: t.pressureTimestamp,
          });
          sentOnceAlertsSet.add(pressureKey);
        }
      }

      if (isPressureConnected && t.pressureCommStatus === "Offline") {
        const pressureOfflineKey = `${t.scheme_id}|${t.esr_name}|Pressure Sensor Offline`.toLowerCase();
        const pressureGenericKey = `${t.scheme_id}|${t.esr_name}|Offline`.toLowerCase();
        if (!sentOnceAlertsSet.has(pressureOfflineKey) && !sentOnceAlertsSet.has(pressureGenericKey)) {
          triggeredAlerts.push({
            scheme_id: t.scheme_id,
            scheme_name: t.scheme_name,
            region: t.region,
            circle: t.circle,
            division: t.division,
            sub_division: t.sub_division,
            block: t.block,
            village_name: t.village_name,
            esr_name: t.esr_name,
            alert_key: `${t.scheme_id}|${t.village_name}|${t.esr_name}|pressure_offline`,
            sms_alert_type: "pressure_offline",
            alert_type_display: "Pressure Sensor Offline",
            alert_value: "Offline",
            flow_rate: t.flowRate,
            telemetry_timestamp: t.pressureTimestamp,
          });
          sentOnceAlertsSet.add(pressureOfflineKey);
        }
      }
    }

    if (triggeredAlerts.length === 0) {
      const nextTimeStr = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', second: '2-digit' });
      console.log(
        `✅ [Real-Time Alerts Engine] Cycle completed in ${(
          (Date.now() - startTime) /
          1000
        ).toFixed(2)}s: 0 real-time alerts. Next 15-minute cycle at ${nextTimeStr} IST.`
      );
      return;
    }

    console.log(
      `🚨 [Real-Time Alerts Engine] Detected ${triggeredAlerts.length} real-time alert events. Consolidating per engineer...`
    );

    // 7. Group alerts by Engineer Email for Consolidated Dispatch (reusing allEngineerDetails)

    const alertsBySchemeId: Record<string, RealtimeAlert[]> = {};
    const alertsBySchemeName: Record<string, RealtimeAlert[]> = {};

    triggeredAlerts.forEach((alert) => {
      const sId = alert.scheme_id ? String(alert.scheme_id).trim() : "";
      const sName = alert.scheme_name ? String(alert.scheme_name).trim().toLowerCase() : "";
      if (sId) {
        if (!alertsBySchemeId[sId]) alertsBySchemeId[sId] = [];
        alertsBySchemeId[sId].push(alert);
      }
      if (sName) {
        if (!alertsBySchemeName[sName]) alertsBySchemeName[sName] = [];
        alertsBySchemeName[sName].push(alert);
      }
    });

    const sanitizeMobiles = (raw: string | null | undefined): string[] => {
      if (!raw) return [];
      return raw
        .split(/[,;\/]+/)
        .map((m) => m.trim().replace(/^['"]+|['"]+$/g, "").replace(/\D/g, ""))
        .filter((m) => m.length >= 10);
    };

    const sanitizeEmails = (raw: string | null | undefined): string[] => {
      if (!raw) return [];
      return raw
        .split(/[,;\/]+/)
        .map((e) => e.trim().replace(/^['"]+|['"]+$/g, "").trim().toLowerCase())
        .filter((e) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e));
    };

    // Engineer email group: email -> { name, mobiles, alerts }
    const engineerGroups: Record<
      string,
      {
        name: string;
        mobiles: Set<string>;
        alerts: RealtimeAlert[];
        engineerObj: any;
      }
    > = {};

    for (const engineer of allEngineerDetails) {
      const engSchemeId = engineer.scheme_id ? String(engineer.scheme_id).trim() : "";
      const engSchemeName = engineer.scheme ? String(engineer.scheme).trim().toLowerCase() : "";

      let matchedAlerts: RealtimeAlert[] = [];
      if (engSchemeId && alertsBySchemeId[engSchemeId]) {
        matchedAlerts = matchedAlerts.concat(alertsBySchemeId[engSchemeId]);
      }
      if (engSchemeName && alertsBySchemeName[engSchemeName]) {
        matchedAlerts = matchedAlerts.concat(alertsBySchemeName[engSchemeName]);
      }

      if (matchedAlerts.length === 0) continue;

      // Extract emails and mobiles ONLY for DE and AE roles on this scheme (strictly excluding EE, SE, and CE for real-time alerts)
      const roles: Array<{ name?: string | null; email?: string | null; mobile?: string | null }> = [
        { name: engineer.de_ae_civil_name, email: engineer.de_ae_civil_email, mobile: engineer.de_ae_civil_mobile },
        { name: engineer.de_ae_mech_name, email: engineer.de_ae_mech_email, mobile: engineer.de_ae_mech_mobile },
      ];

      for (const r of roles) {
        const emails = sanitizeEmails(r.email);
        const mobs = sanitizeMobiles(r.mobile);
        const name = r.name?.trim() || "Assigned Engineer";

        for (const em of emails) {
          if (!engineerGroups[em]) {
            engineerGroups[em] = {
              name,
              mobiles: new Set<string>(),
              alerts: [],
              engineerObj: engineer,
            };
          }
          mobs.forEach((m) => engineerGroups[em].mobiles.add(m));
          engineerGroups[em].alerts = engineerGroups[em].alerts.concat(matchedAlerts);
        }
      }
    }

    // 8. Send Consolidated Email & SMS per Engineer
    const dbClient = await pool.connect();
    try {
      for (const [toEmail, group] of Object.entries(engineerGroups)) {
        // Deduplicate alerts for this engineer
        const uniqueAlertsMap = new Map<string, RealtimeAlert>();
        group.alerts.forEach((a) => uniqueAlertsMap.set(a.alert_key, a));
        const finalAlerts = Array.from(uniqueAlertsMap.values());

        if (finalAlerts.length === 0) continue;

        // Generate a single cryptographic acknowledgment token for this consolidated real-time email
        const acknowledgeToken = generateAcknowledgeToken();

        const emailAlertItems: RealtimeConsolidatedAlertItem[] = [];

        // Insert records into realtime_acknowledgements & email_alert_logs
        for (const alert of finalAlerts) {
          const ticketId = `TKT-RT-${Date.now().toString().slice(-4)}${Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase()}`;

          emailAlertItems.push({
            scheme_id: alert.scheme_id,
            scheme_name: alert.scheme_name,
            region: alert.region,
            village_name: alert.village_name,
            esr_name: alert.esr_name,
            alert_type: alert.alert_type_display,
            alert_value: alert.alert_value,
            flow_rate: alert.flow_rate,
            telemetry_timestamp: alert.telemetry_timestamp,
            ticket_id: ticketId,
          });

          // Insert into realtime_acknowledgements
          try {
            await dbClient.query(
              `
              INSERT INTO realtime_acknowledgements (
                token, scheme_id, scheme_name, village_name, esr_name,
                alert_type, alert_value, ticket_id, engineer_name, engineer_email,
                sent_date, is_acknowledged, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, FALSE, NOW())
            `,
              [
                acknowledgeToken,
                alert.scheme_id,
                alert.scheme_name,
                alert.village_name || null,
                alert.esr_name || null,
                alert.alert_type_display,
                String(alert.alert_value),
                ticketId,
                group.name,
                toEmail,
              ]
            );
          } catch (ackErr: any) {
            console.warn("Could not insert realtime_acknowledgement row:", ackErr.message);
          }

          // Insert into email_alert_logs
          const now = new Date();
          const istTime = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
          const telemetryDateStr = alert.telemetry_timestamp
            ? new Date(alert.telemetry_timestamp).toISOString()
            : new Date().toISOString();

          try {
            await db.insert(emailAlertLogs).values({
              scheme_id: alert.scheme_id,
              scheme_name: alert.scheme_name,
              region: alert.region || group.engineerObj?.region || null,
              village_name: alert.village_name || null,
              esr_name: alert.esr_name || null,
              alert_type: alert.alert_type_display.includes("Offline") ? "Offline" : alert.alert_type_display,
              alert_value: String(alert.alert_value),
              ee_civil_name: group.engineerObj?.ee_civil_name || null,
              ee_civil_email: group.engineerObj?.ee_civil_email || null,
              ee_mech_name: group.engineerObj?.ee_mech_name || null,
              ee_mech_email: group.engineerObj?.ee_mech_email || null,
              civil_engineer_name: group.engineerObj?.de_ae_civil_name || null,
              civil_engineer_email: group.engineerObj?.de_ae_civil_email || null,
              de_ae_civil_name: group.engineerObj?.de_ae_civil_name || null,
              de_ae_civil_email: group.engineerObj?.de_ae_civil_email || null,
              mechanical_engineer_name: group.engineerObj?.de_ae_mech_name || null,
              mechanical_engineer_email: group.engineerObj?.de_ae_mech_email || null,
              site_supervisor_name: group.engineerObj?.de_ae_mech_name || null,
              site_supervisor_email: group.engineerObj?.de_ae_mech_email || null,
              de_ae_mech_name: group.engineerObj?.de_ae_mech_name || null,
              de_ae_mech_email: group.engineerObj?.de_ae_mech_email || null,
              se_name: group.engineerObj?.se_name || null,
              se_email: group.engineerObj?.se_email || null,
              chief_engineer_name: group.engineerObj?.chief_engineer_name || null,
              chief_engineer_email: group.engineerObj?.chief_engineer_email || null,
              ticket_id: ticketId,
              sent_date: new Date().toISOString().split("T")[0] as any,
              sent_time: istTime,
              dispatch_type: 'realtime',
              telemetry_date: telemetryDateStr,
            });
          } catch (logErr: any) {
            console.warn("Could not insert realtime log into email_alert_logs:", logErr.message);
          }

          // Dispatch Smartping SMS for each unique alert
          for (const rawMob of Array.from(group.mobiles)) {
            const cleanMob = normalizeIndianMobile(rawMob);
            if (cleanMob) {
              try {
                await sendRealtimeSingleAlertSMS({
                  mobile: cleanMob,
                  engineerName: group.name,
                  engineerEmail: toEmail,
                  scheme_id: alert.scheme_id,
                  scheme_name: alert.scheme_name,
                  village_name: alert.village_name,
                  esr_name: alert.esr_name,
                  alert_type: alert.sms_alert_type,
                  alert_value: alert.alert_value,
                  offline_time: alert.telemetry_timestamp,
                  telemetry_date: telemetryDateStr,
                });
              } catch (smsErr) {
                console.warn(`Could not dispatch SMS to ${cleanMob}:`, smsErr);
              }
            }
          }
        }

        // Send ONE Consolidated Email to this engineer
        try {
          await sendRealtimeConsolidatedAlertEmail({
            toEmail,
            engineerName: group.name,
            alerts: emailAlertItems,
            acknowledgeToken,
          });
          console.log(
            `📧 [Real-Time Consolidated Email Sent] Dispatched ${emailAlertItems.length} alerts to ${group.name} (${toEmail})`
          );
        } catch (emailErr) {
          console.warn(`Could not dispatch consolidated email to ${toEmail}:`, emailErr);
        }
      }
    } finally {
      dbClient.release();
    }

    const nextTimeStr = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', second: '2-digit' });
    console.log(
      `⚡ [Real-Time Alerts Engine] Cycle completed in ${(
        (Date.now() - startTime) /
        1000
      ).toFixed(2)}s. Dispatched consolidated alerts to ${
        Object.keys(engineerGroups).length
      } engineers. Next 15-minute cycle at ${nextTimeStr} IST.`
    );
  } catch (err: any) {
    console.error("❌ Fatal error in runPiRealtimeAlertsJob:", err);
  } finally {
    isRealtimeAlertsRunning = false;
  }
}
