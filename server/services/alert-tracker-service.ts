import { getDB } from "../db";
import { sql } from "drizzle-orm";
import cron from "node-cron";
import { sendSmartpingDLTSMS, DLT_TEMPLATES, formatSchemeName, formatVillageName, formatVillageAndEsr } from "./sms-service";
import { sendEmail } from "./email-service";
import { getFilteredSchemeIds } from "../routes/filter-utils";

export interface AlertTrackerItem {
  id?: number;
  alert_key: string;
  scheme_id: string;
  scheme_name: string;
  village_name?: string;
  reservoir_name?: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  alert_type: "LPCD" | "Pressure" | "Chlorine";
  original_alert_date: string;
  recipient_designation: string; // 'Village Operator' or 'Executive Engineer'
  recipient_name: string;
  recipient_contact: string;
  recipient_email?: string;
  notification_channel: "SMS" | "Email";
  message_text?: string;
  operator_message_text?: string;
  ee_message_text?: string;
  reading_value: string;
  delivery_status: string;
  resolution_status: "ACTIVE" | "UNRESOLVED" | "RESOLVED";
  escalated_to_ee: boolean;
  unresolved_since?: string;
  escalation_date?: string;
  sent_date: string;
  sent_at?: string;
  operator_name?: string;
  operator_number?: string;
  ee_name?: string;
  ee_number?: string;
  ee_email?: string;
  chief_se_name?: string;
  chief_se_number?: string;
  operated_by?: string;
  remarks_list?: any[];
  remarks_count?: number;
  email_sent?: boolean;
  sms_sent?: boolean;
  ee_dispatch_date?: string;
  water_value?: number | string;
  val_latest?: number | null;
  val_today?: number | null;
  val_next?: number | null;
  fully_completion_scheme_status?: string;
  is_connected?: string;
  status?: string;
  connected_villages?: number;
  connected_esrs?: number;
}

export interface AlertCategorySummary {
  reported: number; // Alerts for Selected Date
  unresolved: number | string; // Repeated from next day or pending text
  unresolvedEE: number | string; // Escalated to Executive Engineer or pending text
  unresolvedSince: string; // "Since Yesterday" or date
  resolved: number | string;
  unresolvedTillDate: number | string;
  unresolvedTillDateItems?: AlertTrackerItem[];
  subsequentResolved?: number | string;
  subsequentResolvedItems?: AlertTrackerItem[];
  items: AlertTrackerItem[];
  resolvedItems?: AlertTrackerItem[];
  unresolvedItems: AlertTrackerItem[];
  escalatedEEItems: AlertTrackerItem[];
  isNextDayAvailable?: boolean;
  isCol4Available?: boolean;
}

export interface AlertTrackerMetricsResult {
  lpcd: AlertCategorySummary;
  pressure: AlertCategorySummary;
  chlorine: AlertCategorySummary;
  total: {
    reported: number;
    unresolved: number | string;
    unresolvedEE: number | string;
    resolved: number;
    unresolvedSince: string;
    unresolvedTillDate?: number | string;
    subsequentResolved?: number | string;
  };
  dateMeta?: any;
}

let lastCronRunAt: string | null = null;
let lastCronResult: any = null;
let isCronRunning = false;
let isTableInitialized = false;

/**
 * Ensures alert_tracker_logs table and indexes exist
 */
