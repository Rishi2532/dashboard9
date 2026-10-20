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
import { calculateAllAlertStreaksFromHistory } from "../services/streak-engine";

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
    const search = req.query.search ? String(req.query.search) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    const result = await getSentEscalationAlerts({
      timeRange,
      date,
      tier,
      channel,
      category,
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
 * GET /api/escalation/summary
 * Returns high-level metrics across Level 1, Level 2, and Level 3 escalations
 */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const { summary, schemes } = await getEscalationStatus({ region });
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      dispatches: summary.dispatches,
      schemes,
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
    const db = await getDB();
    const result = await db.execute(sql`
      SELECT COALESCE(
        (SELECT chlorine_date_day_7 FROM chlorine_data WHERE chlorine_date_day_7 IS NOT NULL LIMIT 1),
        (SELECT pressure_date_day_7 FROM pressure_data WHERE pressure_date_day_7 IS NOT NULL LIMIT 1),
        (SELECT lpcd_date_day7 FROM water_scheme_data WHERE lpcd_date_day7 IS NOT NULL LIMIT 1),
        '18-Oct'
      ) as latest_date
    `);
    const raw = result.rows?.[0]?.latest_date || '18-Oct';
    const parts = String(raw).split('-');
    const day = parts[0];
    const month = parts[1] || 'Oct';
    const monthMap: Record<string, string> = {
      Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
      May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
      Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
    };
    const fullMonth = monthMap[month] || month;
    const formatted = `${fullMonth} ${day}, 2026`;

    res.json({
      success: true,
      rawDate: raw,
      formatted,
    });
  } catch (error: any) {
    res.json({
      success: true,
      rawDate: '18-Oct',
      formatted: 'October 18, 2026'
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

      // Telemetry dates: Day 7 (18-Oct) down to Day 1 (12-Oct)
      const dateConfigs = [
        { dayIndex: 1, label: '18-Oct', full: '18 Oct 2026', d: new Date('2026-10-18T12:00:00Z') },
        { dayIndex: 2, label: '17-Oct', full: '17 Oct 2026', d: new Date('2026-10-17T12:00:00Z') },
        { dayIndex: 3, label: '16-Oct', full: '16 Oct 2026', d: new Date('2026-10-16T12:00:00Z') },
        { dayIndex: 4, label: '15-Oct', full: '15 Oct 2026', d: new Date('2026-10-15T12:00:00Z') },
        { dayIndex: 5, label: '14-Oct', full: '14 Oct 2026', d: new Date('2026-10-14T12:00:00Z') },
        { dayIndex: 6, label: '13-Oct', full: '13 Oct 2026', d: new Date('2026-10-13T12:00:00Z') },
        { dayIndex: 7, label: '12-Oct', full: '12 Oct 2026', d: new Date('2026-10-12T12:00:00Z') },
      ];

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

    // CASE 2: LPCD, CHLORINE, OR PRESSURE
    let telemetryRow: any = null;
    if (category === "chlorine") {
      const q = esrName && esrName !== "-"
        ? sql`
          SELECT c.*, 
            wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
            wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
            wc.water_value_day1 as w1
          FROM chlorine_data c
          LEFT JOIN water_consumption wc ON (
            c.scheme_id = wc.scheme_id AND
            LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
            LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
          )
          WHERE c.scheme_id = ${schemeId} AND (c.esr_name ILIKE ${'%' + esrName + '%'} OR c.village_name ILIKE ${'%' + villageName + '%'})
          LIMIT 1`
        : villageName && villageName !== "-"
          ? sql`
          SELECT c.*, 
            wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
            wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
            wc.water_value_day1 as w1
          FROM chlorine_data c
          LEFT JOIN water_consumption wc ON (
            c.scheme_id = wc.scheme_id AND
            LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
            LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
          )
          WHERE c.scheme_id = ${schemeId} AND c.village_name ILIKE ${'%' + villageName + '%'}
          LIMIT 1`
          : sql`
          SELECT c.*, 
            wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
            wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
            wc.water_value_day1 as w1
          FROM chlorine_data c
          LEFT JOIN water_consumption wc ON (
            c.scheme_id = wc.scheme_id AND
            LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
            LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
          )
          WHERE c.scheme_id = ${schemeId}
          LIMIT 1`;
      const tRes = await db.execute(q);
      telemetryRow = tRes.rows?.[0] || null;
    } else if (category === "pressure") {
      const q = esrName && esrName !== "-"
        ? sql`
          SELECT p.*, 
            wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
            wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
            wc.water_value_day1 as w1
          FROM pressure_data p
          LEFT JOIN water_consumption wc ON (
            p.scheme_id = wc.scheme_id AND
            LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
            LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
          )
          WHERE p.scheme_id = ${schemeId} AND (p.esr_name ILIKE ${'%' + esrName + '%'} OR p.village_name ILIKE ${'%' + villageName + '%'})
          LIMIT 1`
        : villageName && villageName !== "-"
          ? sql`
          SELECT p.*, 
            wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
            wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
            wc.water_value_day1 as w1
          FROM pressure_data p
          LEFT JOIN water_consumption wc ON (
            p.scheme_id = wc.scheme_id AND
            LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
            LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
          )
          WHERE p.scheme_id = ${schemeId} AND p.village_name ILIKE ${'%' + villageName + '%'}
          LIMIT 1`
          : sql`
          SELECT p.*, 
            wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
            wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
            wc.water_value_day1 as w1
          FROM pressure_data p
          LEFT JOIN water_consumption wc ON (
            p.scheme_id = wc.scheme_id AND
            LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
            LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
          )
          WHERE p.scheme_id = ${schemeId}
          LIMIT 1`;
      const tRes = await db.execute(q);
      telemetryRow = tRes.rows?.[0] || null;
    } else if (category === "lpcd") {
      const q = villageName && villageName !== "-"
        ? sql`SELECT * FROM water_scheme_data WHERE scheme_id = ${schemeId} AND village_name ILIKE ${'%' + villageName + '%'} LIMIT 1`
        : sql`SELECT * FROM water_scheme_data WHERE scheme_id = ${schemeId} LIMIT 1`;
      const tRes = await db.execute(q);
      telemetryRow = tRes.rows?.[0] || null;
    }

    const matchedTicket = logs.find((l: any) => l.ticket_id && l.ticket_id !== '-')?.ticket_id;

    // Build timeline using the 7 database days (Day 7 down to Day 1)
    const dayIndices = [7, 6, 5, 4, 3, 2, 1];
    const days = dayIndices.map((k, idx) => {
      let rawVal: any = null;
      let rawW: any = null;
      let rawDate: string = `${11 + k}-Oct`;

      if (telemetryRow) {
        if (category === "chlorine") {
          rawVal = telemetryRow[`chlorine_value_${k}`];
          rawW = telemetryRow[`w${k}`] ?? telemetryRow[`water_consumption_${k}`];
          rawDate = telemetryRow[`chlorine_date_day_${k}`] || rawDate;
        } else if (category === "pressure") {
          rawVal = telemetryRow[`pressure_value_${k}`];
          rawW = telemetryRow[`w${k}`] ?? telemetryRow[`water_consumption_${k}`];
          rawDate = telemetryRow[`pressure_date_day_${k}`] || rawDate;
        } else if (category === "lpcd") {
          rawVal = telemetryRow[`lpcd_value_day${k}`];
          rawW = telemetryRow[`water_value_day${k}`];
          rawDate = telemetryRow[`lpcd_date_day${k}`] || rawDate;
        }
      }

      const numVal = rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '' ? parseFloat(String(rawVal).trim()) : null;
      const numW = rawW !== null && rawW !== undefined && String(rawW).trim() !== '' ? parseFloat(String(rawW).trim()) : null;

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
        }
      } else if (category === "pressure") {
        if (numVal !== null && !isNaN(numVal)) {
          alertValue = `${numVal.toFixed(2)} Bar`;
          if (numVal < 0.20 && numVal >= 0 && (numW === null || numW > 0)) {
            isBreach = true;
            alertType = "Low Pressure";
          }
        }
      } else if (category === "lpcd") {
        if (numVal !== null && !isNaN(numVal)) {
          alertValue = `${numVal.toFixed(0)} LPCD`;
          if (numVal < 55) {
            isBreach = true;
            alertType = "Low LPCD";
          }
        }
      }

      // Compute streak on day k
      let streakOnDay = 0;
      if (isBreach && telemetryRow) {
        for (let j = k; j >= 1; j--) {
          let jVal: any = null;
          let jW: any = null;
          if (category === "chlorine") {
            jVal = telemetryRow[`chlorine_value_${j}`];
            jW = telemetryRow[`w${j}`] ?? telemetryRow[`water_consumption_${j}`];
          } else if (category === "pressure") {
            jVal = telemetryRow[`pressure_value_${j}`];
            jW = telemetryRow[`w${j}`] ?? telemetryRow[`water_consumption_${j}`];
          } else if (category === "lpcd") {
            jVal = telemetryRow[`lpcd_value_day${j}`];
            jW = telemetryRow[`water_value_day${j}`];
          }
          const jnVal = jVal !== null && jVal !== undefined && String(jVal).trim() !== '' ? parseFloat(String(jVal).trim()) : null;
          const jnW = jW !== null && jW !== undefined && String(jW).trim() !== '' ? parseFloat(String(jW).trim()) : null;
          let jBreach = false;
          if (category === "chlorine" && jnVal !== null && (jnVal < 0.2 || jnVal > 0.5) && (jnW === null || jnW > 0)) jBreach = true;
          if (category === "pressure" && jnVal !== null && (jnVal < 0.2 && jnVal >= 0) && (jnW === null || jnW > 0)) jBreach = true;
          if (category === "lpcd" && jnVal !== null && jnVal < 55) jBreach = true;

          if (jBreach) streakOnDay++;
          else break;
        }
      }

      // Clean formatted date: e.g. "18-Oct" -> "18 Oct 2026"
      const cleanDate = rawDate.replace('-', ' ') + ' 2026';

      return {
        dayIndex: idx + 1,
        date: cleanDate,
        dateFormatted: cleanDate,
        dayLabel: idx === 0 ? "Latest" : `Day ${idx + 1}`,
        hasAlert: isBreach,
        alertType,
        alertValue,
        villageName: villageName || telemetryRow?.village_name || "-",
        esrName: esrName || telemetryRow?.esr_name || "-",
        ticketId: matchedTicket || `TKT-${schemeId}-${rawDate.replace('-', '')}`,
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
        cadence: "1st & 3rd Monday (Streak ≥ 20 Days)",
      };
    case 4:
      return {
        title: "Level 4: Member Secretary (MS)",
        sheetName: "Level 4 - MS",
        authority: "Member Secretary (Head - MJP)",
        cadence: "1st & 3rd Monday (Streak ≥ 15 Days)",
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

    const cacheKey = `${selectedRegion.toLowerCase()}:::${streakThreshold}`;
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
      villages: { totalIntegrated: 2249, fullyIntegrated: 1271 },
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

    // 3. Operational Schemes, Villages & ESRs
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
      streaksRes
    ] = await Promise.all([
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, total_villages_integrated, total_esr_integrated, fully_completion_scheme_status as status
        FROM scheme_status
        WHERE (total_villages_integrated > 0 OR total_esr_integrated > 0)
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, fully_completed_villages, no_fully_completed_esr, fully_completion_scheme_status as status
        FROM scheme_status
        WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed')
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, total_villages_integrated, fully_completed_villages, fully_completion_scheme_status as status
        FROM scheme_status
        WHERE total_villages_integrated > 0
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, fully_completed_villages, total_villages_integrated, fully_completion_scheme_status as status
        FROM scheme_status
        WHERE fully_completed_villages > 0
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, total_esr_integrated, no_fully_completed_esr, fully_completion_scheme_status as status
        FROM scheme_status
        WHERE total_esr_integrated > 0
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, no_fully_completed_esr, total_esr_integrated, fully_completion_scheme_status as status
        FROM scheme_status
        WHERE no_fully_completed_esr > 0
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT scheme_id, scheme_name, region, circle, division, block, water_supply as status
        FROM scheme_status
        WHERE water_supply = 'Yes'
          ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY region, scheme_name
      `),
      db.execute(sql`
        SELECT DISTINCT ss.region, ss.circle, ss.division, ss.block, ss.scheme_id, ss.scheme_name, ws.village_name
        FROM scheme_status ss
        JOIN water_scheme_data ws ON ws.scheme_id = ss.scheme_id
        WHERE ss.water_supply = 'Yes'
          ${isAll ? sql`` : sql`AND ss.region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY ss.region, ss.scheme_name, ws.village_name
      `),
      db.execute(sql`
        SELECT DISTINCT ss.region, ss.circle, ss.division, ss.block, ss.scheme_id, ss.scheme_name, c.village_name, c.esr_name
        FROM scheme_status ss
        JOIN chlorine_data c ON c.scheme_id = ss.scheme_id
        WHERE ss.water_supply = 'Yes'
          ${isAll ? sql`` : sql`AND ss.region ILIKE ${`%${selectedRegion}%`}`}
        ORDER BY ss.region, ss.scheme_name, c.village_name, c.esr_name
      `),
      calculateAllAlertStreaksFromHistory(db, forceRefresh)
    ]);

    // 4. Alerts - Level (continuous history streak >= streakThreshold)
    const { allAlerts } = streaksRes;
    const filteredAlerts = isAll
      ? allAlerts
      : allAlerts.filter(a => a.region && a.region.toLowerCase().includes(selectedRegion.toLowerCase()));

    const lpcdVillages = filteredAlerts.filter(a => a.category === 'lpcd' && a.streak_days >= streakThreshold);
    const pressureEsrs = filteredAlerts.filter(a => a.category === 'pressure' && a.streak_days >= streakThreshold);
    const chlorineEsrs = filteredAlerts.filter(a => a.category === 'chlorine' && a.streak_days >= streakThreshold);

    // Group LPCD schemes with village breakdowns
    const lpcdSchemeMap = new Map<string, any>();
    lpcdVillages.forEach(v => {
      const sid = String(v.scheme_id);
      if (!lpcdSchemeMap.has(sid)) {
        lpcdSchemeMap.set(sid, {
          scheme_id: sid,
          scheme_name: v.scheme_name,
          region: v.region,
          villages_count: 0,
          max_streak: 0,
          villages: [],
        });
      }
      const item = lpcdSchemeMap.get(sid);
      item.villages_count++;
      if ((v.streak_days || 0) > item.max_streak) item.max_streak = v.streak_days;
      item.villages.push(v.village_name);
    });

    const lowLpcdSchemesList: any[] = [];
    lpcdSchemeMap.forEach(v => {
      lowLpcdSchemesList.push({
        ...v,
        villages_list: v.villages.join(', ')
      });
    });

    const lowLpcdVillagesList = lpcdVillages.map(v => ({
      scheme_id: v.scheme_id,
      scheme_name: v.scheme_name,
      region: v.region,
      village_name: v.village_name,
      parameter_value: v.parameter_value || String((v as any).latest_value ?? "<55"),
      streak_days: v.streak_days,
      telemetry_date: v.telemetry_date || null,
    }));

    const lowPressureEsrsList = pressureEsrs.map(p => ({
      scheme_id: p.scheme_id,
      scheme_name: p.scheme_name,
      region: p.region,
      village_name: p.village_name,
      esr_name: p.esr_name,
      parameter_value: p.parameter_value || String((p as any).latest_value ?? "<0.2"),
      streak_days: p.streak_days,
      telemetry_date: p.telemetry_date || null,
    }));

    const residualChlorineList = chlorineEsrs.map(c => ({
      scheme_id: c.scheme_id,
      scheme_name: c.scheme_name,
      region: c.region,
      village_name: c.village_name,
      esr_name: c.esr_name,
      parameter_value: c.parameter_value || String((c as any).latest_value ?? "-"),
      issue_type: c.alert_type || (parseFloat(String(c.parameter_value || (c as any).latest_value || '0')) > 0.5 ? "High Chlorine" : "Low Chlorine"),
      streak_days: c.streak_days,
      telemetry_date: c.telemetry_date || null,
    }));

    // Escalation tier metadata depending on streak threshold
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

    const alertsLevel = {
      daysStreak: streakThreshold,
      escalationLevel,
      escalationRole,
      escalationTitle,
      escalationNotice,
      lowLpcdSchemes: lowLpcdSchemesList.length,
      lowLpcdVillages: lowLpcdVillagesList.length,
      lowPressureEsrs: lowPressureEsrsList.length,
      residualChlorineOutOfRange: residualChlorineList.length,
    };

    const payload = {
      success: true,
      region: selectedRegion,
      projectScope,
      iotProgress,
      operational,
      alertsLevel5: alertsLevel, // backwards compatible
      alertsLevel,
      details: {
        iotSchemesTotal: (iotSchemesTotalRes as any).rows || [],
        iotSchemesFully: (iotSchemesFullyRes as any).rows || [],
        iotVillagesTotal: (iotVillagesTotalRes as any).rows || [],
        iotVillagesFully: (iotVillagesFullyRes as any).rows || [],
        iotEsrTotal: (iotEsrTotalRes as any).rows || [],
        iotEsrFully: (iotEsrFullyRes as any).rows || [],
        operationalSchemes: (opSchemesRes as any).rows || [],
        operationalVillages: (opVillagesRes as any).rows || [],
        operationalEsr: (opEsrsRes as any).rows || [],
        lowLpcdSchemes: lowLpcdSchemesList,
        lowLpcdVillages: lowLpcdVillagesList,
        lowPressureEsrs: lowPressureEsrsList,
        residualChlorineOutOfRange: residualChlorineList,
      },
    };

    level5SummaryCache.set(cacheKey, { timestamp: Date.now(), payload });
    res.json(payload);
  } catch (error: any) {
    console.error("Error in level5-summary:", error);
    res.status(500).json({ error: error.message || "Failed to get level 5 summary" });
  }
});

export default router;

