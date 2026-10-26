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
  water_value?: number | string;
  val_latest?: number | null;
  val_today?: number | null;
  val_next?: number | null;
}

export interface AlertCategorySummary {
  reported: number; // Alerts for Selected Date
  unresolved: number | string; // Repeated from next day or pending text
  unresolvedEE: number | string; // Escalated to Executive Engineer or pending text
  unresolvedSince: string; // "Since Yesterday" or date
  resolved: number | string;
  unresolvedTillDate: number | string;
  unresolvedTillDateItems?: AlertTrackerItem[];
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
  let dayNum = 25; // Default to latest telemetry day in database (25-Oct)
  let monthNum = 10;
  let yearNum = 2026;

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

  // Days 1-7 in water_scheme_data are 19-Oct (day 1) to 25-Oct (day 7)
  let dayIdx = 7;
  if (dayNum >= 19 && dayNum <= 25 && monthNum === 10 && yearNum === 2026) {
    dayIdx = dayNum - 18;
  } else if (dayNum <= 18) {
    dayIdx = 1;
  } else {
    dayIdx = 7;
  }

  const isoDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
  const displayDate = `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}/${yearNum}`;

  const targetDateObj = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
  const nextDateObj = new Date(targetDateObj.getTime() + 86400000);
  const eeEscalationDateObj = new Date(targetDateObj.getTime() + 2 * 86400000);
  const col4DateObj = new Date(targetDateObj.getTime() + 3 * 86400000);

  const nextDayIsoDate = nextDateObj.toISOString().slice(0, 10);
  const nextDayDisplayDate = `${String(nextDateObj.getUTCDate()).padStart(2, "0")}/${String(nextDateObj.getUTCMonth() + 1).padStart(2, "0")}/${nextDateObj.getUTCFullYear()}`;

  // Current local IST date (UTC + 5:30)
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const todayIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

  // Next day data is in database only if dayIdx < 7 (Day 7 = 25-Oct, the latest day currently in DB)
  const isNextDayAvailable = dayIdx < 7 && todayIST >= eeEscalationDateObj;
  const isCol4Available = dayIdx <= 6 && todayIST >= col4DateObj;

  const eeDayOrdinal = getOrdinal(eeEscalationDateObj.getUTCDate());
  const eeMonthShort = MONTHS_SHORT[eeEscalationDateObj.getUTCMonth()];
  const col4DayOrdinal = getOrdinal(col4DateObj.getUTCDate());
  const col4MonthShort = MONTHS_SHORT[col4DateObj.getUTCMonth()];

  const unresolvedPendingText = `Will be displayed on ${eeDayOrdinal} ${eeMonthShort}`;
  const escalatedEEPendingText = `Will be displayed on ${eeDayOrdinal} ${eeMonthShort}`;
  const col4PendingText = `Will be displayed on ${col4DayOrdinal} ${col4MonthShort}`;

  const dayWithOrdinal = getOrdinal(dayNum);
  const month = MONTHS_FULL[monthNum - 1];

  return {
    dayIdx,
    isoDate,
    displayDate,
    nextDayIsoDate,
    nextDayDisplayDate,
    dayWithOrdinal,
    month,
    year: yearNum,
    isNextDayAvailable,
    isCol4Available,
    unresolvedPendingText,
    escalatedEEPendingText,
    col4PendingText,
    eeEscalationDateStr: `${eeDayOrdinal} ${eeMonthShort}`,
    col4DateStr: `${col4DayOrdinal} ${col4MonthShort}`,
    prevDisplayDate: displayDate,
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
    dayIdx,
    isoDate,
    displayDate,
    nextDayDisplayDate,
    isNextDayAvailable,
    isCol4Available,
    unresolvedPendingText,
    escalatedEEPendingText,
    col4PendingText,
  } = meta;

  const region = params.region && params.region.toLowerCase() !== "all" ? params.region.trim() : null;
  const rawAgency = params.agency ? params.agency.trim() : null;
  const isAllAgency = !rawAgency || rawAgency.toUpperCase() === "ALL" || rawAgency.toUpperCase() === "ALL AGENCY" || rawAgency.toLowerCase() === "all agencies";
  const agency = isAllAgency ? null : rawAgency;