export async function ensureAlertTrackerTables() {
  if (isTableInitialized) return;
  try {
    const db = await getDB();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alert_tracker_logs (
        id SERIAL PRIMARY KEY,
        alert_key VARCHAR(255) NOT NULL,
        scheme_id VARCHAR(100) NOT NULL,
        scheme_name VARCHAR(255),
        alert_type VARCHAR(50) NOT NULL,
        region VARCHAR(100),
        circle VARCHAR(100),
        division VARCHAR(100),
        sub_division VARCHAR(100),
        block VARCHAR(100),
        village_name VARCHAR(255),
        reservoir_name VARCHAR(255),
        original_alert_date DATE NOT NULL,
        recipient_designation VARCHAR(100) NOT NULL,
        recipient_name VARCHAR(255),
        recipient_contact VARCHAR(255) NOT NULL,
        notification_channel VARCHAR(20) NOT NULL DEFAULT 'SMS',
        message_text TEXT,
        gateway_status INTEGER,
        gateway_response TEXT,
        delivery_status VARCHAR(50) DEFAULT 'SUCCESS',
        resolution_status VARCHAR(50) DEFAULT 'ACTIVE',
        escalated_to_ee BOOLEAN DEFAULT FALSE,
        escalation_date DATE,
        telemetry_value VARCHAR(100),
        sent_date DATE NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_alert_tracker_date ON alert_tracker_logs(sent_date);
      CREATE INDEX IF NOT EXISTS idx_alert_tracker_key ON alert_tracker_logs(alert_key);
      CREATE INDEX IF NOT EXISTS idx_alert_tracker_scheme ON alert_tracker_logs(scheme_id);
    `);
    isTableInitialized = true;
  } catch (err) {
    console.warn("Could not ensure alert_tracker_logs table:", err);
  }
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const SHORTLY_TODAY_TEXT = "Will be displayed shortly today and will be visible after the data is updated for that date";

function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Maps requested data date string to the corresponding telemetry day index (1 to 7)
 * and computes forward timeline availability for Unresolved and EE Escalation.
 */
export function getTelemetryDayIndex(targetDateStr?: string) {
  // Current local IST date (UTC + 5:30)
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);

  let dayNum = istNow.getUTCDate();
  let monthNum = istNow.getUTCMonth() + 1;
  let yearNum = istNow.getUTCFullYear();

  if (targetDateStr) {
    const ddmmyyyy = targetDateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
      dayNum = parseInt(ddmmyyyy[1], 10);
      monthNum = parseInt(ddmmyyyy[2], 10);
      yearNum = parseInt(ddmmyyyy[3], 10);
    } else {
      const yyyymmdd = targetDateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      if (yyyymmdd) {
        yearNum = parseInt(yyyymmdd[1], 10);
        monthNum = parseInt(yyyymmdd[2], 10);
        dayNum = parseInt(yyyymmdd[3], 10);
      }
    }
  }

  // targetDateStr represents the Alert Date (default = current date)
  const alertDateObj = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
  const alertIsoDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
  const alertDisplayDate = `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}/${yearNum}`;

  // Eval Data Date = Alert Date - 1 day (e.g. 27th Oct alert evaluates 26th Oct data)
  const evalDateObj = new Date(alertDateObj.getTime() - 86400000);
  const evalYear = evalDateObj.getUTCFullYear();
  const evalMonth = evalDateObj.getUTCMonth() + 1;
  const evalDay = evalDateObj.getUTCDate();
  const evalIsoDate = `${evalYear}-${String(evalMonth).padStart(2, "0")}-${String(evalDay).padStart(2, "0")}`;
  const evalDisplayDate = `${String(evalDay).padStart(2, "0")}/${String(evalMonth).padStart(2, "0")}/${evalYear}`;
  const evalHistoryStr = `${String(evalDay).padStart(2, "0")}-${MONTHS_SHORT[evalMonth - 1]}`;

  // Next Date for resolution = evalDateObj + 1 day = alertDateObj
  const nextDateObj = alertDateObj;
  const nextYear = nextDateObj.getUTCFullYear();
  const nextMonth = nextDateObj.getUTCMonth() + 1;
  const nextDay = nextDateObj.getUTCDate();
  const nextDayIsoDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
  const nextDayDisplayDate = `${String(nextDay).padStart(2, "0")}/${String(nextMonth).padStart(2, "0")}/${nextYear}`;
  const nextHistoryStr = `${String(nextDay).padStart(2, "0")}-${MONTHS_SHORT[nextMonth - 1]}`;

  // Col 2 & 3 target date = alertDateObj + 1 day = evalDateObj + 2 days (24h evaluation window)
  const col23TargetDateObj = new Date(evalDateObj.getTime() + 2 * 86400000);
  const col23DayOrdinal = getOrdinal(col23TargetDateObj.getUTCDate());
  const col23MonthShort = MONTHS_SHORT[col23TargetDateObj.getUTCMonth()];

  // Col 4 target date = alertDateObj + 2 days = evalDateObj + 3 days (subsequent day evaluation)
  const col4TargetDateObj = new Date(evalDateObj.getTime() + 3 * 86400000);
  const col4DayOrdinal = getOrdinal(col4TargetDateObj.getUTCDate());
  const col4MonthShort = MONTHS_SHORT[col4TargetDateObj.getUTCMonth()];

  // Col 4 telemetry data date in history tables = evalDateObj + 2 days = alertDateObj + 1 day
  const col4DataDateObj = new Date(evalDateObj.getTime() + 2 * 86400000);
  const col4HistoryStr = `${String(col4DataDateObj.getUTCDate()).padStart(2, "0")}-${MONTHS_SHORT[col4DataDateObj.getUTCMonth()]}`;
  const col4DisplayDate = `${String(col4DataDateObj.getUTCDate()).padStart(2, "0")}/${String(col4DataDateObj.getUTCMonth() + 1).padStart(2, "0")}/${col4DataDateObj.getUTCFullYear()}`;

  // If selected alert date is on or after the target display date, show shortly today text
  const unresolvedPendingText = (alertDateObj.getTime() >= col23TargetDateObj.getTime())
    ? SHORTLY_TODAY_TEXT
    : `Will be displayed on ${col23DayOrdinal} ${col23MonthShort}`;

  const escalatedEEPendingText = unresolvedPendingText;

  const col4PendingText = (alertDateObj.getTime() >= col4TargetDateObj.getTime())
    ? SHORTLY_TODAY_TEXT
    : `Will be displayed on ${col4DayOrdinal} ${col4MonthShort}`;

  const alertDayOrdinal = getOrdinal(dayNum);
  const alertMonthFull = MONTHS_FULL[monthNum - 1];
  const evalDayOrdinal = getOrdinal(evalDay);
  const evalMonthShort = MONTHS_SHORT[evalMonth - 1];

  return {
    alertDateObj,
    evalDateObj,
    alertIsoDate,
    alertDisplayDate,
    alertDayOrdinal,
    alertMonthFull,
    evalIsoDate,
    evalDisplayDate,
    evalHistoryStr,
    evalDayOrdinal,
    evalMonthShort,
    nextDayIsoDate,
    nextDayDisplayDate,
    nextHistoryStr,
    col4HistoryStr,
    col4DisplayDate,
    col23TargetDateObj,
    col4TargetDateObj,
    isoDate: alertIsoDate,
    displayDate: alertDisplayDate,
    unresolvedPendingText,
    escalatedEEPendingText,
    col4PendingText,
    eeEscalationDateStr: `${col23DayOrdinal} ${col23MonthShort}`,
    col4DateStr: `${col4DayOrdinal} ${col4MonthShort}`,
    dayWithOrdinal: evalDayOrdinal,
    month: evalMonthShort,
    year: evalYear,
  };
}

/**
 * Retrieves daily alert tracker metrics and actual alert items for the date, region, and agency filter
 */
export async function getAlertTrackerMetrics(params: {
  date: string;
  region?: string;
  agency?: string;
}): Promise<AlertTrackerMetricsResult & { allAlerts: AlertTrackerItem[]; totalDispatchedCount: number }> {
  await ensureAlertTrackerTables();
  const db = await getDB();
  const meta = getTelemetryDayIndex(params.date);
  const {
    alertDateObj,
    evalDateObj,
    alertIsoDate,
    alertDisplayDate,
    evalIsoDate,
    evalDisplayDate,
    evalHistoryStr,
    nextDayDisplayDate,
    nextHistoryStr,
    col4HistoryStr,
    col23TargetDateObj,
    col4TargetDateObj,
    unresolvedPendingText,
    escalatedEEPendingText,
    col4PendingText,
    displayDate,
  } = meta;

  const region = params.region && params.region.toLowerCase() !== "all" ? params.region.trim() : null;
  const rawAgency = params.agency ? params.agency.trim() : null;
  const isAllAgency = !rawAgency || rawAgency.toUpperCase() === "ALL" || rawAgency.toUpperCase() === "ALL AGENCY" || rawAgency.toLowerCase() === "all agencies";
  const agency = isAllAgency ? null : rawAgency;

  // Current local IST date (UTC + 5:30)
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const todayIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

  // 1. Check if history tables contain data for evalDate, nextDate, and col4Date
  const [availRes]: any = await Promise.all([
    db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM water_scheme_data_history WHERE data_date = ${evalHistoryStr}) as eval_lpcd_cnt,
        (SELECT COUNT(*) FROM pressure_history WHERE pressure_date = ${evalHistoryStr}) as eval_pres_cnt,
        (SELECT COUNT(*) FROM chlorine_history WHERE chlorine_date = ${evalHistoryStr}) as eval_chl_cnt,
        (SELECT COUNT(*) FROM water_scheme_data_history WHERE data_date = ${nextHistoryStr}) as next_lpcd_cnt,
        (SELECT COUNT(*) FROM pressure_history WHERE pressure_date = ${nextHistoryStr}) as next_pres_cnt,
        (SELECT COUNT(*) FROM chlorine_history WHERE chlorine_date = ${nextHistoryStr}) as next_chl_cnt,
        (SELECT COUNT(*) FROM water_scheme_data_history WHERE data_date = ${col4HistoryStr}) as col4_lpcd_cnt,
        (SELECT COUNT(*) FROM pressure_history WHERE pressure_date = ${col4HistoryStr}) as col4_pres_cnt,
        (SELECT COUNT(*) FROM chlorine_history WHERE chlorine_date = ${col4HistoryStr}) as col4_chl_cnt;
    `)
  ]);

  const evalLpcdCount = Number(availRes.rows[0]?.eval_lpcd_cnt || 0);
  const evalPresCount = Number(availRes.rows[0]?.eval_pres_cnt || 0);
  const evalChlCount = Number(availRes.rows[0]?.eval_chl_cnt || 0);
  const evalTotal = evalLpcdCount + evalPresCount + evalChlCount;

  const nextLpcdCount = Number(availRes.rows[0]?.next_lpcd_cnt || 0);
  const nextPresCount = Number(availRes.rows[0]?.next_pres_cnt || 0);
  const nextChlCount = Number(availRes.rows[0]?.next_chl_cnt || 0);
  const nextTotal = nextLpcdCount + nextPresCount + nextChlCount;

  const col4LpcdCount = Number(availRes.rows[0]?.col4_lpcd_cnt || 0);
  const col4PresCount = Number(availRes.rows[0]?.col4_pres_cnt || 0);
  const col4ChlCount = Number(availRes.rows[0]?.col4_chl_cnt || 0);
  const col4Total = col4LpcdCount + col4PresCount + col4ChlCount;

  // Check next day availability for 24h evaluation window (Col 2 & 3)
  const isNextDayAvailable = nextTotal > 0 && todayIST >= col23TargetDateObj;
  // Check Col 4 availability (needs subsequent day data)
  const isCol4Available = isNextDayAvailable && col4Total > 0 && todayIST >= col4TargetDateObj;

  const result: AlertTrackerMetricsResult & { allAlerts: AlertTrackerItem[]; totalDispatchedCount: number } = {
    lpcd: {
      reported: 0,
      unresolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedEE: isNextDayAvailable ? 0 : escalatedEEPendingText,
      unresolvedSince: isNextDayAvailable ? `Since ${evalDisplayDate}` : "-",
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      unresolvedTillDateItems: [],
      subsequentResolved: isCol4Available ? 0 : col4PendingText,
      subsequentResolvedItems: [],
      items: [],
      resolvedItems: [],
      unresolvedItems: [],
      escalatedEEItems: [],
      isNextDayAvailable,
      isCol4Available,
    },
    pressure: {
      reported: 0,
      unresolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedEE: isNextDayAvailable ? 0 : escalatedEEPendingText,
      unresolvedSince: isNextDayAvailable ? `Since ${evalDisplayDate}` : "-",
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      unresolvedTillDateItems: [],
      subsequentResolved: isCol4Available ? 0 : col4PendingText,
      subsequentResolvedItems: [],
      items: [],
      resolvedItems: [],
      unresolvedItems: [],
      escalatedEEItems: [],
      isNextDayAvailable,
      isCol4Available,
    },
    chlorine: {
      reported: 0,
      unresolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedEE: isNextDayAvailable ? 0 : escalatedEEPendingText,
      unresolvedSince: isNextDayAvailable ? `Since ${evalDisplayDate}` : "-",
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      unresolvedTillDateItems: [],
      subsequentResolved: isCol4Available ? 0 : col4PendingText,
      subsequentResolvedItems: [],
      items: [],
      resolvedItems: [],
      unresolvedItems: [],
      escalatedEEItems: [],
      isNextDayAvailable,
      isCol4Available,
    },
    total: {
      reported: 0,
      unresolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedEE: isNextDayAvailable ? 0 : escalatedEEPendingText,
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedSince: isNextDayAvailable ? `Since ${evalDisplayDate}` : "-",
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      subsequentResolved: isCol4Available ? 0 : col4PendingText,
    },
    allAlerts: [],
    totalDispatchedCount: 0,
    dateMeta: {
      ...meta,
      isNextDayAvailable,
      isCol4Available,
    },
  };

  // If no data is available for previous date, reported is 0 and resolutions show pending text
  if (evalTotal === 0) {
    result.lpcd.reported = 0;
    result.lpcd.unresolved = unresolvedPendingText;
    result.lpcd.unresolvedEE = escalatedEEPendingText;
    result.lpcd.resolved = unresolvedPendingText;
    result.lpcd.unresolvedTillDate = col4PendingText;
    result.lpcd.subsequentResolved = col4PendingText;

    result.pressure.reported = 0;
    result.pressure.unresolved = unresolvedPendingText;
    result.pressure.unresolvedEE = escalatedEEPendingText;
    result.pressure.resolved = unresolvedPendingText;
    result.pressure.unresolvedTillDate = col4PendingText;
    result.pressure.subsequentResolved = col4PendingText;

    result.chlorine.reported = 0;
    result.chlorine.unresolved = unresolvedPendingText;
    result.chlorine.unresolvedEE = escalatedEEPendingText;
    result.chlorine.resolved = unresolvedPendingText;
    result.chlorine.unresolvedTillDate = col4PendingText;
    result.chlorine.subsequentResolved = col4PendingText;

    result.total.reported = 0;
    result.total.unresolved = unresolvedPendingText;
    result.total.unresolvedEE = escalatedEEPendingText;
    result.total.resolved = unresolvedPendingText;
    result.total.unresolvedTillDate = col4PendingText;
    result.total.subsequentResolved = col4PendingText;

    return result;
  }

  try {
    const latestHistoryStr = (isCol4Available && col4Total > 0) ? col4HistoryStr : (nextTotal > 0 ? nextHistoryStr : evalHistoryStr);

    // Query field issue reports so remarks are viewable just like escalation portal
    const remarksByScheme = new Map<string, any[]>();
    try {
      const issueReportsRes: any = await db.execute(sql`
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
        GROUP BY scheme_id;
      `);
      (issueReportsRes.rows || []).forEach((r: any) => {
        if (r.scheme_id) remarksByScheme.set(String(r.scheme_id).trim(), r.remarks || []);
      });
    } catch (err) {
      console.warn("Could not query issue_reports in getAlertTrackerMetrics:", err);
    }

    const lpcdRegionClause = region ? sql`AND (t.region ILIKE ${`%${region}%`} OR ss.region ILIKE ${`%${region}%`})` : sql``;
    const presRegionClause = region ? sql`AND (t.region ILIKE ${`%${region}%`} OR ss.region ILIKE ${`%${region}%`})` : sql``;
    const chlRegionClause = region ? sql`AND (t.region ILIKE ${`%${region}%`} OR ss.region ILIKE ${`%${region}%`})` : sql``;

    let agencyClause = sql``;
    if (agency) {
      const a = agency.toLowerCase().trim();
      if (a === "zp-self" || a === "zpself" || a === "zp self") {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%ZP-Self%')`;
      } else if (a.includes("shikhar") || a.includes("shikar")) {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%shikhar%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%shikar%')`;
      } else if (a === "zp") {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE 'ZP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%ZP%')`;
      } else if (a.includes("gram") || a === "gp") {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) = 'GP' OR COALESCE(ss.agency, ss.agency_type) ILIKE 'GP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%gram%')`;
      } else if (a.includes("mjp")) {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%MJP%')`;
      } else if (a.includes("contractor")) {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%Contractor%')`;
      } else {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE ${`%${agency}%`})`;
      }
    }

    const [lpcdRes, presRes, chlRes]: any = await Promise.all([
      evalLpcdCount > 0 ? db.execute(sql`
        WITH today_lpcd AS (
          SELECT DISTINCT ON (w.scheme_id, LOWER(TRIM(w.village_name)))
            w.scheme_id, w.scheme_name, w.village_name,
            w.region, w.circle, w.division, w.sub_division, w.block,
            w.lpcd_value as val_today,
            w.water_value as water_today
          FROM water_scheme_data_history w
          WHERE w.data_date = ${evalHistoryStr}
          ORDER BY w.scheme_id, LOWER(TRIM(w.village_name)), w.id DESC
        ),
        next_lpcd AS (
          SELECT DISTINCT ON (w.scheme_id, LOWER(TRIM(w.village_name)))
            w.scheme_id, w.village_name,
            w.lpcd_value as val_next,
            w.water_value as water_next
          FROM water_scheme_data_history w
          WHERE w.data_date = ${nextHistoryStr}
          ORDER BY w.scheme_id, LOWER(TRIM(w.village_name)), w.id DESC
        ),
        latest_lpcd AS (
          SELECT DISTINCT ON (w.scheme_id, LOWER(TRIM(w.village_name)))
            w.scheme_id, w.village_name,
            w.lpcd_value as val_latest
          FROM water_scheme_data_history w
          WHERE w.data_date = ${latestHistoryStr}
          ORDER BY w.scheme_id, LOWER(TRIM(w.village_name)), w.id DESC
        )
        SELECT 
          t.scheme_id,
          COALESCE(ss.scheme_name, t.scheme_name, 'Scheme ' || t.scheme_id) as scheme_name,
          t.village_name,
          COALESCE(t.region, ss.region, 'Unknown') as region,
          t.circle, t.division, t.sub_division, t.block,
          t.val_today,
          t.water_today,
          n.val_next,
          n.water_next,
          l.val_latest,
          sod.operator_name,
          sod.operator_number,
          COALESCE(NULLIF(sod.ee_name, '-'), sod_ee.ee_name) as ee_name,
          COALESCE(NULLIF(sod.ee_number, '-'), sod_ee.ee_number) as ee_number,
          COALESCE(NULLIF(sod.ee_email, '-'), sod_ee.ee_email) as ee_email,
          COALESCE(NULLIF(sod.chief_se_name, '-'), sod_ee.chief_se_name) as chief_se_name,
          COALESCE(NULLIF(sod.chief_se_number, '-'), sod_ee.chief_se_number) as chief_se_number,
          COALESCE(ss.agency, ss.agency_type, sod.operated_by, 'MJP') as operated_by,
          COALESCE(ss.agency_type, ss.agency, sod.operated_by, 'MJP') as agency_type,
          ss.fully_completion_scheme_status,
          COALESCE(ss.total_villages_integrated, 0) as total_villages_integrated,
          COALESCE(ss.total_esr_integrated, 0) as total_esr_integrated,
          (
            SELECT a.delivery_status 
            FROM alert_tracker_logs a 
            WHERE a.scheme_id = t.scheme_id 
              AND a.gateway_status IS NOT NULL
              AND (a.sent_date = ${alertIsoDate}::date OR a.original_alert_date = ${alertIsoDate}::date)
            ORDER BY a.id DESC LIMIT 1
          ) as sms_delivery_status
        FROM today_lpcd t
        JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name, region, agency_type, agency,
            fully_completion_scheme_status, total_villages_integrated, total_esr_integrated
          FROM scheme_status 
          WHERE water_supply = 'Yes'
          ORDER BY scheme_id
        ) ss ON ss.scheme_id = t.scheme_id
        LEFT JOIN next_lpcd n ON n.scheme_id = t.scheme_id AND LOWER(TRIM(n.village_name)) = LOWER(TRIM(t.village_name))
        LEFT JOIN latest_lpcd l ON l.scheme_id = t.scheme_id AND LOWER(TRIM(l.village_name)) = LOWER(TRIM(t.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) scheme_id, village_name, operator_name, operator_number, ee_name, ee_number, ee_email, chief_se_name, chief_se_number, operated_by
          FROM scheme_operator_details
          ORDER BY scheme_id, LOWER(TRIM(village_name))
        ) sod ON sod.scheme_id = t.scheme_id AND LOWER(TRIM(sod.village_name)) = LOWER(TRIM(t.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, ee_name, ee_number, ee_email, chief_se_name, chief_se_number
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY scheme_id
        ) sod_ee ON sod_ee.scheme_id = t.scheme_id
        WHERE t.val_today IS NOT NULL AND t.val_today >= 0 AND t.val_today < 55
          ${lpcdRegionClause}
          ${agencyClause}
        ORDER BY t.scheme_id, LOWER(TRIM(t.village_name)), t.val_today ASC;
      `) : Promise.resolve({ rows: [] }),
      evalPresCount > 0 ? db.execute(sql`
        WITH today_pres AS (
          SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(p.esr_name)))
            p.scheme_id, p.scheme_name, p.village_name, p.esr_name,
            p.region, p.circle, p.division, p.sub_division, p.block,
            p.pressure_value as val_today
          FROM pressure_history p
          WHERE p.pressure_date = ${evalHistoryStr}
          ORDER BY p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(p.esr_name)), p.id DESC
        ),
        today_water AS (
          SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)))
            wc.scheme_id, wc.village_name, wc.esr_name,
            wc.water_value as water_today
          FROM water_consumption_history wc
          WHERE wc.data_date = ${evalHistoryStr}
          ORDER BY wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)), wc.id DESC
        ),
        next_pres AS (
          SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(p.esr_name)))
            p.scheme_id, p.village_name, p.esr_name,
            p.pressure_value as val_next
          FROM pressure_history p
          WHERE p.pressure_date = ${nextHistoryStr}
          ORDER BY p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(p.esr_name)), p.id DESC
        ),
        latest_pres AS (
          SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(p.esr_name)))
            p.scheme_id, p.village_name, p.esr_name,
            p.pressure_value as val_latest
          FROM pressure_history p
          WHERE p.pressure_date = ${latestHistoryStr}
          ORDER BY p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(p.esr_name)), p.id DESC
        ),
        next_water AS (
          SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)))
            wc.scheme_id, wc.village_name, wc.esr_name,
            wc.water_value as water_next
          FROM water_consumption_history wc
          WHERE wc.data_date = ${nextHistoryStr}
          ORDER BY wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)), wc.id DESC
        )
        SELECT 
          t.scheme_id,
          COALESCE(ss.scheme_name, t.scheme_name, 'Scheme ' || t.scheme_id) as scheme_name,
          t.village_name,
          t.esr_name as reservoir_name,
          COALESCE(t.region, ss.region, 'Unknown') as region,
          t.circle, t.division, t.sub_division, t.block,
          t.val_today,
          tw.water_today,
          n.val_next,
          nw.water_next,
          l.val_latest,
          sod.operator_name,
          sod.operator_number,
          COALESCE(NULLIF(sod.ee_name, '-'), sod_ee.ee_name) as ee_name,
          COALESCE(NULLIF(sod.ee_number, '-'), sod_ee.ee_number) as ee_number,
          COALESCE(NULLIF(sod.ee_email, '-'), sod_ee.ee_email) as ee_email,
          COALESCE(NULLIF(sod.chief_se_name, '-'), sod_ee.chief_se_name) as chief_se_name,
          COALESCE(NULLIF(sod.chief_se_number, '-'), sod_ee.chief_se_number) as chief_se_number,
          COALESCE(ss.agency, ss.agency_type, sod.operated_by, 'MJP') as operated_by,
          COALESCE(ss.agency_type, ss.agency, sod.operated_by, 'MJP') as agency_type,
          ss.fully_completion_scheme_status,
          COALESCE(ss.total_villages_integrated, 0) as total_villages_integrated,
          COALESCE(ss.total_esr_integrated, 0) as total_esr_integrated,
          (
            SELECT a.delivery_status 
            FROM alert_tracker_logs a 
            WHERE a.scheme_id = t.scheme_id 
              AND a.gateway_status IS NOT NULL
              AND (a.sent_date = ${alertIsoDate}::date OR a.original_alert_date = ${alertIsoDate}::date)
            ORDER BY a.id DESC LIMIT 1
          ) as sms_delivery_status
        FROM today_pres t
        JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name, region, agency_type, agency,
            fully_completion_scheme_status, total_villages_integrated, total_esr_integrated
          FROM scheme_status 
          WHERE water_supply = 'Yes'
          ORDER BY scheme_id
        ) ss ON ss.scheme_id = t.scheme_id
        JOIN today_water tw ON tw.scheme_id = t.scheme_id 
          AND LOWER(TRIM(COALESCE(tw.village_name, ''))) = LOWER(TRIM(COALESCE(t.village_name, '')))
          AND LOWER(TRIM(COALESCE(tw.esr_name, ''))) = LOWER(TRIM(COALESCE(t.esr_name, '')))
          AND tw.water_today IS NOT NULL
          AND tw.water_today > 0
        LEFT JOIN next_pres n ON n.scheme_id = t.scheme_id 
          AND LOWER(TRIM(n.village_name)) = LOWER(TRIM(t.village_name))
          AND LOWER(TRIM(n.esr_name)) = LOWER(TRIM(t.esr_name))
        LEFT JOIN latest_pres l ON l.scheme_id = t.scheme_id 
          AND LOWER(TRIM(l.village_name)) = LOWER(TRIM(t.village_name))
          AND LOWER(TRIM(l.esr_name)) = LOWER(TRIM(t.esr_name))
        LEFT JOIN next_water nw ON nw.scheme_id = t.scheme_id 
          AND LOWER(TRIM(nw.village_name)) = LOWER(TRIM(t.village_name))
          AND LOWER(TRIM(nw.esr_name)) = LOWER(TRIM(t.esr_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) scheme_id, village_name, operator_name, operator_number, ee_name, ee_number, ee_email, chief_se_name, chief_se_number, operated_by
          FROM scheme_operator_details
          ORDER BY scheme_id, LOWER(TRIM(village_name))
        ) sod ON sod.scheme_id = t.scheme_id AND LOWER(TRIM(sod.village_name)) = LOWER(TRIM(t.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, ee_name, ee_number, ee_email, chief_se_name, chief_se_number
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY scheme_id
        ) sod_ee ON sod_ee.scheme_id = t.scheme_id
        WHERE (t.val_today IS NULL OR (t.val_today >= 0 AND t.val_today < 0.20))
          ${presRegionClause}
          ${agencyClause}
        ORDER BY t.scheme_id, LOWER(TRIM(t.village_name)), LOWER(TRIM(COALESCE(t.esr_name, ''))), t.val_today ASC NULLS FIRST;
      `) : Promise.resolve({ rows: [] }),
      evalChlCount > 0 ? db.execute(sql`
        WITH today_chl AS (
          SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
            c.scheme_id, c.scheme_name, c.village_name, c.esr_name,
            c.region, c.circle, c.division, c.sub_division, c.block,
            c.chlorine_value as val_today
          FROM chlorine_history c
          WHERE c.chlorine_date = ${evalHistoryStr}
          ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)), c.id DESC
        ),
        today_water AS (
          SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)))
            wc.scheme_id, wc.village_name, wc.esr_name,
            wc.water_value as water_today
          FROM water_consumption_history wc
          WHERE wc.data_date = ${evalHistoryStr}
          ORDER BY wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)), wc.id DESC
        ),
        next_chl AS (
          SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
            c.scheme_id, c.village_name, c.esr_name,
            c.chlorine_value as val_next
          FROM chlorine_history c
          WHERE c.chlorine_date = ${nextHistoryStr}
          ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)), c.id DESC
        ),
        latest_chl AS (
          SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
            c.scheme_id, c.village_name, c.esr_name,
            c.chlorine_value as val_latest
          FROM chlorine_history c
          WHERE c.chlorine_date = ${latestHistoryStr}
          ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)), c.id DESC
        ),
        next_water AS (
          SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)))
            wc.scheme_id, wc.village_name, wc.esr_name,
            wc.water_value as water_next
          FROM water_consumption_history wc
          WHERE wc.data_date = ${nextHistoryStr}
          ORDER BY wc.scheme_id, LOWER(TRIM(wc.village_name)), LOWER(TRIM(wc.esr_name)), wc.id DESC
        )
        SELECT 
          t.scheme_id,
          COALESCE(ss.scheme_name, t.scheme_name, 'Scheme ' || t.scheme_id) as scheme_name,
          t.village_name,
          t.esr_name as reservoir_name,
          COALESCE(t.region, ss.region, 'Unknown') as region,
          t.circle, t.division, t.sub_division, t.block,
          t.val_today,
          tw.water_today,
          n.val_next,
          nw.water_next,
          l.val_latest,
          sod.operator_name,
          sod.operator_number,
          COALESCE(NULLIF(sod.ee_name, '-'), sod_ee.ee_name) as ee_name,
          COALESCE(NULLIF(sod.ee_number, '-'), sod_ee.ee_number) as ee_number,
          COALESCE(NULLIF(sod.ee_email, '-'), sod_ee.ee_email) as ee_email,
          COALESCE(NULLIF(sod.chief_se_name, '-'), sod_ee.chief_se_name) as chief_se_name,
          COALESCE(NULLIF(sod.chief_se_number, '-'), sod_ee.chief_se_number) as chief_se_number,
          COALESCE(ss.agency, ss.agency_type, sod.operated_by, 'MJP') as operated_by,
          COALESCE(ss.agency_type, ss.agency, sod.operated_by, 'MJP') as agency_type,
          ss.fully_completion_scheme_status,
          COALESCE(ss.total_villages_integrated, 0) as total_villages_integrated,
          COALESCE(ss.total_esr_integrated, 0) as total_esr_integrated,
          (
            SELECT a.delivery_status 
            FROM alert_tracker_logs a 
            WHERE a.scheme_id = t.scheme_id 
              AND a.gateway_status IS NOT NULL
              AND (a.sent_date = ${alertIsoDate}::date OR a.original_alert_date = ${alertIsoDate}::date)
            ORDER BY a.id DESC LIMIT 1
          ) as sms_delivery_status
        FROM today_chl t
        JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name, region, agency_type, agency,
            fully_completion_scheme_status, total_villages_integrated, total_esr_integrated
          FROM scheme_status 
          WHERE water_supply = 'Yes'
          ORDER BY scheme_id
        ) ss ON ss.scheme_id = t.scheme_id
        JOIN today_water tw ON tw.scheme_id = t.scheme_id 
          AND LOWER(TRIM(COALESCE(tw.village_name, ''))) = LOWER(TRIM(COALESCE(t.village_name, '')))
          AND LOWER(TRIM(COALESCE(tw.esr_name, ''))) = LOWER(TRIM(COALESCE(t.esr_name, '')))
          AND tw.water_today IS NOT NULL
          AND tw.water_today > 0
        LEFT JOIN next_chl n ON n.scheme_id = t.scheme_id 
          AND LOWER(TRIM(n.village_name)) = LOWER(TRIM(t.village_name))
          AND LOWER(TRIM(n.esr_name)) = LOWER(TRIM(t.esr_name))
        LEFT JOIN latest_chl l ON l.scheme_id = t.scheme_id 
          AND LOWER(TRIM(l.village_name)) = LOWER(TRIM(t.village_name))
          AND LOWER(TRIM(l.esr_name)) = LOWER(TRIM(t.esr_name))
        LEFT JOIN next_water nw ON nw.scheme_id = t.scheme_id 
          AND LOWER(TRIM(nw.village_name)) = LOWER(TRIM(t.village_name))
          AND LOWER(TRIM(nw.esr_name)) = LOWER(TRIM(t.esr_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) scheme_id, village_name, operator_name, operator_number, ee_name, ee_number, ee_email, chief_se_name, chief_se_number, operated_by
          FROM scheme_operator_details
          ORDER BY scheme_id, LOWER(TRIM(village_name))
        ) sod ON sod.scheme_id = t.scheme_id AND LOWER(TRIM(sod.village_name)) = LOWER(TRIM(t.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, ee_name, ee_number, ee_email, chief_se_name, chief_se_number
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY scheme_id
        ) sod_ee ON sod_ee.scheme_id = t.scheme_id
        WHERE (t.val_today IS NULL OR t.val_today < 0.20 OR t.val_today > 0.50)
          ${chlRegionClause}
          ${agencyClause}
        ORDER BY t.scheme_id, LOWER(TRIM(t.village_name)), LOWER(TRIM(COALESCE(t.esr_name, ''))), t.val_today ASC NULLS FIRST;
      `) : Promise.resolve({ rows: [] }),
    ]);

    // Process LPCD Items
    (lpcdRes.rows || []).forEach((row: any) => {
      const isResolvedNextDay = isNextDayAvailable && row.val_next !== null && Number(row.val_next) >= 55;
      const isUnresolvedNextDay = isNextDayAvailable && !isResolvedNextDay;
      const isEE = isUnresolvedNextDay;
      const schemeRemarks = remarksByScheme.get(String(row.scheme_id).trim()) || [];
      const hasActualSmsLog = Boolean(row.sms_delivery_status);
      const hasEe = Boolean(row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer");
      const hasOperator = Boolean(row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" && row.operator_number && row.operator_number !== "-");
      const isConnected = 
        (row.fully_completion_scheme_status && row.fully_completion_scheme_status !== 'Not-Connected' && ['Fully Completed', 'In Progress', 'Connected'].includes(row.fully_completion_scheme_status)) ||
        Number(row.total_villages_integrated || 0) > 0 ||
        Number(row.total_esr_integrated || 0) > 0;

      const item: AlertTrackerItem = {
        fully_completion_scheme_status: row.fully_completion_scheme_status || (isConnected ? 'Connected' : 'Not-Connected'),
        is_connected: isConnected ? 'Connected' : 'Not Connected',
        status: row.fully_completion_scheme_status || (isConnected ? 'Connected' : 'Not Connected'),
        connected_villages: Number(row.total_villages_integrated || 0),
        connected_esrs: Number(row.total_esr_integrated || 0),
        alert_key: `LPCD-${row.scheme_id}-${row.village_name}`,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        village_name: row.village_name || "-",
        reservoir_name: "-",
        region: row.region,
        circle: row.circle || "-",
        division: row.division || "-",
        sub_division: row.sub_division || "-",
        block: row.block || "-",
        alert_type: "LPCD",
        original_alert_date: alertIsoDate,
        recipient_designation: isEE ? "Executive Engineer" : "Village Operator",
        recipient_name: isEE
          ? (hasEe ? row.ee_name : "-")
          : (row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-"),
        recipient_contact: isEE ? (row.ee_number || "-") : (row.operator_number || "-"),
        recipient_email: row.ee_email || undefined,
        notification_channel: isEE ? ("SMS & Email" as any) : "SMS",
        operator_message_text: DLT_TEMPLATES.LPCD_LOW.render(formatSchemeName(row.scheme_name, row.scheme_id), formatVillageName(row.village_name), parseFloat(row.val_today).toFixed(1)),
        ee_message_text: DLT_TEMPLATES.ESCALATION_EE_CE.render(formatSchemeName(row.scheme_name, row.scheme_id), 1, 1, "तांत्रिक बाबी प्रलंबित आहेत"),
        message_text: isEE
          ? DLT_TEMPLATES.ESCALATION_EE_CE.render(formatSchemeName(row.scheme_name, row.scheme_id), 1, 1, "तांत्रिक बाबी प्रलंबित आहेत")
          : DLT_TEMPLATES.LPCD_LOW.render(formatSchemeName(row.scheme_name, row.scheme_id), formatVillageName(row.village_name), parseFloat(row.val_today).toFixed(1)),
        reading_value: `${parseFloat(row.val_today).toFixed(1)} LPCD`,
        delivery_status: (isEE ? hasEe : hasOperator) ? (row.sms_delivery_status || "NOT_DISPATCHED") : "NOT_DISPATCHED",
        sms_sent: isEE ? (hasActualSmsLog && hasEe) : (hasActualSmsLog && hasOperator),
        email_sent: Boolean(isEE && hasActualSmsLog && hasEe && row.ee_email && row.ee_email !== "-"),
        resolution_status: isResolvedNextDay ? "RESOLVED" : isUnresolvedNextDay ? "UNRESOLVED" : "ACTIVE",
        escalated_to_ee: isEE,
        unresolved_since: isUnresolvedNextDay ? `Since ${evalDisplayDate}` : "-",
        escalation_date: isEE ? nextDayDisplayDate : undefined,
        ee_dispatch_date: isEE ? meta.eeEscalationDateStr : undefined,
        sent_date: alertIsoDate,
        sent_at: `${alertIsoDate}T10:30:00.000Z`,
        operator_name: row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-",
        operator_number: row.operator_number || "-",
        ee_name: row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-",
        ee_number: row.ee_number || "-",
        ee_email: row.ee_email || "-",
        chief_se_name: row.chief_se_name && row.chief_se_name !== "-" ? row.chief_se_name : "-",
        chief_se_number: row.chief_se_number || "-",
        operated_by: row.operated_by || "MJP",
        agency_type: row.agency_type || row.operated_by || "MJP",
        remarks_list: schemeRemarks,
        remarks_count: schemeRemarks.length,
        val_latest: row.val_latest !== null ? Number(row.val_latest) : null,
        val_today: row.val_today !== null ? Number(row.val_today) : null,
        val_next: row.val_next !== null ? Number(row.val_next) : null,
      };

      result.lpcd.items.push(item);
      result.allAlerts.push(item);
      result.totalDispatchedCount++;

      if (isUnresolvedNextDay) {
        result.lpcd.unresolvedItems.push(item);
        result.lpcd.escalatedEEItems.push(item);
      } else if (isResolvedNextDay) {
        result.lpcd.resolvedItems!.push(item);
      }
    });

    result.lpcd.reported = result.lpcd.items.length;
    result.lpcd.resolved = isNextDayAvailable ? (result.lpcd.resolvedItems?.length || 0) : unresolvedPendingText;
    result.lpcd.unresolved = isNextDayAvailable ? result.lpcd.unresolvedItems.length : unresolvedPendingText;
    result.lpcd.unresolvedEE = isNextDayAvailable ? result.lpcd.escalatedEEItems.length : escalatedEEPendingText;
    const lpcdStillUnresolved = isCol4Available
      ? result.lpcd.unresolvedItems.filter((r: any) => r.val_latest === null || Number(r.val_latest) < 55)
      : [];
    result.lpcd.unresolvedTillDateItems = lpcdStillUnresolved;
    result.lpcd.unresolvedTillDate = isCol4Available
      ? lpcdStillUnresolved.length
      : col4PendingText;
    const lpcdSubsequentResolved = isCol4Available
      ? result.lpcd.unresolvedItems.filter((r: any) => r.val_latest !== null && Number(r.val_latest) >= 55)
      : [];
    result.lpcd.subsequentResolvedItems = lpcdSubsequentResolved;
    result.lpcd.subsequentResolved = isCol4Available
      ? lpcdSubsequentResolved.length
      : col4PendingText;

    // Process Pressure Items
    (presRes.rows || []).forEach((row: any) => {
      const isResolvedNextDay = isNextDayAvailable && row.val_next !== null && Number(row.val_next) >= 0.20;
      const isUnresolvedNextDay = isNextDayAvailable && !isResolvedNextDay;
      const isEE = isUnresolvedNextDay;
      const schemeRemarks = remarksByScheme.get(String(row.scheme_id).trim()) || [];
      const hasActualSmsLog = Boolean(row.sms_delivery_status);
      const hasEe = Boolean(row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer");
      const hasOperator = Boolean(row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" && row.operator_number && row.operator_number !== "-");
      const isConnected = 
        (row.fully_completion_scheme_status && row.fully_completion_scheme_status !== 'Not-Connected' && ['Fully Completed', 'In Progress', 'Connected'].includes(row.fully_completion_scheme_status)) ||
        Number(row.total_villages_integrated || 0) > 0 ||
        Number(row.total_esr_integrated || 0) > 0;

      const item: AlertTrackerItem = {
        fully_completion_scheme_status: row.fully_completion_scheme_status || (isConnected ? 'Connected' : 'Not-Connected'),
        is_connected: isConnected ? 'Connected' : 'Not Connected',
        status: row.fully_completion_scheme_status || (isConnected ? 'Connected' : 'Not Connected'),
        connected_villages: Number(row.total_villages_integrated || 0),
        connected_esrs: Number(row.total_esr_integrated || 0),
        alert_key: `PRES-${row.scheme_id}-${row.village_name}-${row.reservoir_name}`,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        village_name: row.village_name || "-",
        reservoir_name: row.reservoir_name || "-",
        region: row.region,
        circle: row.circle || "-",
        division: row.division || "-",
        sub_division: row.sub_division || "-",
        block: row.block || "-",
        alert_type: "Pressure",
        original_alert_date: alertIsoDate,
        recipient_designation: isEE ? "Executive Engineer" : "Village Operator",
        recipient_name: isEE
          ? (hasEe ? row.ee_name : "-")
          : (row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-"),
        recipient_contact: isEE ? (row.ee_number || "-") : (row.operator_number || "-"),
        recipient_email: row.ee_email || undefined,
        notification_channel: isEE ? ("SMS & Email" as any) : "SMS",
        operator_message_text: DLT_TEMPLATES.PRESSURE_LOW.render(formatSchemeName(row.scheme_name, row.scheme_id), formatVillageAndEsr(row.village_name, row.reservoir_name), parseFloat(row.val_today || '0').toFixed(2)),
        ee_message_text: `सूचना: JJM MVS ${formatSchemeName(row.scheme_name, row.scheme_id)} अंतर्गत ${formatVillageAndEsr(row.village_name, row.reservoir_name)} येथील वितरण व्यवस्थेतील Pressure Sensor नुसार पाण्याचा दाब 0.2 bar पेक्षा कमी असून सध्याचा दाब ${parseFloat(row.val_today || '0').toFixed(2)} bar इतका आहे. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`,
        message_text: isEE
          ? `सूचना: JJM MVS ${formatSchemeName(row.scheme_name, row.scheme_id)} अंतर्गत ${formatVillageAndEsr(row.village_name, row.reservoir_name)} येथील वितरण व्यवस्थेतील Pressure Sensor नुसार पाण्याचा दाब 0.2 bar पेक्षा कमी असून सध्याचा दाब ${parseFloat(row.val_today || '0').toFixed(2)} bar इतका आहे. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`
          : DLT_TEMPLATES.PRESSURE_LOW.render(formatSchemeName(row.scheme_name, row.scheme_id), formatVillageAndEsr(row.village_name, row.reservoir_name), parseFloat(row.val_today || '0').toFixed(2)),
        reading_value: row.val_today !== null ? `${parseFloat(row.val_today).toFixed(2)} Bar` : "No Data",
        delivery_status: (isEE ? hasEe : hasOperator) ? (row.sms_delivery_status || "NOT_DISPATCHED") : "NOT_DISPATCHED",
        sms_sent: isEE ? (hasActualSmsLog && hasEe) : (hasActualSmsLog && hasOperator),
        email_sent: Boolean(isEE && hasActualSmsLog && hasEe && row.ee_email && row.ee_email !== "-"),
        resolution_status: isResolvedNextDay ? "RESOLVED" : isUnresolvedNextDay ? "UNRESOLVED" : "ACTIVE",
        escalated_to_ee: isEE,
        unresolved_since: isUnresolvedNextDay ? `Since ${evalDisplayDate}` : "-",
        escalation_date: isEE ? nextDayDisplayDate : undefined,
        ee_dispatch_date: isEE ? meta.eeEscalationDateStr : undefined,
        sent_date: alertIsoDate,
        sent_at: `${alertIsoDate}T10:30:00.000Z`,
        operator_name: row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-",
        operator_number: row.operator_number || "-",
        ee_name: row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-",
        ee_number: row.ee_number || "-",
        ee_email: row.ee_email || "-",
        chief_se_name: row.chief_se_name && row.chief_se_name !== "-" ? row.chief_se_name : "-",
        chief_se_number: row.chief_se_number || "-",
        operated_by: row.operated_by || "MJP",
        agency_type: row.agency_type || row.operated_by || "MJP",
        remarks_list: schemeRemarks,
        remarks_count: schemeRemarks.length,
        water_value: row.water_today ? Number(row.water_today) : undefined,
        val_latest: row.val_latest !== null ? Number(row.val_latest) : null,
        val_today: row.val_today !== null ? Number(row.val_today) : null,
        val_next: row.val_next !== null ? Number(row.val_next) : null,
      };

      result.pressure.items.push(item);
      result.allAlerts.push(item);
      result.totalDispatchedCount++;

      if (isUnresolvedNextDay) {
        result.pressure.unresolvedItems.push(item);
        result.pressure.escalatedEEItems.push(item);
      } else if (isResolvedNextDay) {
        result.pressure.resolvedItems!.push(item);
      }
    });

    result.pressure.reported = result.pressure.items.length;
    result.pressure.resolved = isNextDayAvailable ? (result.pressure.resolvedItems?.length || 0) : unresolvedPendingText;
    result.pressure.unresolved = isNextDayAvailable ? result.pressure.unresolvedItems.length : unresolvedPendingText;
    result.pressure.unresolvedEE = isNextDayAvailable ? result.pressure.escalatedEEItems.length : escalatedEEPendingText;
    const presStillUnresolved = isCol4Available
      ? result.pressure.unresolvedItems.filter((r: any) => r.val_latest === null || Number(r.val_latest) < 0.20)
      : [];
    result.pressure.unresolvedTillDateItems = presStillUnresolved;
    result.pressure.unresolvedTillDate = isCol4Available
      ? presStillUnresolved.length
      : col4PendingText;
    const presSubsequentResolved = isCol4Available
      ? result.pressure.unresolvedItems.filter((r: any) => r.val_latest !== null && Number(r.val_latest) >= 0.20)
      : [];
    result.pressure.subsequentResolvedItems = presSubsequentResolved;
    result.pressure.subsequentResolved = isCol4Available
      ? presSubsequentResolved.length
      : col4PendingText;

    // Process Chlorine Items
    (chlRes.rows || []).forEach((row: any) => {
      const isResolvedNextDay = isNextDayAvailable && row.val_next !== null && Number(row.val_next) >= 0.20 && Number(row.val_next) <= 0.50;
      const isUnresolvedNextDay = isNextDayAvailable && !isResolvedNextDay;
      const isEE = isUnresolvedNextDay;
      const schemeRemarks = remarksByScheme.get(String(row.scheme_id).trim()) || [];
      const hasActualSmsLog = Boolean(row.sms_delivery_status);
      const hasEe = Boolean(row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer");
      const hasOperator = Boolean(row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" && row.operator_number && row.operator_number !== "-");
      const isConnected = 
        (row.fully_completion_scheme_status && row.fully_completion_scheme_status !== 'Not-Connected' && ['Fully Completed', 'In Progress', 'Connected'].includes(row.fully_completion_scheme_status)) ||
        Number(row.total_villages_integrated || 0) > 0 ||
        Number(row.total_esr_integrated || 0) > 0;

      const item: AlertTrackerItem = {
        fully_completion_scheme_status: row.fully_completion_scheme_status || (isConnected ? 'Connected' : 'Not-Connected'),
        is_connected: isConnected ? 'Connected' : 'Not Connected',
        status: row.fully_completion_scheme_status || (isConnected ? 'Connected' : 'Not Connected'),
        connected_villages: Number(row.total_villages_integrated || 0),
        connected_esrs: Number(row.total_esr_integrated || 0),
        alert_key: `CHL-${row.scheme_id}-${row.village_name}-${row.reservoir_name}`,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        village_name: row.village_name || "-",
        reservoir_name: row.reservoir_name || "-",
        region: row.region,
        circle: row.circle || "-",
        division: row.division || "-",
        sub_division: row.sub_division || "-",
        block: row.block || "-",
        alert_type: "Chlorine",
        original_alert_date: alertIsoDate,
        recipient_designation: isEE ? "Executive Engineer" : "Village Operator",
        recipient_name: isEE
          ? (hasEe ? row.ee_name : "-")
          : (row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-"),
        recipient_contact: isEE ? (row.ee_number || "-") : (row.operator_number || "-"),
        recipient_email: row.ee_email || undefined,
        notification_channel: isEE ? ("SMS & Email" as any) : "SMS",
        operator_message_text: (row.val_today !== null && parseFloat(row.val_today) > 0.50 ? DLT_TEMPLATES.CHLORINE_HIGH : DLT_TEMPLATES.CHLORINE_LOW).render(
          formatSchemeName(row.scheme_name, row.scheme_id),
          formatVillageAndEsr(row.village_name, row.reservoir_name),
          parseFloat(row.val_today || '0').toFixed(2)
        ),
        ee_message_text: `सूचना: JJM MVS ${formatSchemeName(row.scheme_name, row.scheme_id)} अंतर्गत ${formatVillageAndEsr(row.village_name, row.reservoir_name)} येथील वितरण व्यवस्थेत Residual Chlorine ची मात्रा विहित मर्यादेबाहेर असून सध्याची मात्रा ${parseFloat(row.val_today || '0').toFixed(2)} mg/l इतकी आहे. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`,
        message_text: isEE
          ? `सूचना: JJM MVS ${formatSchemeName(row.scheme_name, row.scheme_id)} अंतर्गत ${formatVillageAndEsr(row.village_name, row.reservoir_name)} येथील वितरण व्यवस्थेत Residual Chlorine ची मात्रा विहित मर्यादेबाहेर असून सध्याची मात्रा ${parseFloat(row.val_today || '0').toFixed(2)} mg/l इतकी आहे. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`
          : (row.val_today !== null && parseFloat(row.val_today) > 0.50 ? DLT_TEMPLATES.CHLORINE_HIGH : DLT_TEMPLATES.CHLORINE_LOW).render(
              formatSchemeName(row.scheme_name, row.scheme_id),
              formatVillageAndEsr(row.village_name, row.reservoir_name),
              parseFloat(row.val_today || '0').toFixed(2)
            ),
        reading_value: row.val_today !== null ? `${parseFloat(row.val_today).toFixed(2)} mg/L` : "No Data",
        delivery_status: (isEE ? hasEe : hasOperator) ? (row.sms_delivery_status || "NOT_DISPATCHED") : "NOT_DISPATCHED",
        sms_sent: isEE ? (hasActualSmsLog && hasEe) : (hasActualSmsLog && hasOperator),
        email_sent: Boolean(isEE && hasActualSmsLog && hasEe && row.ee_email && row.ee_email !== "-"),
        resolution_status: isResolvedNextDay ? "RESOLVED" : isUnresolvedNextDay ? "UNRESOLVED" : "ACTIVE",
        escalated_to_ee: isEE,
        unresolved_since: isUnresolvedNextDay ? `Since ${evalDisplayDate}` : "-",
        escalation_date: isEE ? nextDayDisplayDate : undefined,
        ee_dispatch_date: isEE ? meta.eeEscalationDateStr : undefined,
        sent_date: alertIsoDate,
        sent_at: `${alertIsoDate}T10:30:00.000Z`,
        operator_name: row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-",
        operator_number: row.operator_number || "-",
        ee_name: row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-",
        ee_number: row.ee_number || "-",
        ee_email: row.ee_email || "-",
        chief_se_name: row.chief_se_name && row.chief_se_name !== "-" ? row.chief_se_name : "-",
        chief_se_number: row.chief_se_number || "-",
        operated_by: row.operated_by || "MJP",
        agency_type: row.agency_type || row.operated_by || "MJP",
        remarks_list: schemeRemarks,
        remarks_count: schemeRemarks.length,
        water_value: row.water_today ? Number(row.water_today) : undefined,
        val_latest: row.val_latest !== null ? Number(row.val_latest) : null,
        val_today: row.val_today !== null ? Number(row.val_today) : null,
        val_next: row.val_next !== null ? Number(row.val_next) : null,
      };

      result.chlorine.items.push(item);
      result.allAlerts.push(item);
      result.totalDispatchedCount++;

      if (isUnresolvedNextDay) {
        result.chlorine.unresolvedItems.push(item);
        result.chlorine.escalatedEEItems.push(item);
      } else if (isResolvedNextDay) {
        result.chlorine.resolvedItems!.push(item);
      }
    });

    result.chlorine.reported = result.chlorine.items.length;
    result.chlorine.resolved = isNextDayAvailable ? (result.chlorine.resolvedItems?.length || 0) : unresolvedPendingText;
    result.chlorine.unresolved = isNextDayAvailable ? result.chlorine.unresolvedItems.length : unresolvedPendingText;
    result.chlorine.unresolvedEE = isNextDayAvailable ? result.chlorine.escalatedEEItems.length : escalatedEEPendingText;
    const chlStillUnresolved = isCol4Available
      ? result.chlorine.unresolvedItems.filter((r: any) => r.val_latest === null || Number(r.val_latest) < 0.20 || Number(r.val_latest) > 0.50)
      : [];
    result.chlorine.unresolvedTillDateItems = chlStillUnresolved;
    result.chlorine.unresolvedTillDate = isCol4Available
      ? chlStillUnresolved.length
      : col4PendingText;
    const chlSubsequentResolved = isCol4Available
      ? result.chlorine.unresolvedItems.filter((r: any) => r.val_latest !== null && Number(r.val_latest) >= 0.20 && Number(r.val_latest) <= 0.50)
      : [];
    result.chlorine.subsequentResolvedItems = chlSubsequentResolved;
    result.chlorine.subsequentResolved = isCol4Available
      ? chlSubsequentResolved.length
      : col4PendingText;

    // Totals
    result.total.reported = result.lpcd.reported + result.pressure.reported + result.chlorine.reported;
    result.total.resolved = isNextDayAvailable
      ? (Number(result.lpcd.resolved) || 0) + (Number(result.pressure.resolved) || 0) + (Number(result.chlorine.resolved) || 0)
      : unresolvedPendingText;
    result.total.unresolved = isNextDayAvailable
      ? (Number(result.lpcd.unresolved) || 0) + (Number(result.pressure.unresolved) || 0) + (Number(result.chlorine.unresolved) || 0)
      : unresolvedPendingText;
    result.total.unresolvedEE = isNextDayAvailable
      ? (Number(result.lpcd.unresolvedEE) || 0) + (Number(result.pressure.unresolvedEE) || 0) + (Number(result.chlorine.unresolvedEE) || 0)
      : escalatedEEPendingText;
    result.total.unresolvedTillDate = isCol4Available
      ? (Number(result.lpcd.unresolvedTillDate) || 0) + (Number(result.pressure.unresolvedTillDate) || 0) + (Number(result.chlorine.unresolvedTillDate) || 0)
      : col4PendingText;
    result.total.subsequentResolved = isCol4Available
      ? (Number(result.lpcd.subsequentResolved) || 0) + (Number(result.pressure.subsequentResolved) || 0) + (Number(result.chlorine.subsequentResolved) || 0)
      : col4PendingText;

    return result;
  } catch (error) {
    console.error("Error in getAlertTrackerMetrics:", error);
    return result;
  }
}

/**
 * Runs daily evaluation and alert dispatch
 */
export async function runDailyAlertTrackerEscalation(options?: {
  targetDate?: string;
  dryRun?: boolean;
}) {
  await ensureAlertTrackerTables();
  const db = await getDB();
  const dryRun = options?.dryRun ?? false;
  const { isoDate, displayDate, dayIdx, alertDateObj } = getTelemetryDayIndex(options?.targetDate);

  console.log(`[AlertTracker] Running daily alert evaluation for date: ${isoDate} (dryRun=${dryRun})`);

  let operatorsNotified = 0;
  let eeSmsSent = 0;
  let eeEmailsSent = 0;

  try {
    const metricsResult = await getAlertTrackerMetrics({ date: isoDate });
    const allAlerts = metricsResult.allAlerts || [];

    const alertsByEE = new Map<string, { eeName: string; eeMobile: string; eeEmail: string; alerts: AlertTrackerItem[] }>();

    // Collect alerts for EE escalation:
    // If the evaluated date has alerts already flagged for EE, use them.
    // If the evaluated date's alerts are still in their initial 24-hr operator window (e.g. evaluating 27th Oct),
    // fetch the unresolved alerts from the prior observation day (e.g. 26th Oct, which evaluated 25th data)
    // which have completed their 24-hr window and are due for EE escalation TODAY!
    let eeEscalationAlerts = allAlerts.filter((item) => item.escalated_to_ee);
    if (eeEscalationAlerts.length === 0) {
      const prevDateObj = new Date(alertDateObj.getTime() - 86400000);
      const prevIsoDate = `${prevDateObj.getUTCFullYear()}-${String(prevDateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(prevDateObj.getUTCDate()).padStart(2, "0")}`;
      const prevMetrics = await getAlertTrackerMetrics({ date: prevIsoDate });
      eeEscalationAlerts = (prevMetrics.allAlerts || []).filter((item) => item.escalated_to_ee);
    }

    for (const item of eeEscalationAlerts) {
      const eeName = (item.ee_name && item.ee_name !== '-') ? item.ee_name : "Executive Engineer";
      // Key by EE name or number so each distinct Executive Engineer receives their own email,
      // even if multiple dummy test EEs share the same email inbox.
      const eeKey = ((item.ee_name && item.ee_name !== '-') 
        ? item.ee_name 
        : (item.ee_number && item.ee_number !== '-') 
          ? item.ee_number 
          : item.ee_email || "unknown").toLowerCase().trim();

      if (!alertsByEE.has(eeKey)) {
        alertsByEE.set(eeKey, {
          eeName,
          eeMobile: item.ee_number || "",
          eeEmail: item.ee_email || "",
          alerts: [],
        });
      }
      alertsByEE.get(eeKey)!.alerts.push(item);
    }

    if (!dryRun) {
      // 1. Dispatch Operator alerts DAILY for all reported alerts
      for (const item of allAlerts) {
        operatorsNotified++;
        let deliveryStatus = "NOT_DISPATCHED";
        let gatewayStatus: number | null = null;
        let gatewayResponse: string | null = null;
        let messageText = item.message_text || "Daily alert notification";

        if (item.operator_number && item.operator_number !== "-") {
          try {
            const schemeVal = formatSchemeName(item.scheme_name, item.scheme_id);
            let dltId = DLT_TEMPLATES.LPCD_LOW.contentId;

            if (item.alert_type === "Pressure") {
              const villageAndEsr = formatVillageAndEsr(item.village_name, item.reservoir_name);
              const numVal = item.reading_value.replace(/[^0-9.]/g, '') || "0.15";
              messageText = DLT_TEMPLATES.PRESSURE_LOW.render(schemeVal, villageAndEsr, numVal);
              dltId = DLT_TEMPLATES.PRESSURE_LOW.contentId;
            } else if (item.alert_type === "Chlorine") {
              const villageAndEsr = formatVillageAndEsr(item.village_name, item.reservoir_name);
              const numVal = parseFloat(item.reading_value.replace(/[^0-9.]/g, '') || "0.1");
              if (numVal > 0.50) {
                messageText = DLT_TEMPLATES.CHLORINE_HIGH.render(schemeVal, villageAndEsr, numVal);
                dltId = DLT_TEMPLATES.CHLORINE_HIGH.contentId;
              } else {
                messageText = DLT_TEMPLATES.CHLORINE_LOW.render(schemeVal, villageAndEsr, numVal);
                dltId = DLT_TEMPLATES.CHLORINE_LOW.contentId;
              }
            } else {
              const villageVal = formatVillageName(item.village_name);
              const numVal = item.reading_value.replace(/[^0-9.]/g, '') || "40";
              messageText = DLT_TEMPLATES.LPCD_LOW.render(schemeVal, villageVal, numVal);
              dltId = DLT_TEMPLATES.LPCD_LOW.contentId;
            }

            const smsRes = await sendSmartpingDLTSMS({ mobile: item.operator_number, text: messageText, dltContentId: dltId });
            gatewayStatus = smsRes.status || (smsRes.success ? 200 : 400);
            gatewayResponse = smsRes.response || smsRes.error || null;
            deliveryStatus = smsRes.success ? "DELIVERY_SUCCESS" : "DELIVERY_FAILED";
          } catch (smsErr: any) {
            console.warn("Operator SMS warning:", smsErr);
            deliveryStatus = "DELIVERY_FAILED";
            gatewayStatus = 500;
            gatewayResponse = smsErr.message || "Network error";
          }
        }

        await db.execute(sql`
          INSERT INTO alert_tracker_logs (
            alert_key, scheme_id, scheme_name, alert_type, region, circle, division, sub_division, block,
            village_name, reservoir_name, original_alert_date,
            recipient_designation, recipient_name, recipient_contact,
            notification_channel, message_text, telemetry_value,
            delivery_status, gateway_status, gateway_response, resolution_status, escalated_to_ee,
            sent_date, sent_at
          ) VALUES (
            ${item.alert_key}, ${item.scheme_id}, ${item.scheme_name}, ${item.alert_type},
            ${item.region || 'Maharashtra'}, ${item.circle || '-'}, ${item.division || '-'}, ${item.sub_division || '-'}, ${item.block || '-'},
            ${item.village_name || '-'}, ${item.reservoir_name || '-'}, ${item.original_alert_date}::date,
            'Village Operator', ${item.operator_name || 'Village Operator'}, ${item.operator_number || '-'},
            'SMS', ${messageText}, ${item.reading_value},
            ${deliveryStatus}, ${gatewayStatus}, ${gatewayResponse}, ${item.resolution_status}, false,
            ${isoDate}::date, NOW()
          );
        `);
      }

      // 2. Dispatch EE notifications ONLY from scheme_operator_details
      for (const [eeKey, eeData] of alertsByEE.entries()) {
        const { eeName, eeMobile, eeEmail, alerts } = eeData;
        const totalUnresolved = alerts.length;
        let eeSmsDeliveryStatus = "NOT_DISPATCHED";
        let eeSmsGatewayStatus: number | null = null;
        let eeSmsGatewayResponse: string | null = null;
        let eeEmailDeliveryStatus = "NOT_DISPATCHED";

        if (eeMobile && eeMobile !== "-") {
          try {
            const firstScheme = formatSchemeName(alerts[0]?.scheme_name, alerts[0]?.scheme_id);
            const smsMsg = DLT_TEMPLATES.ESCALATION_EE_CE.render(firstScheme, 1, totalUnresolved, `एकूण ${totalUnresolved} तांत्रिक बाबी प्रलंबित आहेत`);
            const smsRes = await sendSmartpingDLTSMS({ mobile: eeMobile, text: smsMsg, dltContentId: DLT_TEMPLATES.ESCALATION_EE_CE.contentId });
            eeSmsGatewayStatus = smsRes.status || (smsRes.success ? 200 : 400);
            eeSmsGatewayResponse = smsRes.response || smsRes.error || null;
            eeSmsDeliveryStatus = smsRes.success ? "DELIVERY_SUCCESS" : "DELIVERY_FAILED";
            if (smsRes.success) eeSmsSent++;
          } catch (smsErr: any) {
            console.warn("EE SMS dispatch warning:", smsErr);
            eeSmsDeliveryStatus = "DELIVERY_FAILED";
            eeSmsGatewayStatus = 500;
            eeSmsGatewayResponse = smsErr.message || "Network error";
          }
        }

        if (eeEmail && eeEmail.includes("@")) {
          try {
            const baseUrl = process.env.APP_BASE_URL || 'https://dashboard1.mahajaliot.in';
            // Group alerts scheme-wise (sorted by scheme_name, then village_name)
            const sortedAlerts = [...alerts].sort((a, b) => {
              const sComp = (a.scheme_name || '').localeCompare(b.scheme_name || '');
              if (sComp !== 0) return sComp;
              return (a.village_name || '').localeCompare(b.village_name || '');
            });

            const tableRows = sortedAlerts.map((a, idx) => {
              const issues: string[] = [];
              if (a.alert_type === "Chlorine") {
                const cClean = String(a.reading_value || "0").replace(/[^0-9.]/g, '');
                const cVal = parseFloat(cClean);
                const dispC = String(a.reading_value || "").toLowerCase().includes("mg/l")
                  ? a.reading_value
                  : `${a.reading_value} mg/L`;
                if (cVal > 0.5) {
                  issues.push(`<span style="color: #7c3aed; font-weight: bold;">High Chlorine:</span> ${dispC} (Above 0.5)`);
                } else {
                  issues.push(`<span style="color: #dc2626; font-weight: bold;">Low Chlorine:</span> ${dispC} (Below 0.2)`);
                }
              } else if (a.alert_type === "Pressure") {
                const dispP = String(a.reading_value || "").toLowerCase().includes("bar")
                  ? a.reading_value
                  : `${a.reading_value} Bar`;
                issues.push(`<span style="color: #dc2626; font-weight: bold;">Low Pressure:</span> ${dispP} (Below 0.2)`);
              } else {
                issues.push(`<span style="color: #ea580c; font-weight: bold;">Low LPCD:</span> ${a.reading_value} (Below 55)`);
              }

              if (a.unresolved_since) {
                issues.push(
                  `<span style="display: inline-block; background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-top: 4px;">` +
                  `🚨 Unresolved since ${a.unresolved_since} (Escalated to EE)` +
                  `</span>`
                );
              }

              return `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fffafb;">
                  <td style="padding: 10px; color: #1e293b; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center;">
                    ${idx + 1}
                  </td>
                  <td style="padding: 10px; color: #1e293b; border: 1px solid #cbd5e1; vertical-align: middle;">
                    <strong>${a.scheme_name}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">${a.village_name || 'N/A'} (ID: ${a.scheme_id})</span>
                  </td>
                  <td style="padding: 10px; color: #1e293b; border: 1px solid #cbd5e1; vertical-align: middle;">
                    ${a.reservoir_name || '-'}
                  </td>
                  <td style="padding: 10px; color: #1e293b; border: 1px solid #cbd5e1; vertical-align: middle;">
                    ${issues.length > 0 ? issues.join('<br>') : '<span style="color: #64748b;">Critical Alert</span>'}
                  </td>
                </tr>
              `;
            }).join("");

            const alertsHtml = `
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #cbd5e1; font-size: 13px;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 10px; text-align: center; font-weight: bold; color: #475569; width: 30px; border: 1px solid #cbd5e1;">#</th>
                    <th style="padding: 10px; text-align: left; font-weight: bold; color: #475569; border: 1px solid #cbd5e1;">Scheme / Village</th>
                    <th style="padding: 10px; text-align: left; font-weight: bold; color: #475569; border: 1px solid #cbd5e1;">ESR</th>
                    <th style="padding: 10px; text-align: left; font-weight: bold; color: #475569; border: 1px solid #cbd5e1;">Critical Issues</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            `;

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0;">
                <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">⚠️ JJM SWSM IoT Maharashtra</h1>
                  <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">DAILY CRITICAL ALERTS REPORT</p>
                </div>

                <div style="padding: 30px; background-color: #ffffff;">
                  <h2 style="color: #1f2937; margin-top: 0;">Hello ${eeName},</h2>
                  <p style="color: #374151; font-size: 16px;">The following schemes assigned to you have critical parameters falling below acceptable thresholds as of (${displayDate}).</p>

                  ${alertsHtml}

                  <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>⏰ Action Required:</strong></p>
                    <p style="margin: 5px 0 0 0; color: #92400e;">Please review these schemes immediately to resolve the underlying issues. If the issue persists after 48 hours please visit <a href="${baseUrl.replace(/\/$/, '')}/helpdesk/issue-reporting" style="color: #2563eb; text-decoration: underline;">Issue Reporting</a> and record your remark.</p>
                  </div>

                  <p style="color: #374151; font-size: 13px;">This is an automated notification from Maharashtra Water Infrastructure Management Platform.</p>
                </div>
              </div>
            `;

            const primarySchemeName = alerts[0]?.scheme_name ? `${alerts[0].scheme_name} (ID: ${alerts[0].scheme_id})` : '';
            const emailSubject = alerts.length === 1 && primarySchemeName
              ? `🚨 Critical Water Scheme Alert - ${primarySchemeName}`
              : `🚨 Critical Water Scheme Alerts - ${totalUnresolved} Issues Across Schemes`;

            const emailSuccess = await sendEmail({
              to: eeEmail,
              from: "Mahajal IoT Alert",
              subject: emailSubject,
              html: emailHtml,
              headers: {
                "X-Priority": "1",
              },
            });
            eeEmailDeliveryStatus = emailSuccess ? "DELIVERY_SUCCESS" : "DELIVERY_FAILED";
            if (emailSuccess) eeEmailsSent++;

            // Also record into consolidated_email_dispatches for unified audit trail
            try {
              const uniqueSchemes = Array.from(new Set(alerts.map((a) => a.scheme_id)));
              const uniqueSchemeNames = Array.from(new Set(alerts.map((a) => a.scheme_name)));
              await db.execute(sql`
                INSERT INTO consolidated_email_dispatches (
                  dispatch_date, sent_time, engineer_name, engineer_email, engineer_role, engineer_mobile,
                  total_schemes, scheme_ids, scheme_names, total_alerts,
                  lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count,
                  subject, status
                ) VALUES (
                  ${isoDate}::date, TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM'),
                  ${eeName}, ${eeEmail}, 'Executive Engineer', ${eeMobile || '-'},
                  ${uniqueSchemes.length}, ${JSON.stringify(uniqueSchemes)}::jsonb, ${JSON.stringify(uniqueSchemeNames)}::jsonb, ${totalUnresolved},
                  ${alerts.filter(a => a.alert_type === 'LPCD').length},
                  ${alerts.filter(a => a.alert_type === 'Chlorine').length},
                  ${alerts.filter(a => a.alert_type === 'Pressure').length},
                  ${emailSubject},
                  ${emailSuccess ? 'SENT' : 'FAILED'}
                );
              `);
            } catch (cdErr) {
              console.warn("Could not insert EE email into consolidated_email_dispatches:", cdErr);
            }
          } catch (emailErr) {
            console.warn("EE Email dispatch warning:", emailErr);
            eeEmailDeliveryStatus = "DELIVERY_FAILED";
          }
        }

        // Log EE notifications
        for (const item of alerts) {
          await db.execute(sql`
            INSERT INTO alert_tracker_logs (
              alert_key, scheme_id, scheme_name, alert_type, region, circle, division, sub_division, block,
              village_name, reservoir_name, original_alert_date,
              recipient_designation, recipient_name, recipient_contact,
              notification_channel, message_text, telemetry_value,
              delivery_status, gateway_status, gateway_response, resolution_status, escalated_to_ee, escalation_date,
              sent_date, sent_at
            ) VALUES (
              ${item.alert_key}, ${item.scheme_id}, ${item.scheme_name}, ${item.alert_type},
              ${item.region || 'Maharashtra'}, ${item.circle || '-'}, ${item.division || '-'}, ${item.sub_division || '-'}, ${item.block || '-'},
              ${item.village_name || '-'}, ${item.reservoir_name || '-'}, ${item.original_alert_date}::date,
              'Executive Engineer', ${eeName}, ${eeMobile || '-'},
              'SMS & Email', 'Unresolved issue escalation notification', ${item.reading_value},
              ${eeSmsDeliveryStatus}, ${eeSmsGatewayStatus}, ${eeSmsGatewayResponse}, 'UNRESOLVED', true, ${isoDate}::date,
              ${isoDate}::date, NOW()
            );
          `);
        }
      }
    } else {
      operatorsNotified = allAlerts.filter((i) => !i.escalated_to_ee).length;
      eeSmsSent = alertsByEE.size;
      eeEmailsSent = alertsByEE.size;
    }

    lastCronRunAt = new Date().toISOString();
    lastCronResult = {
      success: true,
      processedDate: isoDate,
      totalAlerts: allAlerts.length,
      operatorsNotified,
      eeSmsSent,
      eeEmailsSent,
      totalEEsNotified: alertsByEE.size,
      dryRun,
    };

    return lastCronResult;
  } catch (err: any) {
    console.error("[AlertTracker] Error in runDailyAlertTrackerEscalation:", err);
    return {
      success: false,
      error: err.message,
      processedDate: isoDate,
    };
  }
}

