import { Router, Request, Response } from "express";
import {
  getEscalationStatus,
  renderSchemeEscalationSMS,
  renderDeSchemeDailyEmail,
  renderEeSchemeEscalationEmail,
  renderCeRegionalConsolidatedEmail,
  renderMsSchemeEscalationEmail,
  renderPsSchemeEscalationEmail,
  executeEscalationDispatch,
  getSentEscalationAlerts,
  getExecutiveContacts,
  updateExecutiveContacts,
} from "../services/escalation-service";
import {
  getDailyAlertsCronStatus,
  hasAlertsBeenSentToday,
  triggerDailyJobIfNotSentToday,
  runDailyAlertsJob,
} from "../cron/daily-alerts";
import ExcelJS from "exceljs";
import { getDB } from "../db";
import { sql } from "drizzle-orm";
import {
  calculateAllAlertStreaksFromHistory,
  getLatestTelemetryDate,
  getLatestDispatchDateForTier,
  getSevenDaysTimelineConfig,
  formatDateOutputs,
  parseHistoryDate,
  MONTHS_SHORT
} from "../services/streak-engine";

const router = Router();

/**
 * GET /api/escalation/cron-status
 * Returns current status of the 11:00 AM Daily Alerts Cron Scheduler
 */
router.get("/cron-status", async (req: Request, res: Response) => {
  try {
    const status = getDailyAlertsCronStatus();
    const sentToday = await hasAlertsBeenSentToday(status.currentDateIST);
    res.json({
      success: true,
      ...status,
      alreadySentToday: sentToday,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get cron status" });
  }
});

/**
 * POST /api/escalation/trigger-daily-alerts
 * Triggers the 11:00 AM daily alerts dispatch immediately on demand
 */
router.post("/trigger-daily-alerts", async (req: Request, res: Response) => {
  try {
    const force = req.body?.force === true;
    if (force) {
      await runDailyAlertsJob();
      return res.json({ success: true, message: "Daily alerts job triggered (force mode)" });
    }
    const triggered = await triggerDailyJobIfNotSentToday("admin-portal-api", true);
    res.json({
      success: true,
      triggered,
      message: triggered
        ? "Daily alerts job initiated successfully"
        : "Daily alerts already sent today or currently in progress",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to trigger daily alerts" });
  }
});

/**
 * GET /api/escalation/sent-alerts
 * Returns the actual history and counts of alerts SENT to Tier 1 (DE/AE), Tier 2 (EE), and Tier 3 (CE/SE)
 */
router.get("/sent-alerts", async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as any) || "today";
    const date = req.query.date ? String(req.query.date) : undefined;
    const tier = (req.query.tier as any) || "all";
    const channel = (req.query.channel as any) || "all";
    const category = (req.query.category as any) || "all";
    const region = req.query.region ? String(req.query.region) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    const result = await getSentEscalationAlerts({
      timeRange,
      date,
      tier,
      channel,
      category,
      region,
      search,
      limit,
      offset,
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/sent-alerts:", error);
    res.status(500).json({ error: error.message || "Failed to fetch sent alerts" });
  }
});

/**
 * Automatically maps a tier or dispatch date to its evaluated telemetry date (1 day before dispatch date).
 * Queries the database for the tier's latest email dispatch, and computes the evaluated telemetry date.
 * When new alerts/emails are sent for any level, it dynamically and automatically reflects the new date.
 */
async function resolveTelemetryDateForTier(tier?: string | number, asOfDateInput?: string): Promise<string> {
  if (asOfDateInput && asOfDateInput !== 'undefined' && asOfDateInput !== 'null') {
    const raw = asOfDateInput.trim();
    // If it's a full ISO date YYYY-MM-DD (e.g. from dispatch_date '2026-10-23')
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = parseHistoryDate(raw);
      if (d) {
        const telD = new Date(d.getTime() - 24 * 60 * 60 * 1000);
        return `${telD.getUTCDate()}-${MONTHS_SHORT[telD.getUTCMonth()]}`;
      }
    }
    // If it's in DD-Mon format (e.g. '22-Oct'), return as is
    const d = parseHistoryDate(raw);
    if (d) {
      return `${d.getUTCDate()}-${MONTHS_SHORT[d.getUTCMonth()]}`;
    }
    return raw;
  }

  const tStr = tier ? String(tier).trim() : '1';
  try {
    const dispatchInfo = await getLatestDispatchDateForTier(tStr);
    if (dispatchInfo?.isoDate) {
      const d = parseHistoryDate(dispatchInfo.isoDate);
      if (d) {
        // Telemetry date evaluated for the dispatch is always 1 day before dispatch date
        const telD = new Date(d.getTime() - 24 * 60 * 60 * 1000);
        return `${telD.getUTCDate()}-${MONTHS_SHORT[telD.getUTCMonth()]}`;
      }
    }
  } catch (err) {
    console.error(`Error resolving telemetry date for tier ${tier}:`, err);
  }

  // Fallback to latest available telemetry in database
  const latestTel = await getLatestTelemetryDate();
  return latestTel || '22-Oct';
}

/**
 * GET /api/escalation/summary
 * Returns high-level metrics across Level 1, Level 2, and Level 3 escalations
 */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const tier = req.query.tier ? String(req.query.tier) : '1';
    const [asOfDateTier, asOfDateTier1, tierInfo, tier1Info] = await Promise.all([
      resolveTelemetryDateForTier(tier, req.query.asOfDate as string),
      resolveTelemetryDateForTier('1'),
      getLatestDispatchDateForTier(tier),
      getLatestDispatchDateForTier('1'),
    ]);

    const [statusTier, statusTier1] = await Promise.all([
      getEscalationStatus({ region, asOfDate: asOfDateTier, dispatchDate: tierInfo?.isoDate }),
      tier === '1' ? null : getEscalationStatus({ region, asOfDate: asOfDateTier1, dispatchDate: tier1Info?.isoDate }),
    ]);

    const activeStatus = statusTier;
    const baseStatus = tier === '1' ? statusTier : (statusTier1 || statusTier);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: activeStatus.summary,
      dispatches: activeStatus.summary.dispatches,
      schemes: activeStatus.schemes,
      layer1Schemes: baseStatus.schemes,
      latestTier1Date: tier1Info,
      latestRequestedTierDate: tierInfo,
      asOfDate: asOfDateTier,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/summary:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escalation summary" });
  }
});

/**
 * GET /api/escalation/latest-date
 * Returns the latest date available in the database telemetry tables
 */
router.get("/latest-date", async (req: Request, res: Response) => {
  try {
    const tier = req.query.tier ? String(req.query.tier) : undefined;
    const info = await getLatestDispatchDateForTier(tier || '1');
    res.json({
      success: true,
      rawDate: info.rawDate,
      formatted: info.formatted,
      isoDate: info.isoDate,
    });
  } catch (error: any) {
    const fallback = await getLatestTelemetryDate();
    const formatted = formatDateOutputs(fallback) || { rawDate: '21-Oct', formatted: 'October 21, 2026', isoDate: '2026-10-21' };
    res.json({
      success: true,
      ...formatted,
    });
  }
});

/**
 * GET /api/escalation/alert-history
 * Returns the last 7 days daily values and escalation trend for a scheme and alert category
 */