  const result: AlertTrackerMetricsResult & { allAlerts: AlertTrackerItem[]; totalDispatchedCount: number } = {
    lpcd: {
      reported: 0,
      unresolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedEE: isNextDayAvailable ? 0 : escalatedEEPendingText,
      unresolvedSince: isNextDayAvailable ? `Since ${displayDate}` : "-",
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      unresolvedTillDateItems: [],
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
      unresolvedSince: isNextDayAvailable ? `Since ${displayDate}` : "-",
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      unresolvedTillDateItems: [],
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
      unresolvedSince: isNextDayAvailable ? `Since ${displayDate}` : "-",
      resolved: isNextDayAvailable ? 0 : unresolvedPendingText,
      unresolvedTillDate: isCol4Available ? 0 : col4PendingText,
      unresolvedTillDateItems: [],
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
      unresolvedSince: isNextDayAvailable ? `Since ${displayDate}` : "-",
    },
    allAlerts: [],
    totalDispatchedCount: 0,
    dateMeta: meta,
  };

  try {
    const nextDayIdx = Math.min(7, dayIdx + 1);
    const lpcdCol = `w.lpcd_value_day${dayIdx}`;
    const lpcdNextCol = `w.lpcd_value_day${nextDayIdx}`;
    const lpcdLatestCol = `w.lpcd_value_day7`;

    const chlCol = `c.chlorine_value_${dayIdx}`;
    const chlNextCol = `c.chlorine_value_${nextDayIdx}`;
    const chlLatestCol = `c.chlorine_value_7`;

    const presCol = `p.pressure_value_${dayIdx}`;
    const presNextCol = `p.pressure_value_${nextDayIdx}`;
    const presLatestCol = `p.pressure_value_7`;

    const waterCol = `wc.water_value_day${dayIdx}`;
    const waterNextCol = `wc.water_value_day${nextDayIdx}`;

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

    const commSchemeIds = await getFilteredSchemeIds(db, "commissioned");
    const commSchemeIdsList =
      commSchemeIds && commSchemeIds.length > 0
        ? commSchemeIds.map((id: string) => `'${id}'`).join(",")
        : null;

    const lpcdRegionClause = region ? sql`AND (w.region ILIKE ${`%${region}%`} OR ss.region ILIKE ${`%${region}%`})` : sql``;
    const presRegionClause = region ? sql`AND (p.region ILIKE ${`%${region}%`} OR ss.region ILIKE ${`%${region}%`})` : sql``;
    const chlRegionClause = region ? sql`AND (c.region ILIKE ${`%${region}%`} OR ss.region ILIKE ${`%${region}%`})` : sql``;

    let agencyClause = sql``;
    if (agency) {
      const a = agency.toLowerCase();
      if (a === "zp") {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE 'ZP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%ZP%')`;
      } else if (a.includes("shikhar") || a.includes("shikar")) {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%shikhar%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%shikar%')`;
      } else if (a.includes("gram") || a === "gp") {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE 'GP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%gram%')`;
      } else if (a.includes("mjp")) {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%MJP%')`;
      } else if (a.includes("contractor")) {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%Contractor%')`;
      } else {
        agencyClause = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE ${`%${agency}%`})`;
      }
    }

    const [lpcdRes, presRes, chlRes]: any = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT ON (w.scheme_id, LOWER(TRIM(w.village_name)))
          w.scheme_id,
          COALESCE(ss.scheme_name, w.scheme_name, 'Scheme ' || w.scheme_id) as scheme_name,
          w.village_name,
          COALESCE(w.region, ss.region, 'Unknown') as region,
          w.circle, w.division, w.sub_division, w.block,
          ${sql.raw(lpcdCol)} as val_today,
          ${sql.raw(lpcdNextCol)} as val_next,
          ${sql.raw(lpcdLatestCol)} as val_latest,
          sod.operator_name,
          sod.operator_number,
          COALESCE(NULLIF(sod.ee_name, '-'), sod_ee.ee_name) as ee_name,
          COALESCE(NULLIF(sod.ee_number, '-'), sod_ee.ee_number) as ee_number,
          COALESCE(NULLIF(sod.ee_email, '-'), sod_ee.ee_email) as ee_email,
          COALESCE(NULLIF(sod.chief_se_name, '-'), sod_ee.chief_se_name) as chief_se_name,
          COALESCE(NULLIF(sod.chief_se_number, '-'), sod_ee.chief_se_number) as chief_se_number,
          COALESCE(ss.agency, ss.agency_type, sod.operated_by, 'MJP') as operated_by,
          (
            SELECT a.delivery_status 
            FROM alert_tracker_logs a 
            WHERE a.scheme_id = w.scheme_id 
              AND a.gateway_status IS NOT NULL
              AND (a.sent_date = ${isoDate}::date OR a.original_alert_date = ${isoDate}::date)
            ORDER BY a.id DESC LIMIT 1
          ) as sms_delivery_status
        FROM water_scheme_data w
        JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name, region, agency_type, agency
          FROM scheme_status 
          WHERE water_supply = 'Yes'
          ORDER BY scheme_id
        ) ss ON ss.scheme_id = w.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) scheme_id, village_name, operator_name, operator_number, ee_name, ee_number, ee_email, chief_se_name, chief_se_number, operated_by
          FROM scheme_operator_details
          ORDER BY scheme_id, LOWER(TRIM(village_name))
        ) sod ON sod.scheme_id = w.scheme_id AND LOWER(TRIM(sod.village_name)) = LOWER(TRIM(w.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, ee_name, ee_number, ee_email, chief_se_name, chief_se_number
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY scheme_id
        ) sod_ee ON sod_ee.scheme_id = w.scheme_id
        WHERE ${sql.raw(lpcdCol)} IS NOT NULL AND ${sql.raw(lpcdCol)} >= 0 AND ${sql.raw(lpcdCol)} < 55
          ${lpcdRegionClause}
          ${agencyClause}
        ORDER BY w.scheme_id, LOWER(TRIM(w.village_name)), ${sql.raw(lpcdCol)} ASC;
      `),
      db.execute(sql`
        WITH comm_with_water AS (
          SELECT 
            cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
            cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name,
            wc.water_value_day${sql.raw(String(dayIdx))} as water_val,
            wc.water_value_day${sql.raw(String(nextDayIdx))} as water_next_val
          FROM communication_status cs
          LEFT JOIN water_consumption wc ON (
            cs.region = wc.region AND
            cs.circle = wc.circle AND
            cs.division = wc.division AND
            cs.sub_division = wc.sub_division AND
            cs.block = wc.block AND
            cs.scheme_id = wc.scheme_id AND
            cs.scheme_name = wc.scheme_name AND
            cs.village_name = wc.village_name AND
            cs.esr_name = wc.esr_name
          )
          WHERE ${commSchemeIdsList ? sql`cs.scheme_id IN (${sql.raw(commSchemeIdsList)})` : sql`1=1`}
            AND cs.pressure_connected = 'Connected'
            AND cs.pressure_status = 'Online'
            AND wc.water_value_day${sql.raw(String(dayIdx))} IS NOT NULL 
            AND wc.water_value_day${sql.raw(String(dayIdx))} > 0
        )
        SELECT 
          p.scheme_id,
          COALESCE(ss.scheme_name, p.scheme_name, 'Scheme ' || p.scheme_id) as scheme_name,
          p.village_name,
          p.esr_name as reservoir_name,
          COALESCE(p.region, ss.region, 'Unknown') as region,
          p.circle, p.division, p.sub_division, p.block,
          ${sql.raw(presCol)} as val_today,
          ${sql.raw(presNextCol)} as val_next,
          ${sql.raw(presLatestCol)} as val_latest,
          cw.water_val as water_today,
          cw.water_next_val as water_next,
          sod.operator_name,
          sod.operator_number,
          COALESCE(NULLIF(sod.ee_name, '-'), sod_ee.ee_name) as ee_name,
          COALESCE(NULLIF(sod.ee_number, '-'), sod_ee.ee_number) as ee_number,
          COALESCE(NULLIF(sod.ee_email, '-'), sod_ee.ee_email) as ee_email,
          COALESCE(NULLIF(sod.chief_se_name, '-'), sod_ee.chief_se_name) as chief_se_name,
          COALESCE(NULLIF(sod.chief_se_number, '-'), sod_ee.chief_se_number) as chief_se_number,
          COALESCE(ss.agency, ss.agency_type, sod.operated_by, 'MJP') as operated_by,
          (
            SELECT a.delivery_status 
            FROM alert_tracker_logs a 
            WHERE a.scheme_id = p.scheme_id 
              AND a.gateway_status IS NOT NULL
              AND (a.sent_date = ${isoDate}::date OR a.original_alert_date = ${isoDate}::date)
            ORDER BY a.id DESC LIMIT 1
          ) as sms_delivery_status
        FROM comm_with_water cw
        JOIN pressure_data p ON (
          (cw.scheme_id = p.scheme_id AND LOWER(TRIM(cw.village_name)) = LOWER(TRIM(p.village_name)) AND LOWER(TRIM(cw.esr_name)) = LOWER(TRIM(p.esr_name)))
          OR
          (cw.region = p.region AND cw.circle = p.circle AND cw.division = p.division AND cw.sub_division = p.sub_division AND cw.block = p.block AND LOWER(TRIM(cw.village_name)) = LOWER(TRIM(p.village_name)) AND LOWER(TRIM(cw.esr_name)) = LOWER(TRIM(p.esr_name)))
        )
        JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name, region, agency_type, agency
          FROM scheme_status 
          WHERE water_supply = 'Yes'
          ORDER BY scheme_id
        ) ss ON ss.scheme_id = p.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) scheme_id, village_name, operator_name, operator_number, ee_name, ee_number, ee_email, chief_se_name, chief_se_number, operated_by
          FROM scheme_operator_details
          ORDER BY scheme_id, LOWER(TRIM(village_name))
        ) sod ON sod.scheme_id = p.scheme_id AND LOWER(TRIM(sod.village_name)) = LOWER(TRIM(p.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, ee_name, ee_number, ee_email, chief_se_name, chief_se_number
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY scheme_id
        ) sod_ee ON sod_ee.scheme_id = p.scheme_id
        WHERE ${sql.raw(presCol)} IS NOT NULL AND ${sql.raw(presCol)} < 0.20
          ${presRegionClause}
          ${agencyClause}
        ORDER BY p.scheme_id, LOWER(TRIM(p.village_name)), LOWER(TRIM(COALESCE(p.esr_name, ''))), ${sql.raw(presCol)} ASC;
      `),
      db.execute(sql`
        WITH comm_with_water AS (
          SELECT 
            cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
            cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name,
            wc.water_value_day${sql.raw(String(dayIdx))} as water_val,
            wc.water_value_day${sql.raw(String(nextDayIdx))} as water_next_val
          FROM communication_status cs
          LEFT JOIN water_consumption wc ON (
            cs.region = wc.region AND
            cs.circle = wc.circle AND
            cs.division = wc.division AND
            cs.sub_division = wc.sub_division AND
            cs.block = wc.block AND
            cs.scheme_id = wc.scheme_id AND
            cs.scheme_name = wc.scheme_name AND
            cs.village_name = wc.village_name AND
            cs.esr_name = wc.esr_name
          )
          WHERE ${commSchemeIdsList ? sql`cs.scheme_id IN (${sql.raw(commSchemeIdsList)})` : sql`1=1`}
            AND cs.chlorine_connected = 'Connected'
            AND cs.chlorine_status = 'Online'
            AND wc.water_value_day${sql.raw(String(dayIdx))} IS NOT NULL 
            AND wc.water_value_day${sql.raw(String(dayIdx))} > 0
        )
        SELECT 
          c.scheme_id,
          COALESCE(ss.scheme_name, c.scheme_name, 'Scheme ' || c.scheme_id) as scheme_name,
          c.village_name,
          c.esr_name as reservoir_name,
          COALESCE(c.region, ss.region, 'Unknown') as region,
          c.circle, c.division, c.sub_division, c.block,
          ${sql.raw(chlCol)} as val_today,
          ${sql.raw(chlNextCol)} as val_next,
          ${sql.raw(chlLatestCol)} as val_latest,
          cw.water_val as water_today,
          cw.water_next_val as water_next,
          sod.operator_name,
          sod.operator_number,
          COALESCE(NULLIF(sod.ee_name, '-'), sod_ee.ee_name) as ee_name,
          COALESCE(NULLIF(sod.ee_number, '-'), sod_ee.ee_number) as ee_number,
          COALESCE(NULLIF(sod.ee_email, '-'), sod_ee.ee_email) as ee_email,
          COALESCE(NULLIF(sod.chief_se_name, '-'), sod_ee.chief_se_name) as chief_se_name,
          COALESCE(NULLIF(sod.chief_se_number, '-'), sod_ee.chief_se_number) as chief_se_number,
          COALESCE(ss.agency, ss.agency_type, sod.operated_by, 'MJP') as operated_by,
          (
            SELECT a.delivery_status 
            FROM alert_tracker_logs a 
            WHERE a.scheme_id = c.scheme_id 
              AND a.gateway_status IS NOT NULL
              AND (a.sent_date = ${isoDate}::date OR a.original_alert_date = ${isoDate}::date)
            ORDER BY a.id DESC LIMIT 1
          ) as sms_delivery_status
        FROM comm_with_water cw
        JOIN chlorine_data c ON (
          (cw.scheme_id = c.scheme_id AND LOWER(TRIM(cw.village_name)) = LOWER(TRIM(c.village_name)) AND LOWER(TRIM(cw.esr_name)) = LOWER(TRIM(c.esr_name)))
          OR
          (cw.region = c.region AND cw.circle = c.circle AND cw.division = c.division AND cw.sub_division = c.sub_division AND cw.block = c.block AND LOWER(TRIM(cw.village_name)) = LOWER(TRIM(c.village_name)) AND LOWER(TRIM(cw.esr_name)) = LOWER(TRIM(c.esr_name)))
        )
        JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name, region, agency_type, agency
          FROM scheme_status 
          WHERE water_supply = 'Yes'
          ORDER BY scheme_id
        ) ss ON ss.scheme_id = c.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) scheme_id, village_name, operator_name, operator_number, ee_name, ee_number, ee_email, chief_se_name, chief_se_number, operated_by
          FROM scheme_operator_details
          ORDER BY scheme_id, LOWER(TRIM(village_name))
        ) sod ON sod.scheme_id = c.scheme_id AND LOWER(TRIM(sod.village_name)) = LOWER(TRIM(c.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id) scheme_id, ee_name, ee_number, ee_email, chief_se_name, chief_se_number
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY scheme_id
        ) sod_ee ON sod_ee.scheme_id = c.scheme_id
        WHERE ${sql.raw(chlCol)} IS NOT NULL AND (${sql.raw(chlCol)} < 0.20 OR ${sql.raw(chlCol)} > 0.50)
          ${chlRegionClause}
          ${agencyClause}
        ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(COALESCE(c.esr_name, ''))), ${sql.raw(chlCol)} ASC;
      `),
    ]);

    // Process LPCD Items
    (lpcdRes.rows || []).forEach((row: any) => {
      const isUnresolvedNextDay = isNextDayAvailable && row.val_next !== null && Number(row.val_next) >= 0 && Number(row.val_next) < 55;
      const isResolvedNextDay = isNextDayAvailable && !isUnresolvedNextDay;
      const isEE = isUnresolvedNextDay;
      const schemeRemarks = remarksByScheme.get(String(row.scheme_id).trim()) || [];
      const hasActualSmsLog = Boolean(row.sms_delivery_status);

      const item: AlertTrackerItem = {
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
        original_alert_date: isoDate,
        recipient_designation: isEE ? "Executive Engineer" : "Village Operator",
        recipient_name: isEE
          ? (row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-")
          : (row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-"),
        recipient_contact: isEE ? (row.ee_number || "-") : (row.operator_number || "-"),
        recipient_email: row.ee_email || undefined,
        notification_channel: isEE ? ("SMS & Email" as any) : "SMS",
        message_text: isEE
          ? DLT_TEMPLATES.ESCALATION_EE_CE.render(formatSchemeName(row.scheme_name, row.scheme_id), 1, 1, "तांत्रिक बाबी प्रलंबित आहेत")
          : DLT_TEMPLATES.LPCD_LOW.render(formatSchemeName(row.scheme_name, row.scheme_id), formatVillageName(row.village_name), parseFloat(row.val_today).toFixed(1)),
        reading_value: `${parseFloat(row.val_today).toFixed(1)} LPCD`,
        delivery_status: row.sms_delivery_status || "NOT_DISPATCHED",
        sms_sent: hasActualSmsLog,
        email_sent: isEE && hasActualSmsLog,
        resolution_status: isResolvedNextDay ? "RESOLVED" : isUnresolvedNextDay ? "UNRESOLVED" : "ACTIVE",
        escalated_to_ee: isEE,
        unresolved_since: isUnresolvedNextDay ? `Since ${displayDate}` : "-",
        escalation_date: isEE ? nextDayDisplayDate : undefined,
        sent_date: isoDate,
        sent_at: `${isoDate}T10:30:00.000Z`,
        operator_name: row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-",
        operator_number: row.operator_number || "-",
        ee_name: row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-",
        ee_number: row.ee_number || "-",
        ee_email: row.ee_email || "-",
        chief_se_name: row.chief_se_name && row.chief_se_name !== "-" ? row.chief_se_name : "-",
        chief_se_number: row.chief_se_number || "-",
        operated_by: row.operated_by || "MJP",
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
      ? result.lpcd.unresolvedItems.filter((r: any) => r.val_latest !== null && Number(r.val_latest) >= 0 && Number(r.val_latest) < 55)
      : [];
    result.lpcd.unresolvedTillDateItems = lpcdStillUnresolved;
    result.lpcd.unresolvedTillDate = isCol4Available
      ? lpcdStillUnresolved.length
      : col4PendingText;

    // Process Pressure Items
    (presRes.rows || []).forEach((row: any) => {
      const isUnresolvedNextDay = isNextDayAvailable && row.val_next !== null && Number(row.val_next) < 0.20 && row.water_next !== null && Number(row.water_next) > 0;
      const isResolvedNextDay = isNextDayAvailable && !isUnresolvedNextDay;
      const isEE = isUnresolvedNextDay;
      const schemeRemarks = remarksByScheme.get(String(row.scheme_id).trim()) || [];
      const hasActualSmsLog = Boolean(row.sms_delivery_status);

      const item: AlertTrackerItem = {
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
        original_alert_date: isoDate,
        recipient_designation: isEE ? "Executive Engineer" : "Village Operator",
        recipient_name: isEE
          ? (row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-")
          : (row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-"),
        recipient_contact: isEE ? (row.ee_number || "-") : (row.operator_number || "-"),
        recipient_email: row.ee_email || undefined,
        notification_channel: isEE ? ("SMS & Email" as any) : "SMS",
        message_text: isEE
          ? DLT_TEMPLATES.ESCALATION_EE_CE.render(formatSchemeName(row.scheme_name, row.scheme_id), 1, 1, "तांत्रिक बाबी प्रलंबित आहेत")
          : DLT_TEMPLATES.PRESSURE_LOW.render(formatSchemeName(row.scheme_name, row.scheme_id), formatVillageAndEsr(row.village_name, row.reservoir_name), parseFloat(row.val_today).toFixed(2)),
        reading_value: `${parseFloat(row.val_today).toFixed(2)} Bar`,
        delivery_status: row.sms_delivery_status || "NOT_DISPATCHED",
        sms_sent: hasActualSmsLog,
        email_sent: isEE && hasActualSmsLog,
        resolution_status: isResolvedNextDay ? "RESOLVED" : isUnresolvedNextDay ? "UNRESOLVED" : "ACTIVE",
        escalated_to_ee: isEE,
        unresolved_since: isUnresolvedNextDay ? `Since ${displayDate}` : "-",
        escalation_date: isEE ? nextDayDisplayDate : undefined,
        sent_date: isoDate,
        sent_at: `${isoDate}T10:30:00.000Z`,
        operator_name: row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-",
        operator_number: row.operator_number || "-",
        ee_name: row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-",
        ee_number: row.ee_number || "-",
        ee_email: row.ee_email || "-",
        chief_se_name: row.chief_se_name && row.chief_se_name !== "-" ? row.chief_se_name : "-",
        chief_se_number: row.chief_se_number || "-",
        operated_by: row.operated_by || "MJP",
        remarks_list: schemeRemarks,
        remarks_count: schemeRemarks.length,
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
      ? result.pressure.unresolvedItems.filter((r: any) => r.val_latest !== null && Number(r.val_latest) < 0.20)
      : [];
    result.pressure.unresolvedTillDateItems = presStillUnresolved;
    result.pressure.unresolvedTillDate = isCol4Available
      ? presStillUnresolved.length
      : col4PendingText;

    // Process Chlorine Items
    (chlRes.rows || []).forEach((row: any) => {
      const isUnresolvedNextDay = isNextDayAvailable && row.val_next !== null && (Number(row.val_next) < 0.20 || Number(row.val_next) > 0.50) && row.water_next !== null && Number(row.water_next) > 0;
      const isResolvedNextDay = isNextDayAvailable && !isUnresolvedNextDay;
      const isEE = isUnresolvedNextDay;
      const schemeRemarks = remarksByScheme.get(String(row.scheme_id).trim()) || [];
      const hasActualSmsLog = Boolean(row.sms_delivery_status);

      const item: AlertTrackerItem = {
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
        original_alert_date: isoDate,
        recipient_designation: isEE ? "Executive Engineer" : "Village Operator",
        recipient_name: isEE
          ? (row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-")
          : (row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-"),
        recipient_contact: isEE ? (row.ee_number || "-") : (row.operator_number || "-"),
        recipient_email: row.ee_email || undefined,
        notification_channel: isEE ? ("SMS & Email" as any) : "SMS",
        message_text: isEE
          ? DLT_TEMPLATES.ESCALATION_EE_CE.render(formatSchemeName(row.scheme_name, row.scheme_id), 1, 1, "तांत्रिक बाबी प्रलंबित आहेत")
          : (parseFloat(row.val_today) > 0.50 ? DLT_TEMPLATES.CHLORINE_HIGH : DLT_TEMPLATES.CHLORINE_LOW).render(
              formatSchemeName(row.scheme_name, row.scheme_id),
              formatVillageAndEsr(row.village_name, row.reservoir_name),
              parseFloat(row.val_today).toFixed(2)
            ),
        reading_value: `${parseFloat(row.val_today).toFixed(2)} ppm`,
        delivery_status: row.sms_delivery_status || "NOT_DISPATCHED",
        sms_sent: hasActualSmsLog,
        email_sent: isEE && hasActualSmsLog,
        resolution_status: isResolvedNextDay ? "RESOLVED" : isUnresolvedNextDay ? "UNRESOLVED" : "ACTIVE",
        escalated_to_ee: isEE,
        unresolved_since: isUnresolvedNextDay ? `Since ${displayDate}` : "-",
        escalation_date: isEE ? nextDayDisplayDate : undefined,
        sent_date: isoDate,
        sent_at: `${isoDate}T10:30:00.000Z`,
        operator_name: row.operator_name && row.operator_name !== "-" && row.operator_name.toLowerCase() !== "village operator" ? row.operator_name : "-",
        operator_number: row.operator_number || "-",
        ee_name: row.ee_name && row.ee_name !== "-" && row.ee_name.toLowerCase() !== "executive engineer" ? row.ee_name : "-",
        ee_number: row.ee_number || "-",
        ee_email: row.ee_email || "-",
        chief_se_name: row.chief_se_name && row.chief_se_name !== "-" ? row.chief_se_name : "-",
        chief_se_number: row.chief_se_number || "-",
        operated_by: row.operated_by || "MJP",
        remarks_list: schemeRemarks,
        remarks_count: schemeRemarks.length,
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
      ? result.chlorine.unresolvedItems.filter((r: any) => r.val_latest !== null && (Number(r.val_latest) < 0.20 || Number(r.val_latest) > 0.50))
      : [];
    result.chlorine.unresolvedTillDateItems = chlStillUnresolved;
    result.chlorine.unresolvedTillDate = isCol4Available
      ? chlStillUnresolved.length
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
  const { isoDate, displayDate, dayIdx } = getTelemetryDayIndex(options?.targetDate);

  console.log(`[AlertTracker] Running daily alert evaluation for date: ${isoDate} (dryRun=${dryRun})`);

  let operatorsNotified = 0;
  let eeSmsSent = 0;
  let eeEmailsSent = 0;

  try {
    const metricsResult = await getAlertTrackerMetrics({ date: isoDate });
    const allAlerts = metricsResult.allAlerts || [];

    const alertsByEE = new Map<string, { eeName: string; eeMobile: string; eeEmail: string; alerts: AlertTrackerItem[] }>();

    // Collect alerts for EE escalation:
    // If the selected date has alerts already flagged for EE, use them.
    // If the selected date is the latest reported day (where alerts are still in their 24-hr operator window),
    // fetch the unresolved alerts from the prior observation day (e.g. 23-Oct) which are due for EE escalation today!
    let eeEscalationAlerts = allAlerts.filter((item) => item.escalated_to_ee);
    if (eeEscalationAlerts.length === 0 && dayIdx > 1) {
      const prevDate = `2026-10-${String(dayIdx + 18 - 1).padStart(2, "0")}`;
      const prevMetrics = await getAlertTrackerMetrics({ date: prevDate });
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
                  <p style="color: #374151; font-size: 16px;">The following schemes assigned to you have critical parameters falling below acceptable thresholds as of today (${displayDate}).</p>

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