/**
 * Returns current schedule status for Alert Tracker
 */
export async function getAlertTrackerCronStatus() {
  const rawSchedule = (process.env.ALERT_TRACKER_CRON_SCHEDULE || process.env.DAILY_ALERTS_CRON_SCHEDULE || "45 10 * * *").replace(/^['"]+|['"]+$/g, '').trim();
  return {
    status: isCronRunning ? "active" : "idle",
    lastRun: lastCronRunAt,
    lastResult: lastCronResult,
    schedule: `Daily at ${rawSchedule} IST`,
  };
}

/**
 * Starts the daily Alert Tracker & EE Escalation Cron
 */
export function startAlertTrackerEscalationCron() {
  if (isCronRunning) return;
  const rawSchedule = (process.env.ALERT_TRACKER_CRON_SCHEDULE || process.env.DAILY_ALERTS_CRON_SCHEDULE || "45 10 * * *").replace(/^['"]+|['"]+$/g, '').trim();
  
  try {
    cron.schedule(
      rawSchedule,
      async () => {
        try {
          console.log(`⏰ [AlertTracker Cron] Triggering scheduled daily alert tracker evaluation for ${rawSchedule} IST`);
          await runDailyAlertTrackerEscalation();
        } catch (err) {
          console.error("[AlertTracker Cron] Scheduled job failed:", err);
        }
      },
      {
        timezone: "Asia/Kolkata",
      }
    );
    isCronRunning = true;
    console.log(`✅ Alert Tracker & EE Escalation Cron initialized (Pattern: "${rawSchedule}" IST)`);
  } catch (cronErr) {
    console.error("⚠️ Failed to initialize Alert Tracker cron schedule:", cronErr);
  }
}