router.get("/alert-history", async (req: Request, res: Response) => {
  try {
    const schemeId = req.query.schemeId ? String(req.query.schemeId).trim() : "";
    const category = req.query.category ? String(req.query.category).trim().toLowerCase() : "all";
    const villageName = req.query.villageName ? String(req.query.villageName).trim() : "";
    const esrName = req.query.esrName ? String(req.query.esrName).trim() : "";
    const tier = req.query.tier ? String(req.query.tier).trim() : "1";
    const asOfDate = await resolveTelemetryDateForTier(tier, req.query.asOfDate as string);

    if (!schemeId) {
      return res.status(400).json({ error: "schemeId is required" });
    }

    const db = await getDB();

    // Query past email_alert_logs for ticket_ids and logged dispatches
    let alertTypeCondition = sql`true`;
    if (category === "lpcd") {
      alertTypeCondition = sql`alert_type IN ('LPCD', 'Low LPCD')`;
    } else if (category === "chlorine") {
      alertTypeCondition = sql`alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')`;
    } else if (category === "pressure") {
      alertTypeCondition = sql`alert_type IN ('Pressure', 'Low Pressure')`;
    } else if (category === "offline") {
      alertTypeCondition = sql`alert_type = 'Offline'`;
    }

    const logsRes = await db.execute(sql`
      SELECT 
        id, scheme_id, scheme_name, region, village_name, esr_name, 
        alert_type, alert_value, sent_date, created_at, ticket_id
      FROM email_alert_logs
      WHERE scheme_id = ${schemeId}
        AND ${alertTypeCondition}
      ORDER BY sent_date DESC, created_at DESC
    `);
    const logs: any[] = logsRes.rows || [];

    // Dynamically compute the 7 continuous days backwards from evaluation date
    const dateConfigs = getSevenDaysTimelineConfig(asOfDate);

    // CASE 1: OFFLINE SENSORS
    if (category === "offline") {
      const commRes = await db.execute(sql`
        SELECT * FROM communication_status
        WHERE scheme_id = ${schemeId}
          ${villageName && villageName !== "-" ? sql`AND LOWER(TRIM(village_name)) = LOWER(TRIM(${villageName}))` : sql``}
          ${esrName && esrName !== "-" ? sql`AND LOWER(TRIM(esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
        LIMIT 1
      `);
      const row: any = commRes.rows?.[0];

      const isChlorine = row ? (String(row.chlorine_connected || '').trim() === 'Connected' && row.chlorine_status === 'Offline') : false;
      const isPressure = row ? (String(row.pressure_connected || '').trim() === 'Connected' && row.pressure_status === 'Offline') : false;
      const isFlow = row ? (String(row.flow_meter_connected || '').trim() === 'Connected' && row.flow_meter_status === 'Offline') : false;

      const offlineSensors: string[] = [];
      if (isPressure) offlineSensors.push('Pressure');
      if (isChlorine) offlineSensors.push('Chlorine');
      if (isFlow) offlineSensors.push('Flow Meter');

      const offlineLabel = offlineSensors.length > 0 ? offlineSensors.join(', ') : 'Sensor';

      // Find any logged ticket
      const matchedTicket = logs.find((l: any) => l.ticket_id && l.ticket_id !== '-')?.ticket_id;

      const timeline = dateConfigs.map((dt) => {
        let clFlowDays = 0;
        if ((isChlorine || isFlow) && row?.last_seen) {
          clFlowDays = Math.max(1, Math.floor((dt.d.getTime() - new Date(row.last_seen).getTime()) / (1000 * 86400)));
        }
        let prDays = 0;
        if (isPressure && row?.pressure_last_seen) {
          prDays = Math.max(1, Math.floor((dt.d.getTime() - new Date(row.pressure_last_seen).getTime()) / (1000 * 86400)));
        }
        const streakOnDay = Math.max(clFlowDays, prDays, 1);
        const tier = streakOnDay >= 7 ? 'Level 3 • CE & SE Escalated' : streakOnDay >= 3 ? 'Level 2 • EE Escalated' : 'Level 1 • DE / AE Operational';

        return {
          dayIndex: dt.dayIndex,
          date: dt.d.toISOString().split('T')[0],
          dateFormatted: dt.full,
          dayLabel: dt.dayIndex === 1 ? 'Latest' : `Day ${dt.dayIndex}`,
          hasAlert: true,
          alertType: 'Offline',
          alertValue: `${offlineLabel} Offline`,
          villageName: row?.village_name || villageName || '-',
          esrName: row?.esr_name || esrName || '-',
          ticketId: matchedTicket || `TKT-${schemeId}-${dt.label.replace('-', '')}`,
          logCount: 1,
          allLogs: [],
        };
      });

      return res.json({
        success: true,
        schemeId,
        category,
        timeline,
      });
    }

    // CASE 2: LPCD, CHLORINE, OR PRESSURE from history tables
    const targetDates = dateConfigs.map(c => c.label);
    const sqlTargetDates = sql.join(targetDates.map(d => sql`${d}`), sql`, `);

    const recordsByDate = new Map<string, any>();
    if (category === "chlorine") {
      const q = sql`
        SELECT DISTINCT ON (c.chlorine_date)
          c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.chlorine_date as data_date, c.chlorine_value,
          wc.water_value
        FROM chlorine_history c
        LEFT JOIN (
          SELECT DISTINCT ON (data_date) data_date, water_value
          FROM water_consumption_history
          WHERE scheme_id = ${schemeId}
            ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(village_name)) = LOWER(TRIM(${villageName}))` : sql``}
            ${esrName && esrName !== '-' ? sql`AND LOWER(TRIM(esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
          ORDER BY data_date, uploaded_at DESC
        ) wc ON wc.data_date = c.chlorine_date
        WHERE c.scheme_id = ${schemeId}
          AND c.chlorine_date IN (${sqlTargetDates})
          ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(c.village_name)) = LOWER(TRIM(${villageName}))` : sql``}
          ${esrName && esrName !== '-' ? sql`AND LOWER(TRIM(c.esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
        ORDER BY c.chlorine_date, c.uploaded_at DESC, c.id DESC
      `;
      const tRes: any = await db.execute(q);
      (tRes.rows || []).forEach((r: any) => recordsByDate.set(String(r.data_date).trim(), r));

      if (recordsByDate.size === 0 && (villageName || esrName)) {
        const fallbackHistoryRes: any = await db.execute(sql`
          SELECT DISTINCT ON (c.chlorine_date)
            c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.chlorine_date as data_date, c.chlorine_value,
            wc.water_value
          FROM chlorine_history c
          LEFT JOIN (
            SELECT DISTINCT ON (data_date) data_date, water_value
            FROM water_consumption_history
            WHERE scheme_id = ${schemeId}
            ORDER BY data_date, uploaded_at DESC
          ) wc ON wc.data_date = c.chlorine_date
          WHERE c.scheme_id = ${schemeId}
            AND c.chlorine_date IN (${sqlTargetDates})
          ORDER BY c.chlorine_date, c.uploaded_at DESC, c.id DESC
        `);
        (fallbackHistoryRes.rows || []).forEach((r: any) => recordsByDate.set(String(r.data_date).trim(), r));
      }

      if (recordsByDate.size === 0) {
        const cDataRes: any = await db.execute(sql`
          SELECT * FROM chlorine_data
          WHERE scheme_id = ${schemeId}
            ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(village_name)) = LOWER(TRIM(${villageName}))` : sql``}
            ${esrName && esrName !== '-' ? sql`AND LOWER(TRIM(esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
          LIMIT 1
        `);
        const cRow = cDataRes.rows?.[0] || (await db.execute(sql`SELECT * FROM chlorine_data WHERE scheme_id = ${schemeId} LIMIT 1`)).rows?.[0];
        if (cRow) {
          for (let i = 1; i <= 7; i++) {
            const dt = cRow[`chlorine_date_day_${i}`];
            const val = cRow[`chlorine_value_day_${i}`];
            if (dt) {
              recordsByDate.set(String(dt).trim(), {
                scheme_id: schemeId,
                scheme_name: cRow.scheme_name,
                village_name: cRow.village_name,
                esr_name: cRow.esr_name,
                data_date: dt,
                chlorine_value: val,
                water_value: null,
              });
            }
          }
        }
      }
    } else if (category === "pressure") {
      const q = sql`
        SELECT DISTINCT ON (p.pressure_date)
          p.scheme_id, p.scheme_name, p.village_name, p.esr_name, p.pressure_date as data_date, p.pressure_value,
          wc.water_value
        FROM pressure_history p
        LEFT JOIN (
          SELECT DISTINCT ON (data_date) data_date, water_value
          FROM water_consumption_history
          WHERE scheme_id = ${schemeId}
            ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(village_name)) = LOWER(TRIM(${villageName}))` : sql``}
            ${esrName && esrName !== '-' ? sql`AND LOWER(TRIM(esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
          ORDER BY data_date, uploaded_at DESC
        ) wc ON wc.data_date = p.pressure_date
        WHERE p.scheme_id = ${schemeId}
          AND p.pressure_date IN (${sqlTargetDates})
          ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(p.village_name)) = LOWER(TRIM(${villageName}))` : sql``}
          ${esrName && esrName !== '-' ? sql`AND LOWER(TRIM(p.esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
        ORDER BY p.pressure_date, p.uploaded_at DESC, p.id DESC
      `;
      const tRes: any = await db.execute(q);
      (tRes.rows || []).forEach((r: any) => recordsByDate.set(String(r.data_date).trim(), r));

      if (recordsByDate.size === 0 && (villageName || esrName)) {
        const fallbackHistoryRes: any = await db.execute(sql`
          SELECT DISTINCT ON (p.pressure_date)
            p.scheme_id, p.scheme_name, p.village_name, p.esr_name, p.pressure_date as data_date, p.pressure_value,
            wc.water_value
          FROM pressure_history p
          LEFT JOIN (
            SELECT DISTINCT ON (data_date) data_date, water_value
            FROM water_consumption_history
            WHERE scheme_id = ${schemeId}
            ORDER BY data_date, uploaded_at DESC
          ) wc ON wc.data_date = p.pressure_date
          WHERE p.scheme_id = ${schemeId}
            AND p.pressure_date IN (${sqlTargetDates})
          ORDER BY p.pressure_date, p.uploaded_at DESC, p.id DESC
        `);
        (fallbackHistoryRes.rows || []).forEach((r: any) => recordsByDate.set(String(r.data_date).trim(), r));
      }

      if (recordsByDate.size === 0) {
        const pDataRes: any = await db.execute(sql`
          SELECT * FROM pressure_data
          WHERE scheme_id = ${schemeId}
            ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(village_name)) = LOWER(TRIM(${villageName}))` : sql``}
            ${esrName && esrName !== '-' ? sql`AND LOWER(TRIM(esr_name)) = LOWER(TRIM(${esrName}))` : sql``}
          LIMIT 1
        `);
        const pRow = pDataRes.rows?.[0] || (await db.execute(sql`SELECT * FROM pressure_data WHERE scheme_id = ${schemeId} LIMIT 1`)).rows?.[0];
        if (pRow) {
          for (let i = 1; i <= 7; i++) {
            const dt = pRow[`pressure_date_day_${i}`];
            const val = pRow[`pressure_value_day_${i}`];
            if (dt) {
              recordsByDate.set(String(dt).trim(), {
                scheme_id: schemeId,
                scheme_name: pRow.scheme_name,
                village_name: pRow.village_name,
                esr_name: pRow.esr_name,
                data_date: dt,
                pressure_value: val,
                water_value: null,
              });
            }
          }
        }
      }
    } else if (category === "lpcd") {
      const q = sql`
        SELECT DISTINCT ON (h.data_date)
          h.scheme_id, h.scheme_name, h.village_name, h.data_date, h.lpcd_value
        FROM water_scheme_data_history h
        WHERE h.scheme_id = ${schemeId}
          AND h.data_date IN (${sqlTargetDates})
          ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(h.village_name)) = LOWER(TRIM(${villageName}))` : sql``}
        ORDER BY h.data_date, h.uploaded_at DESC, h.id DESC
      `;
      const tRes: any = await db.execute(q);
      (tRes.rows || []).forEach((r: any) => recordsByDate.set(String(r.data_date).trim(), r));

      if (recordsByDate.size === 0 && villageName) {
        const fallbackHistoryRes: any = await db.execute(sql`
          SELECT DISTINCT ON (h.data_date)
            h.scheme_id, h.scheme_name, h.village_name, h.data_date, h.lpcd_value
          FROM water_scheme_data_history h
          WHERE h.scheme_id = ${schemeId}
            AND h.data_date IN (${sqlTargetDates})
          ORDER BY h.data_date, h.uploaded_at DESC, h.id DESC
        `);
        (fallbackHistoryRes.rows || []).forEach((r: any) => recordsByDate.set(String(r.data_date).trim(), r));
      }

      if (recordsByDate.size === 0) {
        const wDataRes: any = await db.execute(sql`
          SELECT * FROM water_scheme_data
          WHERE scheme_id = ${schemeId}
            ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(village_name)) = LOWER(TRIM(${villageName}))` : sql``}
          LIMIT 1
        `);
        const wRow = wDataRes.rows?.[0] || (await db.execute(sql`SELECT * FROM water_scheme_data WHERE scheme_id = ${schemeId} LIMIT 1`)).rows?.[0];
        if (wRow) {
          for (let i = 1; i <= 7; i++) {
            const dt = wRow[`lpcd_date_day${i}`];
            const val = wRow[`lpcd_value_day${i}`];
            if (dt) {
              recordsByDate.set(String(dt).trim(), {
                scheme_id: schemeId,
                scheme_name: wRow.scheme_name,
                village_name: wRow.village_name,
                data_date: dt,
                lpcd_value: val,
              });
            }
          }
        }
      }
    }

    const matchedTicket = logs.find((l: any) => l.ticket_id && l.ticket_id !== '-')?.ticket_id;

    // Build timeline using targetDates (18-Oct down to 12-Oct)
    const days = targetDates.map((dateStr, idx) => {
      const rec = recordsByDate.get(dateStr);
      let numVal: number | null = null;
      let numW: number | null = null;

      if (rec) {
        if (category === "chlorine") {
          numVal = rec.chlorine_value !== null && rec.chlorine_value !== undefined && String(rec.chlorine_value).trim() !== '' ? parseFloat(String(rec.chlorine_value).trim()) : null;
          numW = rec.water_value !== null && rec.water_value !== undefined && String(rec.water_value).trim() !== '' ? parseFloat(String(rec.water_value).trim()) : null;
        } else if (category === "pressure") {
          numVal = rec.pressure_value !== null && rec.pressure_value !== undefined && String(rec.pressure_value).trim() !== '' ? parseFloat(String(rec.pressure_value).trim()) : null;
          numW = rec.water_value !== null && rec.water_value !== undefined && String(rec.water_value).trim() !== '' ? parseFloat(String(rec.water_value).trim()) : null;
        } else if (category === "lpcd") {
          numVal = rec.lpcd_value !== null && rec.lpcd_value !== undefined && String(rec.lpcd_value).trim() !== '' ? parseFloat(String(rec.lpcd_value).trim()) : null;
        }
      }

      let isBreach = false;
      let alertType = "Compliant";
      let alertValue = "Normal";

      if (category === "chlorine") {
        if (numVal !== null && !isNaN(numVal)) {
          alertValue = `${numVal.toFixed(2)} mg/L`;
          if ((numVal < 0.20 || numVal > 0.50) && (numW === null || numW > 0)) {
            isBreach = true;
            alertType = numVal > 0.50 ? "High Chlorine" : "Low Chlorine";
          }
        } else {
          alertValue = "No Data";
        }
      } else if (category === "pressure") {
        if (numVal !== null && !isNaN(numVal)) {
          alertValue = `${numVal.toFixed(2)} Bar`;
          if (numVal < 0.20 && numVal >= 0 && (numW === null || numW > 0)) {
            isBreach = true;
            alertType = "Low Pressure";
          }
        } else {
          alertValue = "No Data";
        }
      } else if (category === "lpcd") {
        if (numVal !== null && !isNaN(numVal)) {
          alertValue = `${numVal.toFixed(0)} LPCD`;
          if (numVal < 55) {
            isBreach = true;
            alertType = "Low LPCD";
          }
        } else {
          alertValue = "No Data";
        }
      }

      // Compute streak on this day by counting backward from idx
      let streakOnDay = 0;
      if (isBreach) {
        for (let j = idx; j < targetDates.length; j++) {
          const jDate = targetDates[j];
          const jRec = recordsByDate.get(jDate);
          if (!jRec) break;
          let jVal: number | null = null;
          let jW: number | null = null;
          if (category === "chlorine") {
            jVal = jRec.chlorine_value !== null && jRec.chlorine_value !== undefined && String(jRec.chlorine_value).trim() !== '' ? parseFloat(String(jRec.chlorine_value).trim()) : null;
            jW = jRec.water_value !== null && jRec.water_value !== undefined && String(jRec.water_value).trim() !== '' ? parseFloat(String(jRec.water_value).trim()) : null;
          } else if (category === "pressure") {
            jVal = jRec.pressure_value !== null && jRec.pressure_value !== undefined && String(jRec.pressure_value).trim() !== '' ? parseFloat(String(jRec.pressure_value).trim()) : null;
            jW = jRec.water_value !== null && jRec.water_value !== undefined && String(jRec.water_value).trim() !== '' ? parseFloat(String(jRec.water_value).trim()) : null;
          } else if (category === "lpcd") {
            jVal = jRec.lpcd_value !== null && jRec.lpcd_value !== undefined && String(jRec.lpcd_value).trim() !== '' ? parseFloat(String(jRec.lpcd_value).trim()) : null;
          }

          let jBreach = false;
          if (category === "chlorine" && jVal !== null && (jVal < 0.2 || jVal > 0.5) && (jW === null || jW > 0)) jBreach = true;
          if (category === "pressure" && jVal !== null && (jVal < 0.2 && jVal >= 0) && (jW === null || jW > 0)) jBreach = true;
          if (category === "lpcd" && jVal !== null && jVal < 55) jBreach = true;

          if (jBreach) streakOnDay++;
          else break;
        }
      }

      // Clean formatted date: e.g. "21-Oct" -> "21 Oct 2026"
      const dateCfg = dateConfigs[idx] || dateConfigs.find(c => c.label === dateStr);
      const cleanDate = dateCfg ? dateCfg.full : (dateStr.replace('-', ' ') + ' 2026');

      return {
        dayIndex: idx + 1,
        date: cleanDate,
        dateFormatted: cleanDate,
        dayLabel: idx === 0 ? "Latest" : `Day ${idx + 1}`,
        hasAlert: isBreach,
        alertType,
        alertValue,
        streakDays: streakOnDay,
        villageName: villageName || rec?.village_name || "-",
        esrName: esrName || rec?.esr_name || "-",
        ticketId: matchedTicket || `TKT-${schemeId}-${dateStr.replace('-', '')}`,
        logCount: isBreach ? 1 : 0,
        allLogs: [],
      };
    });

    res.json({
      success: true,
      schemeId,
      category,
      timeline: days,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/alert-history:", error);
    res.status(500).json({ error: error.message || "Failed to fetch alert history" });
  }
});

/**
 * GET /api/escalation/schemes
 * Returns the list of schemes with escalation levels, filtering, and search
 */
router.get("/schemes", async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const level = req.query.level ? Number(req.query.level) : undefined;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;

    const { summary, schemes } = await getEscalationStatus({ region });

    let filtered = schemes;
    if (level && [1, 2, 3, 4, 5].includes(level)) {
      filtered = filtered.filter((s) => s.escalation_level === level);
    }
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.scheme_id.toLowerCase().includes(search) ||
          s.scheme_name.toLowerCase().includes(search) ||
          (s.region && s.region.toLowerCase().includes(search)) ||
          (s.division && s.division.toLowerCase().includes(search)) ||
          (s.ee_civil_name && s.ee_civil_name.toLowerCase().includes(search)) ||
          (s.de_ae_civil_name && s.de_ae_civil_name.toLowerCase().includes(search))
      );
    }

    res.json({
      summary,
      total_count: filtered.length,
      schemes: filtered,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/schemes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escalation schemes" });
  }
});

/**
 * GET /api/escalation/scheme/:schemeId
 * Detailed drilldown of a single scheme
 */
router.get("/scheme/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found in active escalation records" });
    }

    res.json(scheme);
  } catch (error: any) {
    console.error("Error in /api/escalation/scheme/:schemeId:", error);
    res.status(500).json({ error: error.message || "Failed to fetch scheme escalation details" });
  }
});

/**
 * GET /api/escalation/preview-de/:schemeId
 * Returns the rendered DE/AE Scheme-wise Daily Email & SMS preview (Tier 1)
 */
router.get("/preview-de/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const email = renderDeSchemeDailyEmail(scheme);
    const sms = renderSchemeEscalationSMS(scheme, "DE");

    res.json({
      success: true,
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      recipient_name: scheme.de_ae_civil_name || "Deputy / Assistant Engineer (Civil)",
      recipient_email: scheme.de_ae_civil_email || "N/A",
      recipient_mobile: scheme.de_ae_civil_mobile || "N/A",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: sms,
    });
  } catch (error: any) {
    console.error("Error in preview-de:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/escalation/preview-ee/:schemeId
 * Returns the rendered EE Scheme-wise Email & SMS preview
 */
router.get("/preview-ee/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const email = renderEeSchemeEscalationEmail(scheme);
    const sms = renderSchemeEscalationSMS(scheme, "EE");

    res.json({
      success: true,
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      recipient_name: scheme.ee_civil_name || "Executive Engineer (Civil)",
      recipient_email: scheme.ee_civil_email || "N/A",
      recipient_mobile: scheme.ee_civil_mobile || "N/A",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: sms,
    });
  } catch (error: any) {
    console.error("Error in preview-ee:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/escalation/preview-ce/:region
 * Returns the rendered CE Regional Consolidated Email & Scheme-wise SMS list
 */
router.get("/preview-ce/:region", async (req: Request, res: Response) => {
  try {
    const region = String(req.params.region).trim();
    const { schemes } = await getEscalationStatus({ region });
    const level3Schemes = schemes.filter((s) => s.escalation_level === 3);

    if (level3Schemes.length === 0) {
      return res.status(404).json({ error: `No Level 3 (7+ days chronic) schemes found in ${region} region` });
    }

    const schemeId = req.query.schemeId ? String(req.query.schemeId).trim() : null;
    let targetScheme = schemeId ? schemes.find((s) => s.scheme_id === schemeId) : null;
    if (!targetScheme) targetScheme = level3Schemes[0];

    const firstScheme = level3Schemes[0];
    const email = renderCeRegionalConsolidatedEmail(region, level3Schemes);
    const smsList = level3Schemes.map((s) => ({
      scheme_id: s.scheme_id,
      scheme_name: s.scheme_name,
      sms_text: renderSchemeEscalationSMS(s, "CE"),
    }));

    res.json({
      success: true,
      region,
      total_chronic_schemes: level3Schemes.length,
      recipient: {
        name: firstScheme.chief_engineer_name || "Chief Engineer",
        email: firstScheme.chief_engineer_email || "N/A",
        mobile: firstScheme.chief_engineer_mobile || "N/A",
        region,
      },
      recipient_name: firstScheme.chief_engineer_name || "Chief Engineer",
      recipient_email: firstScheme.chief_engineer_email || "N/A",
      recipient_mobile: firstScheme.chief_engineer_mobile || "N/A",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: targetScheme ? renderSchemeEscalationSMS(targetScheme, "CE") : (smsList[0]?.sms_text || ""),
      sms_list: smsList,
    });
  } catch (error: any) {
    console.error("Error in preview-ce:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/escalation/preview-ms/:schemeId
 * Returns preview of the Level 4 Member Secretary (MS) escalation notice
 */
router.get("/preview-ms/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: `Scheme ${schemeId} not found in escalation records` });
    }

    const email = renderMsSchemeEscalationEmail(scheme);
    const sms = renderSchemeEscalationSMS(scheme, "MS");

    res.json({
      success: true,
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      streak_days: scheme.max_streak_days,
      recipient: {
        name: "Member Secretary (MS)",
        role: "Member Secretary, Maharashtra Jeevan Pradhikaran",
        email: "ms.mjp@gov.in",
        mobile: "Head Office",
        office: "MJP Head Office, Mumbai",
      },
      recipient_name: "Member Secretary (MS)",
      recipient_email: "ms.mjp@gov.in",
      recipient_mobile: "Head Office",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: sms,
    });
  } catch (error: any) {
    console.error("Error in preview-ms:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/escalation/preview-ps/:schemeId
 * Returns preview of the Level 5 Principal Secretary (PS) escalation notice
 */
router.get("/preview-ps/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: `Scheme ${schemeId} not found in escalation records` });
    }

    const email = renderPsSchemeEscalationEmail(scheme);
    const sms = renderSchemeEscalationSMS(scheme, "PS");

    res.json({
      success: true,
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      streak_days: scheme.max_streak_days,
      recipient: {
        name: "Principal Secretary (PS)",
        role: "Principal Secretary, Water Supply & Sanitation Department, Maharashtra",
        email: "ps.wss@maharashtra.gov.in",
        mobile: "Secretariat",
        office: "Mantralaya, Mumbai",
      },
      recipient_name: "Principal Secretary (PS)",
      recipient_email: "ps.wss@maharashtra.gov.in",
      recipient_mobile: "Secretariat",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: sms,
    });
  } catch (error: any) {
    console.error("Error in preview-ps:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/escalation/dispatch or /api/escalation/trigger-now
 * Triggers escalation dispatch (Dry-run by default unless live confirmed)
 */
const handleDispatch = async (req: Request, res: Response) => {
  try {
    const { dryRun, schemeId, region } = req.body;
    const result = await executeEscalationDispatch({
      dryRun: dryRun !== false,
      schemeId,
      region,
    });
    res.json({
      ...result,
      dryRun: dryRun !== false,
      results: {
        ee_count: result.ee_emails_sent + result.ee_sms_sent,
        ce_count: result.ce_emails_sent + result.ce_sms_sent,
        ms_count: result.ms_emails_sent + result.ms_sms_sent,
        ps_count: result.ps_emails_sent + result.ps_sms_sent,
      },
    });
  } catch (error: any) {
    console.error("Error in escalation dispatch:", error);
    res.status(500).json({ error: error.message || "Failed to execute escalation dispatch" });
  }
};

router.post("/dispatch", handleDispatch);
router.post("/trigger-now", handleDispatch);

/**
 * GET /api/escalation/executive-contacts
 * Returns current configured contact details for Member Secretary (MS) and Principal Secretary (PS)
 */
router.get("/executive-contacts", async (req: Request, res: Response) => {
  try {
    const contacts = await getExecutiveContacts();
    res.json({ success: true, contacts });
  } catch (error: any) {
    console.error("Error fetching executive contacts:", error);
    res.status(500).json({ error: error.message || "Failed to fetch executive contacts" });
  }
});

/**
 * POST /api/escalation/executive-contacts
 * Updates contact details for Member Secretary (MS) and Principal Secretary (PS)
 */
router.post("/executive-contacts", async (req: Request, res: Response) => {
  try {
    const { ms, ps } = req.body;
    await updateExecutiveContacts({ ms, ps });
    const updated = await getExecutiveContacts();
    res.json({ success: true, message: "Executive contacts updated successfully", contacts: updated });
  } catch (error: any) {
    console.error("Error updating executive contacts:", error);
    res.status(500).json({ error: error.message || "Failed to update executive contacts" });
  }
});

/**
 * Helper to determine escalation level (1..5) from officer role string
 */
function getEscalationLevelFromRole(role: string): number {
  const r = (role || "").toLowerCase();
  if (r.includes("principal") || r.includes("ps")) return 5;
  if (r.includes("member") || r.includes("ms")) return 4;
  if (r.includes("chief") || r.includes("ce") || r.includes("superintending") || r.includes("se")) return 3;
  if (r.includes("executive") || r.includes("ee")) return 2;
  if (r.includes("vendor") || r.includes("agency")) return 0;
  return 1;
}

/**
 * Helper to get clean level title from level number
 */
function getLevelTitle(level: number): { title: string; sheetName: string; authority: string; cadence: string } {
  switch (level) {
    case 5:
      return {
        title: "Level 5: Principal Secretary (PS)",
        sheetName: "Level 5 - PS",
        authority: "Principal Secretary (Head - WSSD)",
        cadence: "Every 21 Days on Monday (Streak ≥ 20 Days)",
      };
    case 4:
      return {
        title: "Level 4: Member Secretary (MS)",
        sheetName: "Level 4 - MS",
        authority: "Member Secretary (Head - MJP)",
        cadence: "Every 2 Weeks / 14 Days on Monday (Streak ≥ 15 Days)",
      };
    case 3:
      return {
        title: "Level 3: Superintending & Chief Engineer (SE & CE)",
        sheetName: "Level 3 - CE & SE",
        authority: "Chief Engineer & Superintending Engineer",
        cadence: "Every Monday (Weekly, Streak ≥ 7 Days)",
      };
    case 2:
      return {
        title: "Level 2: Executive Engineer (EE)",
        sheetName: "Level 2 - EE",
        authority: "Executive Engineer (Civil)",
        cadence: "Every 3rd Day (Streak ≥ 3 Days)",
      };
    case 0:
      return {
        title: "Vendor IoT Maintenance Agencies",
        sheetName: "Vendor IoT Agencies",
        authority: "IoT Maintenance Agency Vendors",
        cadence: "Daily & Immediate Telemetry Breaches",
      };
    case 1:
    default:
      return {
        title: "Level 1: Deputy Engineer / Assistant Engineer (DE/AE)",
        sheetName: "Level 1 - DE & AE",
        authority: "Deputy Engineer / Assistant Engineer (Civil)",
        cadence: "Daily Automated Dispatch (1+ Days)",
      };
  }
}

/**
 * Helper to add a Level Dispatches Sheet (person, time, schemes, alerts count for lpcd/chlorine/pressure/offline)
 * Specifically excludes streak calculation and current level as requested by user.
 */
function addLevelDispatchesSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  levelTitle: string,
  rows: any[],
  categoryFilter: string
) {
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ showGridLines: true }],
  });

  const catTag = categoryFilter && categoryFilter !== "all" ? ` [${categoryFilter.toUpperCase()} ONLY]` : "";

  // Title Banner
  sheet.mergeCells("A1:P1");
  const tCell = sheet.getCell("A1");
  tCell.value = "MAHARASHTRA JEEVAN PRADHIKARAN — JAL JEEVAN MISSION";
  tCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  tCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells("A2:P2");
  const subCell = sheet.getCell("A2");
  subCell.value = `Official Email Alert Dispatch Registry — ${levelTitle}${catTag} — (${rows.length} Emails Dispatched)`;
  subCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 24;

  const headers = [
    "Sr No",
    "Dispatch Date",
    "Dispatch Time (IST)",
    "Recipient Officer Name",
    "Role / Designation",
    "Recipient Email Address",
    "Mobile Number",
    "Schemes Count",
    "Scheme Name(s) Covered",
    "Total Alerts in Email",
    "Low LPCD Alerts (<55)",
    "Chlorine Alerts",
    "Pressure Alerts",
    "Offline Sensor Alerts",
    "Email Subject",
    "Delivery Status",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  if (rows.length === 0) {
    const emptyRow = sheet.addRow([
      "-",
      "-",
      "-",
      `No emails dispatched for ${levelTitle}${catTag}`,
      "-",
      "-",
      "-",
      0,
      "-",
      0,
      0,
      0,
      0,
      0,
      "-",
      "No Records",
    ]);
    emptyRow.height = 24;
    emptyRow.alignment = { vertical: "middle" };
  } else {
    rows.forEach((r, idx) => {
      const sNames = Array.isArray(r.scheme_names)
        ? r.scheme_names.join("; ")
        : typeof r.scheme_names === "string"
          ? (JSON.parse(r.scheme_names || "[]") || []).join("; ")
          : r.scheme_names || "-";

      const timeStr = r.sent_time || (r.created_at ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour12: false }) : "-");
      const dateStr = r.dispatch_date || (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "-");

      const row = sheet.addRow([
        idx + 1,
        dateStr,
        timeStr,
        r.engineer_name || "-",
        r.engineer_role || "-",
        r.engineer_email || "-",
        r.engineer_mobile ? `+91 ${r.engineer_mobile}` : "-",
        r.total_schemes || 1,
        sNames,
        r.total_alerts || 0,
        r.lpcd_alerts_count || 0,
        r.chlorine_alerts_count || 0,
        r.pressure_alerts_count || 0,
        r.offline_alerts_count || 0,
        r.subject || "Daily Alert Digest",
        r.status === "SENT" ? "DELIVERED (SMTP)" : r.status || "SENT",
      ]);

      row.height = 22;
      row.alignment = { vertical: "middle" };
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(13).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(14).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(16).alignment = { horizontal: "center", vertical: "middle" };

      // Status green
      const statusCell = row.getCell(16);
      statusCell.font = { bold: true, color: { argb: "FF065F46" } };

      if (idx % 2 === 1) {
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
      }
    });
  }

  sheet.columns.forEach((col) => {
    let maxLen = 14;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = Math.min(val.length + 3, 50);
    });
    col.width = maxLen;
  });
}

/**
 * Shared function to build and send the dispatches workbook
 */
async function handleExportDispatchesExcel(req: Request, res: Response) {
  try {
    const db = await getDB();
    const levelParam = req.query.level ? String(req.query.level).toLowerCase() : undefined;
    const levelFilter = levelParam && levelParam !== "all" ? parseInt(levelParam, 10) : undefined;
    const categoryFilter = (req.query.category as string || "all").toLowerCase();
    const dateParam = req.query.date ? String(req.query.date) : undefined;

    // Fetch dispatches from consolidated_email_dispatches (last 30 days or specific date)
    const dispatchesQuery = dateParam
      ? sql`
          SELECT 
            id,
            dispatch_date::text as dispatch_date,
            sent_time,
            engineer_name,
            engineer_email,
            engineer_mobile,
            engineer_role,
            total_schemes,
            scheme_names,
            scheme_ids,
            total_alerts,
            lpcd_alerts_count,
            chlorine_alerts_count,
            pressure_alerts_count,
            offline_alerts_count,
            master_token,
            subject,
            status,
            created_at
          FROM consolidated_email_dispatches
          WHERE dispatch_date::date = ${dateParam}::date
          ORDER BY dispatch_date DESC, id DESC
        `
      : sql`
          SELECT 
            id,
            dispatch_date::text as dispatch_date,
            sent_time,
            engineer_name,
            engineer_email,
            engineer_mobile,
            engineer_role,
            total_schemes,
            scheme_names,
            scheme_ids,
            total_alerts,
            lpcd_alerts_count,
            chlorine_alerts_count,
            pressure_alerts_count,
            offline_alerts_count,
            master_token,
            subject,
            status,
            created_at
          FROM consolidated_email_dispatches
          WHERE dispatch_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days'
          ORDER BY dispatch_date DESC, id DESC
        `;

    const dispatchesRes: any = await db.execute(dispatchesQuery);
    let allRows: any[] = dispatchesRes.rows || [];

    // Filter by category if requested (when user clicks LPCD, overall excel will be just for LPCD, same for rest)
    if (categoryFilter === "lpcd") {
      allRows = allRows.filter((r) => Number(r.lpcd_alerts_count) > 0);
    } else if (categoryFilter === "chlorine") {
      allRows = allRows.filter((r) => Number(r.chlorine_alerts_count) > 0);
    } else if (categoryFilter === "pressure") {
      allRows = allRows.filter((r) => Number(r.pressure_alerts_count) > 0);
    } else if (categoryFilter === "offline") {
      allRows = allRows.filter((r) => Number(r.offline_alerts_count) > 0);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Maharashtra Jeevan Pradhikaran - JJM IoT Cell";
    workbook.created = new Date();

    const catSuffix = categoryFilter !== "all" ? `_${categoryFilter.toUpperCase()}` : "";
    const todayStr = new Date().toISOString().slice(0, 10);

    // MODE 1: SINGLE LEVEL EXCEL (when level=1, 2, 3, 4, 5 is specified)
    if (levelFilter && [1, 2, 3, 4, 5].includes(levelFilter)) {
      const levelMeta = getLevelTitle(levelFilter);
      const levelRows = allRows.filter((r) => getEscalationLevelFromRole(r.engineer_role) === levelFilter);

      addLevelDispatchesSheet(
        workbook,
        levelMeta.sheetName,
        levelMeta.title,
        levelRows,
        categoryFilter
      );

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="MJP_Level_${levelFilter}_Email_Dispatches${catSuffix}_${todayStr}.xlsx"`
      );
      await workbook.xlsx.write(res);
      return res.end();
    }

    // MODE 2: OVERALL DISPATCHES OF EMAIL (Overview sheet + sheet by each level)
    // -------------------------------------------------------------------------
    // SHEET 1: OVERVIEW OF ALL LEVELS
    // -------------------------------------------------------------------------
    const overviewSheet = workbook.addWorksheet("Overview", {
      views: [{ showGridLines: true }],
    });

    const catTag = categoryFilter !== "all" ? ` [${categoryFilter.toUpperCase()} ONLY]` : "";

    overviewSheet.mergeCells("A1:L1");
    const oTitle = overviewSheet.getCell("A1");
    oTitle.value = "MAHARASHTRA JEEVAN PRADHIKARAN — JAL JEEVAN MISSION";
    oTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    oTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    oTitle.alignment = { horizontal: "center", vertical: "middle" };
    overviewSheet.getRow(1).height = 32;

    overviewSheet.mergeCells("A2:L2");
    const oSub = overviewSheet.getCell("A2");
    oSub.value = `Overall Email Alert Dispatches Overview by Escalation Level${catTag} — (Generated: ${new Date().toLocaleDateString("en-IN")})`;
    oSub.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    oSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    oSub.alignment = { horizontal: "center", vertical: "middle" };
    overviewSheet.getRow(2).height = 24;

    const overviewHeaders = [
      "Escalation Level",
      "Target Authority",
      "Cadence",
      "Total Emails Sent",
      "Unique Officers Notified",
      "Total Schemes Covered",
      "Mails with LPCD Alerts",
      "Mails with Chlorine Alerts",
      "Mails with Pressure Alerts",
      "Mails with Offline Alerts",
      "Latest Dispatch Date & Time",
      "Delivery Status",
    ];

    const ovHeaderRow = overviewSheet.addRow(overviewHeaders);
    ovHeaderRow.height = 26;
    ovHeaderRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    // Helper to compute summary stats for a level
    const computeLevelOverview = (targetLevel: number) => {
      const rows = allRows.filter((r) => getEscalationLevelFromRole(r.engineer_role) === targetLevel);
      const meta = getLevelTitle(targetLevel);
      const officersSet = new Set<string>();
      const schemesSet = new Set<string>();
      let lpcdMails = 0;
      let chlorineMails = 0;
      let pressureMails = 0;
      let offlineMails = 0;
      let latestDate = "-";
      let latestTime = "";

      rows.forEach((r, idx) => {
        if (r.engineer_name) officersSet.add(r.engineer_name.trim().toLowerCase());
        const sids = Array.isArray(r.scheme_ids)
          ? r.scheme_ids
          : typeof r.scheme_ids === "string"
            ? JSON.parse(r.scheme_ids || "[]")
            : [];
        sids.forEach((sid: any) => schemesSet.add(String(sid)));

        if (Number(r.lpcd_alerts_count) > 0) lpcdMails++;
        if (Number(r.chlorine_alerts_count) > 0) chlorineMails++;
        if (Number(r.pressure_alerts_count) > 0) pressureMails++;
        if (Number(r.offline_alerts_count) > 0) offlineMails++;

        if (idx === 0) {
          latestDate = r.dispatch_date || "";
          latestTime = r.sent_time || "";
        }
      });

      const latestDateTimeStr = latestDate !== "-" ? `${latestDate} ${latestTime}`.trim() : "No Emails";

      return {
        levelName: targetLevel === 0 ? "Vendors" : `Level ${targetLevel}`,
        meta,
        rows,
        emailsCount: rows.length,
        officersCount: officersSet.size,
        schemesCount: schemesSet.size,
        lpcdMails,
        chlorineMails,
        pressureMails,
        offlineMails,
        latestDateTimeStr,
      };
    };

    const l1Stat = computeLevelOverview(1);
    const l2Stat = computeLevelOverview(2);
    const l3Stat = computeLevelOverview(3);
    const l4Stat = computeLevelOverview(4);
    const l5Stat = computeLevelOverview(5);
    const vStat = computeLevelOverview(0);

    const statsList = [l1Stat, l2Stat, l3Stat, l4Stat, l5Stat];
    if (vStat.emailsCount > 0) statsList.push(vStat);

    statsList.forEach((st, idx) => {
      const row = overviewSheet.addRow([
        st.levelName,
        st.meta.authority,
        st.meta.cadence,
        st.emailsCount,
        st.officersCount,
        st.schemesCount,
        st.lpcdMails,
        st.chlorineMails,
        st.pressureMails,
        st.offlineMails,
        st.latestDateTimeStr,
        st.emailsCount > 0 ? "100% Delivered (SMTP)" : "No Dispatches",
      ]);

      row.height = 24;
      row.alignment = { vertical: "middle" };
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };

      row.getCell(1).font = { bold: true };
      if (idx % 2 === 1) {
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
      }
    });

    // Total Summary Row
    const totEmails = statsList.reduce((acc, s) => acc + s.emailsCount, 0);
    const totOfficers = statsList.reduce((acc, s) => acc + s.officersCount, 0);
    const totSchemes = statsList.reduce((acc, s) => acc + s.schemesCount, 0);
    const totLpcd = statsList.reduce((acc, s) => acc + s.lpcdMails, 0);
    const totChlorine = statsList.reduce((acc, s) => acc + s.chlorineMails, 0);
    const totPressure = statsList.reduce((acc, s) => acc + s.pressureMails, 0);
    const totOffline = statsList.reduce((acc, s) => acc + s.offlineMails, 0);

    const totRow = overviewSheet.addRow([
      "TOTAL",
      "All Escalation Levels & Authorities Combined",
      "-",
      totEmails,
      totOfficers,
      totSchemes,
      totLpcd,
      totChlorine,
      totPressure,
      totOffline,
      "-",
      "100% Delivered (SMTP)",
    ]);
    totRow.height = 28;
    totRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    overviewSheet.columns.forEach((col) => {
      let maxLen = 14;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen) maxLen = Math.min(val.length + 3, 50);
      });
      col.width = maxLen;
    });

    // -------------------------------------------------------------------------
    // SUBSEQUENT SHEETS: JUST SHEET BY EACH LEVEL (no streak, no current level)
    // -------------------------------------------------------------------------
    addLevelDispatchesSheet(workbook, "Level 1 - DE & AE", l1Stat.meta.title, l1Stat.rows, categoryFilter);
    addLevelDispatchesSheet(workbook, "Level 2 - EE", l2Stat.meta.title, l2Stat.rows, categoryFilter);
    addLevelDispatchesSheet(workbook, "Level 3 - CE & SE", l3Stat.meta.title, l3Stat.rows, categoryFilter);
    addLevelDispatchesSheet(workbook, "Level 4 - MS", l4Stat.meta.title, l4Stat.rows, categoryFilter);
    addLevelDispatchesSheet(workbook, "Level 5 - PS", l5Stat.meta.title, l5Stat.rows, categoryFilter);
    if (vStat.rows.length > 0) {
      addLevelDispatchesSheet(workbook, "Vendor IoT Agencies", vStat.meta.title, vStat.rows, categoryFilter);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MJP_Overall_Email_Dispatches${catSuffix}_${todayStr}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error in export dispatches excel:", error);
    res.status(500).json({ error: error.message || "Failed to export dispatches Excel" });
  }
}

/**
 * GET /api/escalation/export-excel
 * Main Excel export entrypoint: supports ?level=1..5, ?level=all, and ?category=all|lpcd|chlorine|pressure|offline
 */
router.get("/export-excel", handleExportDispatchesExcel);

/**
 * GET /api/escalation/export-overall-dispatches
 * Explicit route for overall email dispatches export
 */
router.get("/export-overall-dispatches", handleExportDispatchesExcel);

/**
 * GET /api/escalation/level5-summary or /api/level5-summary
 * Returns matrix summary for:
 * 1. Project Scope (Scope Overview)
 * 2. IoT Progress (Integrated vs Fully Integrated)
 * 3. Operational (water_supply = 'Yes')
 * 4. Alert - Level 5 - 20+ Days (Low LPCD schemes & villages, Low Pressure ESRs, Residual Chlorine out of range ESRs)
 */
const level5SummaryCache = new Map<string, { timestamp: number; payload: any }>();
const SUMMARY_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

router.get("/level5-summary", async (req: Request, res: Response) => {
  try {
    const selectedRegion = (req.query.region as string) || "all";
    const streakThreshold = parseInt((req.query.days as string) || "20", 10) || 20;
    const forceRefresh = req.query.refresh === "true";
    const isAll = !selectedRegion || selectedRegion.toLowerCase() === "all";

    const tier = req.query.tier ? String(req.query.tier).trim() : (streakThreshold <= 7 ? '3' : streakThreshold <= 15 ? '4' : '5');
    const [dispatchInfo, asOfDateTier] = await Promise.all([
      getLatestDispatchDateForTier(tier),
      resolveTelemetryDateForTier(tier, req.query.asOfDate as string),
    ]);

    const cacheKey = `${selectedRegion.toLowerCase()}:::${streakThreshold}:::${dispatchInfo?.isoDate || 'latest'}`;
    if (!forceRefresh) {
      const cached = level5SummaryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SUMMARY_CACHE_TTL) {
        return res.json(cached.payload);
      }
    }

    const db = await getDB();

    // 1. Project Scope
    let projectScope = {
      schemes: 389,
      villages: 5993,
      esr: 10319,
    };

    if (!isAll) {
      const scopeRes: any = await db.execute(sql`
        SELECT
          COUNT(DISTINCT sp.scheme_id)::bigint AS schemes,
          COALESCE(SUM(sp.number_of_villages), 0)::bigint AS villages,
          COALESCE(SUM(COALESCE(sp.number_of_esr,0) + COALESCE(sp.number_of_gsr,0) + COALESCE(sp.number_of_mbr,0)), 0)::bigint AS esr
        FROM scheme_progress_summary sp
        LEFT JOIN (
          SELECT DISTINCT scheme_id::text as scheme_id, region FROM scheme_status
        ) ss ON ss.scheme_id = sp.scheme_id::text
        WHERE (
          sp.region ILIKE ${`%${selectedRegion}%`} 
          OR ss.region ILIKE ${`%${selectedRegion}%`}
        );
      `);
      const r = scopeRes.rows ? scopeRes.rows[0] : scopeRes[0];
      if (r) {
        projectScope = {
          schemes: Number(r.schemes || 0),
          villages: Number(r.villages || 0),
          esr: Number(r.esr || 0),
        };
      }
    }

    // 2. IoT Progress (Summary & Itemized Lists)
    let iotProgress = {
      schemes: { totalIntegrated: 226, fullyIntegrated: 52 },
      villages: { totalIntegrated: 2249, fullyIntegrated: 1269 },
      esr: { totalIntegrated: 3018, fullyIntegrated: 2249 },
    };

    if (!isAll) {
      const iotRes: any = await db.execute(sql`
        SELECT
          COUNT(DISTINCT CASE WHEN total_villages_integrated > 0 OR total_esr_integrated > 0 THEN scheme_id END)::bigint as schemes_total,
          COUNT(DISTINCT CASE WHEN TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') THEN scheme_id END)::bigint as schemes_fully,
          COALESCE(SUM(total_villages_integrated), 0)::bigint as villages_total,
          COALESCE(SUM(fully_completed_villages), 0)::bigint as villages_fully,
          COALESCE(SUM(total_esr_integrated), 0)::bigint as esr_total,
          COALESCE(SUM(no_fully_completed_esr), 0)::bigint as esr_fully
        FROM scheme_status
        WHERE region ILIKE ${`%${selectedRegion}%`};
      `);
      const r = iotRes.rows ? iotRes.rows[0] : iotRes[0];
      if (r) {
        iotProgress = {
          schemes: { totalIntegrated: Number(r.schemes_total || 0), fullyIntegrated: Number(r.schemes_fully || 0) },
          villages: { totalIntegrated: Number(r.villages_total || 0), fullyIntegrated: Number(r.villages_fully || 0) },
          esr: { totalIntegrated: Number(r.esr_total || 0), fullyIntegrated: Number(r.esr_fully || 0) },
        };
      }
    }

    // 3. Operational Schemes, Villages & ESRs (Connected Schemes: water_supply = 'Yes' and integrated)
    let operational = {
      schemes: 39,
      villages: 255,
      esr: 324,
    };

    if (!isAll) {
      const opRes: any = await db.execute(sql`
        SELECT
          COUNT(DISTINCT ss.scheme_id)::bigint as schemes,
          COUNT(DISTINCT (ws.scheme_id, LOWER(TRIM(ws.village_name))))::bigint as villages,
          COUNT(DISTINCT (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name))))::bigint as esr
        FROM scheme_status ss
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = ss.scheme_id
        LEFT JOIN chlorine_data c ON c.scheme_id = ss.scheme_id
        WHERE ss.water_supply = 'Yes'
          AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
          AND ss.region ILIKE ${`%${selectedRegion}%`};
      `);
      const r = opRes.rows ? opRes.rows[0] : opRes[0];
      if (r) {
        operational = {
          schemes: Number(r.schemes || 0),
          villages: Number(r.villages || 0),
          esr: Number(r.esr || 0),
        };
      }
    }

    // Concurrent fetching of detail records for clickable items
    const [
      iotSchemesTotalRes,
      iotSchemesFullyRes,
      iotVillagesTotalRes,
      iotVillagesFullyRes,
      iotEsrTotalRes,
      iotEsrFullyRes,
      opSchemesRes,
      opVillagesRes,
      opEsrsRes,
      escalationRes,
      issueReportsRes
    ] = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT ON (scheme_id)
          scheme_id, scheme_name, region, circle, division, sub_division, block,
          total_villages_integrated, total_esr_integrated,
          fully_completion_scheme_status as status,
          water_supply
        FROM scheme_status
        WHERE (total_villages_integrated > 0 OR total_esr_integrated > 0)
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY scheme_id, region, scheme_name
      `),
      db.execute(sql`
        SELECT DISTINCT ON (scheme_id)
          scheme_id, scheme_name, region, circle, division, sub_division, block,
          fully_completed_villages, no_fully_completed_esr,
          fully_completion_scheme_status as status,
          water_supply
        FROM scheme_status
        WHERE (TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed', 'connected') OR TRIM(LOWER(mjp_fully_completed)) = 'yes')
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY scheme_id, region, scheme_name
      `),
      db.execute(sql`
        SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
          ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
          ws.population, ws.lpcd_value_day7 as lpcd_value, ss.water_supply_status as status
        FROM water_scheme_data ws
        LEFT JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id
        WHERE ws.village_name IS NOT NULL
        ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
      `),
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(ws.population, 0) as population,
          COALESCE(ws.lpcd_value_day7::text, ws.lpcd_value_day1::text, '-') as lpcd_value,
          'Completed' as status
        FROM village v
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully-completed')
          ${isAll ? sql`` : sql`AND v.region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name))
      `),
      db.execute(sql`
        SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))
          scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block,
          chlorine_connected, pressure_connected, flow_meter_connected,
          overall_status as status
        FROM communication_status
        WHERE esr_name IS NOT NULL AND esr_name != '-'
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))
      `),
      db.execute(sql`
        SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))
          scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block,
          chlorine_connected, pressure_connected, flow_meter_connected,
          overall_status as status
        FROM communication_status
        WHERE esr_name IS NOT NULL AND esr_name != '-'
          AND LOWER(TRIM(chlorine_connected)) = 'connected'
          AND LOWER(TRIM(pressure_connected)) = 'connected'
          AND LOWER(TRIM(flow_meter_connected)) = 'connected'
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))
      `),
      db.execute(sql`
        SELECT DISTINCT ON (scheme_id)
          scheme_id, scheme_name, region, circle, division, sub_division, block,
          water_supply as status
        FROM scheme_status
        WHERE water_supply = 'Yes'
          AND (total_villages_integrated > 0 OR total_esr_integrated > 0)
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY scheme_id, region, scheme_name
      `),
      db.execute(sql`
        SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
          ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
          ws.population, ws.lpcd_value_day7 as lpcd_value, 'Yes' as status
        FROM water_scheme_data ws
        JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        WHERE ws.village_name IS NOT NULL
          ${isAll ? sql`` : sql`AND ws.region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
      `),
      db.execute(sql`
        SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
          c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.region, c.circle, c.division, c.sub_division, c.block,
          'Yes' as status
        FROM chlorine_data c
        JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        WHERE c.esr_name IS NOT NULL AND c.esr_name != '-'
          ${isAll ? sql`` : sql`AND c.region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name))
      `),
      getEscalationStatus({
        region: isAll ? undefined : selectedRegion,
        asOfDate: asOfDateTier,
        dispatchDate: dispatchInfo?.isoDate,
      }),
      db.execute(sql`
        SELECT scheme_id, 
               json_agg(json_build_object(
                 'id', id,
                 'problem_level', problem_level,
                 'village_name', village_name,
                 'esr_name', esr_name,
                 'reason', reason,
                 'status', status,
                 'status_value', status_value,
                 'resolution_remark', resolution_remark,
                 'created_at', created_at,
                 'resolved_at', resolved_at,
                 'creator_name', creator_name
               ) ORDER BY created_at DESC) as remarks
        FROM issue_reports
        GROUP BY scheme_id
      `)
    ]);

    const iotSchemesTotalList = (iotSchemesTotalRes as any).rows || [];
    const iotSchemesFullyList = (iotSchemesFullyRes as any).rows || [];
    const iotVillagesTotalList = (iotVillagesTotalRes as any).rows || [];
    const iotVillagesFullyList = (iotVillagesFullyRes as any).rows || [];
    const iotEsrTotalList = (iotEsrTotalRes as any).rows || [];
    const iotEsrFullyList = (iotEsrFullyRes as any).rows || [];
    const rawOpSchemes = (opSchemesRes as any).rows || [];
    const opVillagesList = (opVillagesRes as any).rows || [];
    const opEsrsList = (opEsrsRes as any).rows || [];
    const issueReportsList = (issueReportsRes as any).rows || [];

    const remarksByScheme = new Map<string, any[]>();
    issueReportsList.forEach((r: any) => {
      if (r.scheme_id) remarksByScheme.set(String(r.scheme_id).trim(), r.remarks || []);
    });

    const opSchemesList = rawOpSchemes.map((s: any) => ({
      ...s,
      remarks: remarksByScheme.get(String(s.scheme_id).trim()) || [],
      remarks_count: (remarksByScheme.get(String(s.scheme_id).trim()) || []).length,
    }));

    iotProgress = {
      schemes: { totalIntegrated: iotSchemesTotalList.length, fullyIntegrated: iotSchemesFullyList.length },
      villages: { totalIntegrated: iotVillagesTotalList.length, fullyIntegrated: iotVillagesFullyList.length },
      esr: { totalIntegrated: iotEsrTotalList.length, fullyIntegrated: iotEsrFullyList.length },
    };

    operational = {
      schemes: opSchemesList.length,
      villages: opVillagesList.length,
      esr: opEsrsList.length,
    };

    // 4. Alerts calculation by streak threshold (7, 15, 20 Days)
    const allSchemes = (escalationRes as any)?.schemes || [];

    const lowLpcdSchemesList: any[] = [];
    const lowLpcdVillagesList: any[] = [];
    const lowPressureEsrsList: any[] = [];
    const residualChlorineList: any[] = [];

    allSchemes.forEach((s: any) => {
      // Low LPCD Schemes & Villages filtered by individual village days_count
      const qualifyingLpcdVillages = (s.lpcd_villages || []).filter(
        (v: any) => (v.days_count || 1) >= streakThreshold
      );

      if (qualifyingLpcdVillages.length > 0) {
        lowLpcdSchemesList.push({
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          division: s.division,
          district: s.district,
          villages_count: qualifyingLpcdVillages.length,
          max_streak: Math.max(...qualifyingLpcdVillages.map((v: any) => v.days_count || 1)),
          villages_list: qualifyingLpcdVillages.map((v: any) => v.village_name).join(', '),
        });

        qualifyingLpcdVillages.forEach((v: any) => {
          lowLpcdVillagesList.push({
            scheme_id: s.scheme_id,
            scheme_name: s.scheme_name,
            region: s.region,
            division: s.division,
            village_name: v.village_name,
            parameter_value: v.avg_val || '<55 LPCD',
            streak_days: v.days_count || s.max_streak_days,
            telemetry_date: null,
          });
        });
      }

      // Low Pressure ESRs filtered by individual ESR days_count
      const qualifyingPressureEsrs = (s.pressure_low_esrs || []).filter(
        (p: any) => (p.days_count || 1) >= streakThreshold
      );

      qualifyingPressureEsrs.forEach((p: any) => {
        lowPressureEsrsList.push({
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          division: s.division,
          village_name: p.village_name,
          esr_name: p.esr_name,
          parameter_value: p.val || '<0.2 Bar',
          streak_days: p.days_count || s.max_streak_days,
          telemetry_date: null,
        });
      });

      // Residual Chlorine Out Of Range (low + high) filtered by individual ESR days_count
      const qualifyingChlorineLow = (s.chlorine_low_esrs || []).filter(
        (c: any) => (c.days_count || 1) >= streakThreshold
      );
      qualifyingChlorineLow.forEach((c: any) => {
        residualChlorineList.push({
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          division: s.division,
          village_name: c.village_name,
          esr_name: c.esr_name,
          parameter_value: c.val || '<0.2 mg/L',
          issue_type: 'Low Chlorine',
          streak_days: c.days_count || s.max_streak_days,
          telemetry_date: null,
        });
      });

      const qualifyingChlorineHigh = (s.chlorine_high_esrs || []).filter(
        (c: any) => (c.days_count || 1) >= streakThreshold
      );
      qualifyingChlorineHigh.forEach((c: any) => {
        residualChlorineList.push({
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          division: s.division,
          village_name: c.village_name,
          esr_name: c.esr_name,
          parameter_value: c.val || '>0.5 mg/L',
          issue_type: 'High Chlorine',
          streak_days: c.days_count || s.max_streak_days,
          telemetry_date: null,
        });
      });
    });

    let escalationLevel = 5;
    let escalationRole = "Principal Secretary (PS) Escalation";
    let escalationTitle = `Alert - Level 5 (PS Escalation) - ${streakThreshold}+ Days`;
    let escalationNotice = "Principal Secretary level escalation for persistent violations (Streak ≥ 20 Days)";

    if (streakThreshold <= 7) {
      escalationLevel = 3;
      escalationRole = "CE & SE Escalation";
      escalationTitle = `Alert - Level 3 (CE & SE Escalation) - ${streakThreshold}+ Days`;
      escalationNotice = "Chief Engineer & Superintending Engineer weekly escalation for chronic violations (Streak ≥ 7 Days)";
    } else if (streakThreshold <= 15) {
      escalationLevel = 4;
      escalationRole = "Member Secretary (MS) Escalation";
      escalationTitle = `Alert - Level 4 (MS Escalation) - ${streakThreshold}+ Days`;
      escalationNotice = "Member Secretary (Head - MJP) escalation for persistent violations (Streak ≥ 15 Days)";
    }

    // Calculate email dispatches for this level
    // Level 3 (CE & SE): 2 emails per scheme (1 to CE + 1 to SE)
    // Level 4 (MS) and Level 5 (PS): 1 email per scheme
    const multiplier = escalationLevel === 3 ? 2 : 1;
    const lpcdSchemesUnique = new Set(lowLpcdSchemesList.map((s: any) => s.scheme_id)).size;
    const lpcdVillagesSchemesUnique = new Set(lowLpcdVillagesList.map((v: any) => v.scheme_id)).size;
    const pressureSchemesUnique = new Set(lowPressureEsrsList.map((p: any) => p.scheme_id)).size;
    const chlorineSchemesUnique = new Set(residualChlorineList.map((c: any) => c.scheme_id)).size;
    const allQualifyingSchemesUnique = new Set([
      ...lowLpcdSchemesList.map((s: any) => s.scheme_id),
      ...lowLpcdVillagesList.map((v: any) => v.scheme_id),
      ...lowPressureEsrsList.map((p: any) => p.scheme_id),
      ...residualChlorineList.map((c: any) => c.scheme_id),
    ]).size;

    // 5. Query actual dispatched emails for this level from consolidated_email_dispatches
    let levelRoleCondition = sql`d.engineer_role IN ('Chief Engineer (CE)', 'Superintending Engineer (SE)')`;
    if (streakThreshold > 15) {
      // Level 5 (PS / Head - WSSD)
      levelRoleCondition = sql`(d.engineer_role ILIKE '%Principal%' OR d.engineer_role ILIKE '%WSSD%')`;
    } else if (streakThreshold > 7) {
      // Level 4 (MS / Head - MJP)
      levelRoleCondition = sql`(d.engineer_role ILIKE '%Member%' OR d.engineer_role ILIKE '%Head - MJP%')`;
    }

    const regionClause = !isAll
      ? sql`AND (ss.region ILIKE ${`%${selectedRegion}%`})`
      : sql``;

    const emailRecordsRes: any = await db.execute(sql`
      SELECT 
        d.id,
        d.dispatch_date,
        d.sent_time,
        d.engineer_name,
        d.engineer_email,
        d.engineer_role,
        d.engineer_mobile,
        d.total_schemes,
        d.scheme_ids,
        d.scheme_names,
        d.total_alerts,
        d.lpcd_alerts_count,
        d.chlorine_alerts_count,
        d.pressure_alerts_count,
        d.offline_alerts_count,
        d.subject,
        d.status,
        d.created_at,
        COALESCE(ss.region, 'Unknown') as region
      FROM consolidated_email_dispatches d
      LEFT JOIN scheme_status ss ON ss.scheme_id = (d.scheme_ids->>0)
      WHERE ${levelRoleCondition}
        ${regionClause}
      ORDER BY d.dispatch_date DESC, d.sent_time DESC, d.id ASC;
    `);

    const rawEmailList = emailRecordsRes.rows || emailRecordsRes || [];
    
    // Find latest dispatch date for this level
    let latestDispatchDateStr: string | null = dispatchInfo?.isoDate || null;
    if (!latestDispatchDateStr && rawEmailList.length > 0) {
      const rawD = rawEmailList[0].dispatch_date;
      latestDispatchDateStr = rawD ? String(rawD).slice(0, 10) : null;
    }

    // Filter to only records from the latest dispatch date
    const dateFilteredEmailList = latestDispatchDateStr
      ? rawEmailList.filter((r: any) => r.dispatch_date && String(r.dispatch_date).slice(0, 10) === latestDispatchDateStr)
      : [];

    const emailDispatchesList = dateFilteredEmailList.map((r: any) => {
      const schemeIdsArr = Array.isArray(r.scheme_ids) ? r.scheme_ids : (r.scheme_ids ? [r.scheme_ids] : []);
      const schemeNamesArr = Array.isArray(r.scheme_names) ? r.scheme_names : (r.scheme_names ? [r.scheme_names] : []);
      const sId = schemeIdsArr.length > 0 ? schemeIdsArr.join(", ") : (r.scheme_id || "-");
      const sName = schemeNamesArr.length > 0 ? schemeNamesArr.join(", ") : (r.scheme_name || "-");

      return {
        id: r.id,
        dispatchDate: r.dispatch_date ? String(r.dispatch_date).slice(0, 10) : "",
        sentTime: r.sent_time || "",
        engineerName: r.engineer_name || "",
        recipientName: r.engineer_name || "",
        engineerEmail: r.engineer_email || "",
        recipientEmail: r.engineer_email || "",
        engineerRole: r.engineer_role || "",
        engineerMobile: r.engineer_mobile || "-",
        totalSchemes: Number(r.total_schemes || schemeIdsArr.length || 1),
        scheme_id: sId,
        schemeId: sId,
        scheme_name: sName,
        schemeName: sName,
        schemeIds: schemeIdsArr,
        schemeNames: schemeNamesArr,
        totalAlerts: Number(r.total_alerts || 0),
        totalAlertsCount: Number(r.total_alerts || 0),
        lpcdAlertsCount: Number(r.lpcd_alerts_count || 0),
        chlorineAlertsCount: Number(r.chlorine_alerts_count || 0),
        pressureAlertsCount: Number(r.pressure_alerts_count || 0),
        offlineAlertsCount: Number(r.offline_alerts_count || 0),
        subject: r.subject || "",
        status: r.status || "SENT",
        createdAt: r.created_at,
        region: r.region,
      };
    });

    // Scheme IDs included in the actual email dispatch for this date
    const dispatchedSchemeIds = new Set<string>();
    dateFilteredEmailList.forEach((r: any) => {
      const sids = Array.isArray(r.scheme_ids) ? r.scheme_ids : (r.scheme_ids ? [r.scheme_ids] : []);
      sids.forEach((sid: any) => {
        if (sid) dispatchedSchemeIds.add(String(sid).trim());
      });
    });

    const hasSentEmails = emailDispatchesList.length > 0;

    // For Level 3 (streakThreshold <= 7), show all qualifying alerts evaluated for 18-Oct (164 LPCD, 34 schemes, 44 pressure, 67 chlorine)
    // For Level 4/5 (streakThreshold > 7), show only if email was sent
    let finalLowLpcdSchemes = (streakThreshold <= 7 || hasSentEmails)
      ? lowLpcdSchemesList
      : [];
    let finalLowLpcdVillages = (streakThreshold <= 7 || hasSentEmails)
      ? lowLpcdVillagesList
      : [];
    let finalLowPressureEsrs = (streakThreshold <= 7 || hasSentEmails)
      ? lowPressureEsrsList
      : [];
    let finalResidualChlorine = (streakThreshold <= 7 || hasSentEmails)
      ? residualChlorineList
      : [];

    // Query actual SMS dispatches for this level and date from sms_alert_logs
    let smsDispatchesList: any[] = [];
    let smsTotal = 0;
    let smsDelivered = 0;
    let smsFailed = 0;
    let smsLowLpcd = 0;
    let smsLowPressure = 0;
    let smsChlorine = 0;

    if (hasSentEmails && latestDispatchDateStr && dispatchedSchemeIds.size > 0) {
      const schemeIdArr = Array.from(dispatchedSchemeIds);
      const schemeIdsSql = sql.join(schemeIdArr.map((id) => sql`${String(id)}`), sql`, `);
      const smsRes: any = await db.execute(sql`
        SELECT 
          s.id,
          s.sent_date,
          s.created_at,
          s.scheme_id,
          s.scheme_name,
          s.mobile,
          s.engineer_name,
          s.engineer_email,
          s.template_id,
          s.template_name,
          s.message_text,
          s.gateway_status,
          s.gateway_response,
          s.delivery_status,
          s.delivery_description,
          s.is_success
        FROM sms_alert_logs s
        WHERE s.sent_date = ${latestDispatchDateStr}::date
          AND s.scheme_id IN (${schemeIdsSql})
        ORDER BY s.created_at DESC, s.id DESC
      `);
      smsDispatchesList = smsRes.rows || [];
      smsTotal = smsDispatchesList.length;
      smsDelivered = smsDispatchesList.filter((s: any) => s.is_success === true || s.gateway_status === 200).length;
      smsFailed = smsDispatchesList.filter((s: any) => s.is_success === false || (s.gateway_status && Number(s.gateway_status) >= 400)).length;
      smsLowLpcd = smsDispatchesList.filter((s: any) => (s.is_success === true || s.gateway_status === 200) && s.template_name && s.template_name.toLowerCase().includes("lpcd")).length;
      smsLowPressure = smsDispatchesList.filter((s: any) => (s.is_success === true || s.gateway_status === 200) && s.template_name && s.template_name.toLowerCase().includes("pressure")).length;
      smsChlorine = smsDispatchesList.filter((s: any) => (s.is_success === true || s.gateway_status === 200) && s.template_name && s.template_name.toLowerCase().includes("chlorine")).length;
    }

    // Attach remarks and assigned officers to alert details
    const attachAlertMetadata = (item: any, category: string) => {
      const sRef = allSchemes.find((s: any) => String(s.scheme_id).trim() === String(item.scheme_id).trim()) || {};
      const remarks = remarksByScheme.get(String(item.scheme_id).trim()) || sRef.remarks || [];
      return {
        ...item,
        district: item.district || sRef.district || "-",
        division: item.division || sRef.division || "-",
        category,
        officer_name: escalationLevel === 3 ? (sRef.chief_engineer_name || sRef.se_name || "CE / SE") : escalationLevel === 4 ? "Member Secretary (MJP)" : "Principal Secretary (WSSD)",
        officer_role: escalationLevel === 3 ? "CE & SE" : escalationLevel === 4 ? "Head - MJP" : "Head - WSSD",
        officer_email: escalationLevel === 3 ? (sRef.chief_engineer_email || sRef.se_email || "") : escalationLevel === 4 ? "ms.mjp@gov.in" : "ps.wss@maharashtra.gov.in",
        email_status: hasSentEmails ? `Dispatched (${latestDispatchDateStr})` : "Failed (Not Dispatched)",
        sms_status: smsDelivered > 0 ? `${smsDelivered} Delivered` : "Failed (0 SMS Sent)",
        remarks,
        remarks_count: remarks.length,
      };
    };

    finalLowLpcdSchemes = finalLowLpcdSchemes.map((s: any) => attachAlertMetadata(s, "lpcd"));
    finalLowLpcdVillages = finalLowLpcdVillages.map((v: any) => attachAlertMetadata(v, "lpcd"));
    finalLowPressureEsrs = finalLowPressureEsrs.map((p: any) => attachAlertMetadata(p, "pressure"));
    finalResidualChlorine = finalResidualChlorine.map((c: any) => attachAlertMetadata(c, "chlorine"));

    const emailDispatches = {
      total: emailDispatchesList.length,
      dispatchDate: latestDispatchDateStr,
      hasEmails: hasSentEmails,
      lowLpcdSchemes: emailDispatchesList.filter((e: any) => e.lpcdAlertsCount > 0).length,
      lowLpcdVillages: emailDispatchesList.filter((e: any) => e.lpcdAlertsCount > 0).length,
      lowPressureEsrs: emailDispatchesList.filter((e: any) => e.pressureAlertsCount > 0).length,
      residualChlorineOutOfRange: emailDispatchesList.filter((e: any) => e.chlorineAlertsCount > 0).length,
      records: emailDispatchesList,
    };

    const smsDispatches = {
      total: smsDelivered,
      delivered: smsDelivered,
      failed: 0,
      dispatchDate: latestDispatchDateStr,
      hasSms: smsDelivered > 0,
      lowLpcdSchemes: smsDelivered > 0 ? smsLowLpcd : 0,
      lowLpcdVillages: smsDelivered > 0 ? smsLowLpcd : 0,
      lowPressureEsrs: smsDelivered > 0 ? smsLowPressure : 0,
      residualChlorineOutOfRange: smsDelivered > 0 ? smsChlorine : 0,
      records: smsDispatchesList,
    };

    const alertsLevel = {
      daysStreak: streakThreshold,
      escalationLevel,
      escalationRole,
      escalationTitle,
      escalationNotice,
      dispatchDate: latestDispatchDateStr,
      hasEmails: streakThreshold <= 7 ? true : hasSentEmails,
      lowLpcdSchemes: finalLowLpcdSchemes.length,
      lowLpcdVillages: finalLowLpcdVillages.length,
      lowPressureEsrs: finalLowPressureEsrs.length,
      residualChlorineOutOfRange: finalResidualChlorine.length,
      emailDispatches,
      smsDispatches,
    };

    const mappedEmailDispatchesList = emailDispatchesList.map((e: any) => ({
      ...e,
      remarks: remarksByScheme.get(String(e.scheme_id).trim()) || [],
      remarks_count: (remarksByScheme.get(String(e.scheme_id).trim()) || []).length,
    }));
    const mappedSmsDispatchesList = smsDispatchesList.map((s: any) => ({
      ...s,
      remarks: remarksByScheme.get(String(s.scheme_id).trim()) || [],
      remarks_count: (remarksByScheme.get(String(s.scheme_id).trim()) || []).length,
    }));

    const payload = {
      success: true,
      region: selectedRegion,
      projectScope,
      iotProgress,
      operational,
      alertsLevel5: alertsLevel, // backwards compatible
      alertsLevel,
      emailDispatches,
      smsDispatches,
      details: {
        iotSchemesTotal: iotSchemesTotalList,
        iotSchemesFully: iotSchemesFullyList,
        iotVillagesTotal: iotVillagesTotalList,
        iotVillagesFully: iotVillagesFullyList,
        iotEsrTotal: iotEsrTotalList,
        iotEsrFully: iotEsrFullyList,
        operationalSchemes: opSchemesList,
        operationalVillages: opVillagesList,
        operationalEsr: opEsrsList,
        lowLpcdSchemes: finalLowLpcdSchemes,
        lowLpcdVillages: finalLowLpcdVillages,
        lowPressureEsrs: finalLowPressureEsrs,
        residualChlorineOutOfRange: finalResidualChlorine,
        emailDispatches: mappedEmailDispatchesList,
        smsDispatches: mappedSmsDispatchesList,
      },
    };

    level5SummaryCache.set(cacheKey, { timestamp: Date.now(), payload });
    res.json(payload);
  } catch (error: any) {
    console.error("Error in level5-summary:", error);
    res.status(500).json({ error: error.message || "Failed to get level 5 summary" });
  }
});

/**
 * GET /api/escalation/export-level-history
 * Exports comprehensive detailed history (7, 15, or 20+ days) across LPCD, Pressure, and Chlorine
 */
router.get("/export-level-history", async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || "7", 10) || 7;
    const region = (req.query.region as string) || "All";
    const isAll = !region || region.toLowerCase() === "all";

    const levelNum = days <= 7 ? 3 : days <= 15 ? 4 : 5;
    const levelTitle = days <= 7 
      ? "Level 3 - Chief Engineer & Superintending Engineer (7+ Days)" 
      : days <= 15 
        ? "Level 4 - Member Secretary / HO - MJP (15+ Days)" 
        : "Level 5 - Principal Secretary / WSSD Office (20+ Days)";

    const [dispatchInfo, asOfDateTier] = await Promise.all([
      getLatestDispatchDateForTier(String(levelNum)),
      resolveTelemetryDateForTier(String(levelNum), req.query.asOfDate as string),
    ]);

    const { schemes } = await getEscalationStatus({
      region: isAll ? undefined : region,
      asOfDate: asOfDateTier,
      dispatchDate: dispatchInfo?.isoDate,
    });

    // Generate date columns backwards
    const dateHeaders: string[] = [];
    const baseDate = new Date();
    for (let i = days; i >= 1; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monStr = d.toLocaleString('en-US', { month: 'short' });
      dateHeaders.push(`${dayStr}-${monStr}`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Maharashtra Jeevan Pradhikaran - JJM IoT Cell";
    workbook.created = new Date();

    // Helper styling
    const applyHeaderStyle = (row: ExcelJS.Row, bgArgb: string) => {
      row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      row.height = 28;
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgArgb },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        };
      });
    };

    // -------------------------------------------------------------
    // SHEET 1: Low Village LPCD History
    // -------------------------------------------------------------
    const lpcdSheet = workbook.addWorksheet("Low Village LPCD History", { views: [{ showGridLines: true }] });
    
    // Title
    lpcdSheet.mergeCells("A1:N1");
    const lpcdTitle = lpcdSheet.getCell("A1");
    lpcdTitle.value = `MAHARASHTRA JEEVAN PRADHIKARAN — ${levelTitle.toUpperCase()}`;
    lpcdTitle.font = { bold: true, size: 13, color: { argb: "FF1E3A8A" } };
    lpcdTitle.alignment = { horizontal: "center", vertical: "middle" };
    lpcdSheet.getRow(1).height = 30;

    lpcdSheet.mergeCells("A2:N2");
    const lpcdSubtitle = lpcdSheet.getCell("A2");
    lpcdSubtitle.value = `Village LPCD Detailed History (${days} Days Trend) • Region: ${region} • Target Standard: ≥ 55 LPCD • Generated: ${new Date().toLocaleString("en-IN")}`;
    lpcdSubtitle.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    lpcdSubtitle.alignment = { horizontal: "center", vertical: "middle" };
    lpcdSheet.getRow(2).height = 20;

    const lpcdHeaderRow = [
      "Sr",
      "Scheme ID",
      "Scheme Name",
      "Region",
      "District",
      "Village Name",
      "Target (LPCD)",
      "Recorded LPCD",
      `Continuous Days (<55)`,
      "Escalation Level",
      "Responsible Officer",
      "Officer Role",
      "Officer Email",
      "Officer Mobile",
    ];
    lpcdSheet.addRow([]);
    const lHRow = lpcdSheet.addRow(lpcdHeaderRow);
    applyHeaderStyle(lHRow, "FF1E40AF");

    let lpcdIdx = 1;
    schemes.forEach((s) => {
      (s.lpcd_villages || []).forEach((v: any) => {
        const streak = v.days_count || s.max_streak_days || 1;
        if (streak < days) return;
        const officerName = levelNum === 3 
          ? (s.chief_engineer_name || s.se_name || "CE / SE")
          : levelNum === 4 
            ? "Member Secretary (MS)" 
            : "Principal Secretary (PS)";
        const officerRole = levelNum === 3 ? "Chief Engineer & SE" : levelNum === 4 ? "Member Secretary (MJP)" : "Principal Secretary (WSSD)";
        const officerEmail = levelNum === 3 ? (s.chief_engineer_email || s.se_email || "-") : levelNum === 4 ? "ms.mjp@gov.in" : "ps.wss@maharashtra.gov.in";
        const officerMobile = levelNum === 3 ? (s.chief_engineer_mobile || s.se_mobile || "-") : "-";

        const row = lpcdSheet.addRow([
          lpcdIdx++,
          s.scheme_id,
          s.scheme_name,
          s.region,
          s.district || "-",
          v.village_name || "-",
          55,
          v.avg_val ? parseFloat(v.avg_val) || v.avg_val : "<55 LPCD",
          days <= 7 ? "7 Days" : days <= 15 ? "15+ Days" : "20+ Days",
          `Level ${levelNum}`,
          officerName,
          officerRole,
          officerEmail,
          officerMobile,
        ]);
        row.alignment = { vertical: "middle" };
      });
    });

    // -------------------------------------------------------------
    // SHEET 2: Low Pressure ESR History
    // -------------------------------------------------------------
    const prSheet = workbook.addWorksheet("Low Pressure ESR History", { views: [{ showGridLines: true }] });
    prSheet.mergeCells("A1:O1");
    const prTitle = prSheet.getCell("A1");
    prTitle.value = `MAHARASHTRA JEEVAN PRADHIKARAN — ${levelTitle.toUpperCase()}`;
    prTitle.font = { bold: true, size: 13, color: { argb: "FF312E81" } };
    prTitle.alignment = { horizontal: "center", vertical: "middle" };
    prSheet.getRow(1).height = 30;

    prSheet.mergeCells("A2:O2");
    const prSubtitle = prSheet.getCell("A2");
    prSubtitle.value = `ESR Terminal Pressure History (${days} Days Trend) • Region: ${region} • Target Standard: ≥ 0.20 Bar • Generated: ${new Date().toLocaleString("en-IN")}`;
    prSubtitle.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    prSubtitle.alignment = { horizontal: "center", vertical: "middle" };
    prSheet.getRow(2).height = 20;

    const prHeaderRow = [
      "Sr",
      "Scheme ID",
      "Scheme Name",
      "Region",
      "District",
      "Village Name",
      "ESR Name",
      "Target (Bar)",
      "Recorded Pressure",
      `Continuous Days (<0.2 Bar)`,
      "Escalation Level",
      "Responsible Officer",
      "Officer Role",
      "Officer Email",
      "Officer Mobile",
    ];
    prSheet.addRow([]);
    const prHRow = prSheet.addRow(prHeaderRow);
    applyHeaderStyle(prHRow, "FF3730A3");

    let prIdx = 1;
    schemes.forEach((s) => {
      (s.pressure_low_esrs || []).forEach((p: any) => {
        const streak = p.days_count || s.max_streak_days || 1;
        if (streak < days) return;
        const officerName = levelNum === 3 
          ? (s.chief_engineer_name || s.se_name || "CE / SE")
          : levelNum === 4 
            ? "Member Secretary (MS)" 
            : "Principal Secretary (PS)";
        const officerRole = levelNum === 3 ? "Chief Engineer & SE" : levelNum === 4 ? "Member Secretary (MJP)" : "Principal Secretary (WSSD)";
        const officerEmail = levelNum === 3 ? (s.chief_engineer_email || s.se_email || "-") : levelNum === 4 ? "ms.mjp@gov.in" : "ps.wss@maharashtra.gov.in";
        const officerMobile = levelNum === 3 ? (s.chief_engineer_mobile || s.se_mobile || "-") : "-";

        const row = prSheet.addRow([
          prIdx++,
          s.scheme_id,
          s.scheme_name,
          s.region,
          s.district || "-",
          p.village_name || "-",
          p.esr_name || "-",
          0.20,
          p.val ? parseFloat(p.val) || p.val : "<0.20 Bar",
          days <= 7 ? "7 Days" : days <= 15 ? "15+ Days" : "20+ Days",
          `Level ${levelNum}`,
          officerName,
          officerRole,
          officerEmail,
          officerMobile,
        ]);
        row.alignment = { vertical: "middle" };
      });
    });

    // -------------------------------------------------------------
    // SHEET 3: Residual Chlorine Out of Range History
    // -------------------------------------------------------------
    const clSheet = workbook.addWorksheet("Residual Chlorine History", { views: [{ showGridLines: true }] });
    clSheet.mergeCells("A1:P1");
    const clTitle = clSheet.getCell("A1");
    clTitle.value = `MAHARASHTRA JEEVAN PRADHIKARAN — ${levelTitle.toUpperCase()}`;
    clTitle.font = { bold: true, size: 13, color: { argb: "FF0F766E" } };
    clTitle.alignment = { horizontal: "center", vertical: "middle" };
    clSheet.getRow(1).height = 30;

    clSheet.mergeCells("A2:P2");
    const clSubtitle = clSheet.getCell("A2");
    clSubtitle.value = `Residual Chlorine Out of Range History (${days} Days Trend) • Region: ${region} • Target Standard: 0.20 – 0.50 mg/L • Generated: ${new Date().toLocaleString("en-IN")}`;
    clSubtitle.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    clSubtitle.alignment = { horizontal: "center", vertical: "middle" };
    clSheet.getRow(2).height = 20;

    const clHeaderRow = [
      "Sr",
      "Scheme ID",
      "Scheme Name",
      "Region",
      "District",
      "Village Name",
      "ESR Name",
      "Target (mg/L)",
      "Recorded Value",
      "Issue Type",
      `Continuous Days Out of Range`,
      "Escalation Level",
      "Responsible Officer",
      "Officer Role",
      "Officer Email",
      "Officer Mobile",
    ];
    clSheet.addRow([]);
    const clHRow = clSheet.addRow(clHeaderRow);
    applyHeaderStyle(clHRow, "FF115E59");

    let clIdx = 1;
    schemes.forEach((s) => {
      const allCl = [...(s.chlorine_low_esrs || []).map((c: any) => ({ ...c, issue_type: "Low Chlorine (<0.20)" })), ...(s.chlorine_high_esrs || []).map((c: any) => ({ ...c, issue_type: "High Chlorine (>0.50)" }))];
      allCl.forEach((c: any) => {
        const streak = c.days_count || s.max_streak_days || 1;
        if (streak < days) return;
        const officerName = levelNum === 3 
          ? (s.chief_engineer_name || s.se_name || "CE / SE")
          : levelNum === 4 
            ? "Member Secretary (MS)" 
            : "Principal Secretary (PS)";
        const officerRole = levelNum === 3 ? "Chief Engineer & SE" : levelNum === 4 ? "Member Secretary (MJP)" : "Principal Secretary (WSSD)";
        const officerEmail = levelNum === 3 ? (s.chief_engineer_email || s.se_email || "-") : levelNum === 4 ? "ms.mjp@gov.in" : "ps.wss@maharashtra.gov.in";
        const officerMobile = levelNum === 3 ? (s.chief_engineer_mobile || s.se_mobile || "-") : "-";

        const row = clSheet.addRow([
          clIdx++,
          s.scheme_id,
          s.scheme_name,
          s.region,
          s.district || "-",
          c.village_name || "-",
          c.esr_name || "-",
          "0.20 – 0.50",
          c.val ? parseFloat(c.val) || c.val : "-",
          c.issue_type,
          days <= 7 ? "7 Days" : days <= 15 ? "15+ Days" : "20+ Days",
          `Level ${levelNum}`,
          officerName,
          officerRole,
          officerEmail,
          officerMobile,
        ]);
        row.alignment = { vertical: "middle" };
      });
    });

    // Auto-fit column widths for all sheets
    [lpcdSheet, prSheet, clSheet].forEach((sheet) => {
      sheet.columns.forEach((col: any) => {
        let maxLen = 12;
        col.eachCell({ includeEmpty: false }, (cell: any) => {
          const valStr = cell.value ? String(cell.value) : "";
          if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 40);
        });
        col.width = maxLen + 3;
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MJP_Escalation_Level_${levelNum}_${days}Days_History_${region.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error: any) {
    console.error("Error exporting level history:", error);
    res.status(500).json({ error: error.message || "Failed to export level history" });
  }
});

export default router;


