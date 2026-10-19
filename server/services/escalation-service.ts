import { getDB } from "../db";
import { sql, eq } from "drizzle-orm";
import { schemeEngineerDetails, users, emailAlertLogs } from "../../shared/schema";
import { sendSmartpingDLTSMS, normalizeIndianMobile, logSmsAlert } from "./sms-service";
import { sendMail } from "./email-service";
import { calculateAllAlertStreaksFromHistory } from "./streak-engine";

export interface SchemeEscalationItem {
  scheme_id: string;
  scheme_name: string;
  region: string;
  division?: string;
  district?: string;
  // Highest active escalation level
  escalation_level: 1 | 2 | 3 | 4 | 5;
  max_streak_days: number;
  // Breakdown of persistent issues
  lpcd_villages_count: number;
  lpcd_villages: Array<{ village_name: string; days_count: number; avg_val?: string }>;
  chlorine_low_count: number;
  chlorine_low_esrs: Array<{ village_name: string; esr_name: string; days_count: number; val?: string }>;
  chlorine_high_count: number;
  chlorine_high_esrs: Array<{ village_name: string; esr_name: string; days_count: number; val?: string }>;
  pressure_low_count: number;
  pressure_low_esrs: Array<{ village_name: string; esr_name: string; days_count: number; val?: string }>;
  offline_count: number;
  offline_esrs: Array<{ village_name: string; esr_name: string; days_count: number; sensors?: string }>;
  total_issues_count: number;
  // Engineer Contacts (Civil hierarchy only)
  de_ae_civil_name?: string;
  de_ae_civil_email?: string;
  de_ae_civil_mobile?: string;
  ee_civil_name?: string;
  ee_civil_email?: string;
  ee_civil_mobile?: string;
  se_name?: string;
  se_email?: string;
  se_mobile?: string;
  chief_engineer_name?: string;
  chief_engineer_email?: string;
  chief_engineer_mobile?: string;
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  ms_name?: string;
  ms_email?: string;
  ms_mobile?: string;
  ps_name?: string;
  ps_email?: string;
  ps_mobile?: string;
  // Dispatch / Status Tracking
  ee_escalated: boolean;
  ce_escalated: boolean;
  ms_escalated: boolean;
  ps_escalated: boolean;
  last_escalated_at?: string;
  // Actual Notified Counts
  de_sms_count: number;
  ee_sms_count: number;
  ce_se_sms_count: number;
  ms_sms_count: number;
  ps_sms_count: number;
  total_email_count: number;
  last_notified_at?: string;
  remarks?: any[];
}

export interface EscalationSummary {
  total_schemes_in_escalation: number;
  level_1_count: number; // 1-2 days (DE/AE Civil)
  level_2_count: number; // 3-6 days (EE Civil Escalated)
  level_3_count: number; // 7-9 days (CE & SE Escalated)
  level_4_count: number; // 10-14 days (Member Secretary MS Escalated)
  level_5_count: number; // 15+ days (Principal Secretary PS Escalated)
  total_villages_below_55: number;
  total_esrs_low_chlorine: number;
  total_esrs_high_chlorine: number;
  total_esrs_low_pressure: number;
  total_offline_sensors: number;
  regional_breakdown: Record<string, {
    total: number;
    level_1: number;
    level_2: number;
    level_3: number;
    level_4: number;
    level_5: number;
    schemes: string[];
  }>;
  dispatches?: {
    today: {
      total_emails: number;
      total_sms: number;
      de_emails: number;
      de_sms: number;
      ee_emails: number;
      ee_sms: number;
      se_emails?: number;
      se_sms?: number;
      ce_emails?: number;
      ce_sms?: number;
      ce_se_emails: number;
      ce_se_sms: number;
      ms_emails: number;
      ms_sms: number;
      ps_emails: number;
      ps_sms: number;
      categories?: {
        lpcd: { emails: number; sms: number };
        chlorine: { emails: number; sms: number };
        pressure: { emails: number; sms: number };
        offline: { emails: number; sms: number };
      };
    };
    last_7_days: {
      total_emails: number;
      total_sms: number;
      de_emails: number;
      de_sms: number;
      ee_emails: number;
      ee_sms: number;
      se_emails?: number;
      se_sms?: number;
      ce_emails?: number;
      ce_sms?: number;
      ce_se_emails: number;
      ce_se_sms: number;
      ms_emails: number;
      ms_sms: number;
      ps_emails: number;
      ps_sms: number;
      categories?: {
        lpcd: { emails: number; sms: number };
        chlorine: { emails: number; sms: number };
        pressure: { emails: number; sms: number };
        offline: { emails: number; sms: number };
      };
    };
  };
  total_alert_incidents?: number;
}

/**
 * Computes the real-time escalation status across all schemes.
 * - Level 1: Issue active for 1 to 2 days (DE/AE Civil)
 * - Level 2: Issue persists for 3 to 6 consecutive days (EE Civil Escalation)
 * - Level 3: Issue persists for 7+ consecutive days (CE & SE Regional Escalation)
 */
export async function getEscalationStatus(options: {
  daysLookback?: number;
  region?: string;
} = {}): Promise<{
  summary: EscalationSummary;
  schemes: SchemeEscalationItem[];
}> {
  const db = await getDB();
  const daysLookback = options.daysLookback || 30;

  // 1. Fetch all assigned scheme engineers (Civil hierarchy)
  const engRows = await db.select().from(schemeEngineerDetails);
  const engMap = new Map<string, typeof engRows[0]>();
  engRows.forEach(e => {
    if (e.scheme_id) {
      engMap.set(String(e.scheme_id).trim(), e);
    }
    if (e.scheme) {
      engMap.set(String(e.scheme).trim().toLowerCase(), e);
    }
  });

  // Query regional vendors
  const vendorRowsRes = await db.execute(sql`
    SELECT DISTINCT ON (region) region, employee_name, email, phone
    FROM vendor
    ORDER BY region, id
  `);
  const vendorMap = new Map<string, any>();
  (vendorRowsRes.rows || []).forEach((v: any) => {
    if (v.region) {
      vendorMap.set(String(v.region).trim().toLowerCase(), v);
    }
  });

  // 2. Query exact alerts & streaks directly from history tables from latest available date
  const { allAlerts } = await calculateAllAlertStreaksFromHistory(db);

  // Query issue_reports (Field Remarks)
  const remarksByScheme = new Map<string, any[]>();
  try {
    const issuesRes = await db.execute(sql`
      SELECT scheme_id, 
             json_agg(json_build_object(
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
             )) as remarks
      FROM issue_reports
      GROUP BY scheme_id
    `);
    (issuesRes.rows || []).forEach((r: any) => {
      if (r.scheme_id) remarksByScheme.set(String(r.scheme_id).trim(), r.remarks || []);
    });
  } catch (err) {
    console.error("Error fetching issue_reports in getEscalationStatus:", err);
  }

  // 3. Group by scheme with exact streaks from history tables
  const schemeAgg = new Map<string, SchemeEscalationItem>();

  for (const alert of allAlerts) {
    const schemeId = String(alert.scheme_id || '').trim();
    if (!schemeId) continue;

    const schemeName = String(alert.scheme_name || schemeId).trim();
    const region = String(alert.region || 'Maharashtra').replace(/^\uFEFF/, '').trim();

    if (options.region && options.region !== 'All') {
      const cleanOpt = options.region.replace(/^\uFEFF/, '').trim().toLowerCase();
      const cleanReg = region.toLowerCase();
      if (cleanReg !== cleanOpt) continue;
    }

    if (!schemeAgg.has(schemeId)) {
      const eng = engMap.get(schemeId) || engMap.get(schemeName.toLowerCase());
      const engRegion = eng?.region ? String(eng.region).replace(/^\uFEFF/, '').trim() : undefined;

      schemeAgg.set(schemeId, {
        scheme_id: schemeId,
        scheme_name: schemeName,
        region: engRegion || region,
        division: eng?.division || undefined,
        district: eng?.district || undefined,
        escalation_level: 1,
        max_streak_days: 0,
        lpcd_villages_count: 0,
        lpcd_villages: [],
        chlorine_low_count: 0,
        chlorine_low_esrs: [],
        chlorine_high_count: 0,
        chlorine_high_esrs: [],
        pressure_low_count: 0,
        pressure_low_esrs: [],
        offline_count: 0,
        offline_esrs: [],
        total_issues_count: 0,
        // Civil Only contacts
        de_ae_civil_name: eng?.de_ae_civil_name || undefined,
        de_ae_civil_email: eng?.de_ae_civil_email || undefined,
        de_ae_civil_mobile: eng?.de_ae_civil_mobile || undefined,
        ee_civil_name: eng?.ee_civil_name || undefined,
        ee_civil_email: eng?.ee_civil_email || undefined,
        ee_civil_mobile: eng?.ee_civil_mobile || undefined,
        se_name: eng?.se_name || undefined,
        se_email: eng?.se_email || undefined,
        se_mobile: eng?.se_mobile || undefined,
        chief_engineer_name: eng?.chief_engineer_name || undefined,
        chief_engineer_email: eng?.chief_engineer_email || undefined,
        chief_engineer_mobile: eng?.chief_engineer_mobile || undefined,
        vendor_name: vendorMap.get(String(engRegion || region || '').toLowerCase().trim())?.employee_name || undefined,
        vendor_email: vendorMap.get(String(engRegion || region || '').toLowerCase().trim())?.email || undefined,
        vendor_phone: vendorMap.get(String(engRegion || region || '').toLowerCase().trim())?.phone || undefined,
        ee_escalated: false,
        ce_escalated: false,
        ms_escalated: false,
        ps_escalated: false,
        de_sms_count: 0,
        ee_sms_count: 0,
        ce_se_sms_count: 0,
        ms_sms_count: 0,
        ps_sms_count: 0,
        total_email_count: 0,
        remarks: remarksByScheme.get(schemeId) || [],
      });
    }

    const item = schemeAgg.get(schemeId)!;
    const days = alert.streak_days;
    item.total_issues_count++;
    if (days > item.max_streak_days) {
      item.max_streak_days = days;
    }

    if (alert.category === 'lpcd') {
      item.lpcd_villages_count++;
      item.lpcd_villages.push({ village_name: alert.village_name, days_count: days, avg_val: alert.parameter_value });
    } else if (alert.category === 'chlorine') {
      if (alert.alert_type === 'High Chlorine') {
        const esrKey = `${alert.village_name.trim().toLowerCase()}__${alert.esr_name.trim().toLowerCase()}`;
        if (!item.chlorine_high_esrs.some(e => `${e.village_name.trim().toLowerCase()}__${e.esr_name.trim().toLowerCase()}` === esrKey)) {
          item.chlorine_high_count++;
          item.chlorine_high_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, val: alert.parameter_value });
        }
      } else {
        const esrKey = `${alert.village_name.trim().toLowerCase()}__${alert.esr_name.trim().toLowerCase()}`;
        if (!item.chlorine_low_esrs.some(e => `${e.village_name.trim().toLowerCase()}__${e.esr_name.trim().toLowerCase()}` === esrKey)) {
          item.chlorine_low_count++;
          item.chlorine_low_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, val: alert.parameter_value });
        }
      }
    } else if (alert.category === 'pressure') {
      const esrKey = `${alert.village_name.trim().toLowerCase()}__${alert.esr_name.trim().toLowerCase()}`;
      if (!item.pressure_low_esrs.some(e => `${e.village_name.trim().toLowerCase()}__${e.esr_name.trim().toLowerCase()}` === esrKey)) {
        item.pressure_low_count++;
        item.pressure_low_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, val: alert.parameter_value });
      }
    } else if (alert.category === 'offline') {
      const esrKey = `${alert.village_name.trim().toLowerCase()}__${alert.esr_name.trim().toLowerCase()}`;
      if (!item.offline_esrs.some(e => `${e.village_name.trim().toLowerCase()}__${e.esr_name.trim().toLowerCase()}` === esrKey)) {
        item.offline_count++;
        item.offline_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, sensors: alert.offline_sensors });
      }
    }
  }

  // 3b. Fetch actual notified message counts from sms_alert_logs and email_alert_logs
  try {
    const [smsRes, emailRes] = await Promise.all([
      db.execute(sql`
        SELECT 
          scheme_id,
          COUNT(*) FILTER (WHERE engineer_name ILIKE '%Akshay Bhojane%' AND (is_success = true OR gateway_status = 200)) as de_sms_count,
          COUNT(*) FILTER (WHERE engineer_name ILIKE '%Rishikesh Salunke%' AND (is_success = true OR gateway_status = 200)) as ee_sms_count,
          COUNT(*) FILTER (WHERE (engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Rishikesh Salunkhe%') AND (is_success = true OR gateway_status = 200)) as ce_se_sms_count,
          COUNT(*) FILTER (WHERE (engineer_name ILIKE '%Member Secretary%' OR engineer_name ILIKE '%MS%') AND (is_success = true OR gateway_status = 200)) as ms_sms_count,
          COUNT(*) FILTER (WHERE (engineer_name ILIKE '%Principal Secretary%' OR engineer_name ILIKE '%PS%') AND (is_success = true OR gateway_status = 200)) as ps_sms_count,
          MAX(created_at) as last_sms_sent
        FROM sms_alert_logs
        WHERE scheme_id IS NOT NULL
        GROUP BY scheme_id
      `),
      db.execute(sql`
        SELECT 
          scheme_id,
          COUNT(*) as total_email_count,
          MAX(created_at) as last_email_sent
        FROM email_alert_logs
        WHERE scheme_id IS NOT NULL
        GROUP BY scheme_id
      `),
    ]);

    (smsRes.rows || []).forEach((r: any) => {
      const sId = String(r.scheme_id || '').trim();
      const item = schemeAgg.get(sId);
      if (item) {
        item.de_sms_count = Number(r.de_sms_count || 0);
        item.ee_sms_count = Number(r.ee_sms_count || 0);
        item.ce_se_sms_count = Number(r.ce_se_sms_count || 0);
        item.ms_sms_count = Number(r.ms_sms_count || 0);
        item.ps_sms_count = Number(r.ps_sms_count || 0);
        if (r.last_sms_sent) item.last_notified_at = String(r.last_sms_sent);
      }
    });

    (emailRes.rows || []).forEach((r: any) => {
      const sId = String(r.scheme_id || '').trim();
      const item = schemeAgg.get(sId);
      if (item) {
        item.total_email_count = Number(r.total_email_count || 0);
        if (r.last_email_sent && (!item.last_notified_at || new Date(r.last_email_sent) > new Date(item.last_notified_at))) {
          item.last_notified_at = String(r.last_email_sent);
        }
      }
    });
  } catch (err) {
    console.error("Error fetching notification counts in getEscalationStatus:", err);
  }

  // 3c. Query actual dispatches for Today and Last 7 Days from email_acknowledgements & sms_alert_logs
  const dispatches = {
    today: {
      total_emails: 0,
      total_officers: 0,
      total_sms: 0,
      de_emails: 0,
      de_officers: 0,
      de_sms: 0,
      ee_emails: 0,
      ee_officers: 0,
      ee_sms: 0,
      se_emails: 0,
      se_officers: 0,
      se_sms: 0,
      ce_emails: 0,
      ce_officers: 0,
      ce_sms: 0,
      ce_se_emails: 0,
      ce_se_officers: 0,
      ce_se_sms: 0,
      ms_emails: 0,
      ms_officers: 0,
      ms_sms: 0,
      ps_emails: 0,
      ps_officers: 0,
      ps_sms: 0,
      categories: {
        lpcd: { emails: 0, officers: 0, sms: 0 },
        chlorine: { emails: 0, officers: 0, sms: 0 },
        pressure: { emails: 0, officers: 0, sms: 0 },
        offline: { emails: 0, officers: 0, sms: 0 },
      },
      level_categories: {
        1: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        2: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        3: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        4: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        5: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
      },
    },
    last_7_days: {
      total_emails: 0,
      total_officers: 0,
      total_sms: 0,
      de_emails: 0,
      de_officers: 0,
      de_sms: 0,
      ee_emails: 0,
      ee_officers: 0,
      ee_sms: 0,
      se_emails: 0,
      se_officers: 0,
      se_sms: 0,
      ce_emails: 0,
      ce_officers: 0,
      ce_sms: 0,
      ce_se_emails: 0,
      ce_se_officers: 0,
      ce_se_sms: 0,
      ms_emails: 0,
      ms_officers: 0,
      ms_sms: 0,
      ps_emails: 0,
      ps_officers: 0,
      ps_sms: 0,
      categories: {
        lpcd: { emails: 0, officers: 0, sms: 0 },
        chlorine: { emails: 0, officers: 0, sms: 0 },
        pressure: { emails: 0, officers: 0, sms: 0 },
        offline: { emails: 0, officers: 0, sms: 0 },
      },
      level_categories: {
        1: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        2: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        3: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        4: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
        5: {
          lpcd: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          chlorine: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          pressure: { emails: 0, officers: 0, schemes: 0, sms: 0 },
          offline: { emails: 0, officers: 0, schemes: 0, sms: 0 },
        },
      },
    },
  };

  try {
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const [emailStatsRes, smsStatsRes, engineerRosterRes, categoryEmailStatsRes, categorySmsStatsRes] = await Promise.all([
      db.execute(sql`
        -- 1. Actual dispatches to officers from consolidated_email_dispatches (exact real emails sent)
        SELECT 
          dispatch_date::text as sent_date,
          'ALL' as scheme_id,
          LOWER(TRIM(engineer_email)) as engineer_email,
          engineer_name,
          CASE 
            WHEN engineer_role ILIKE '%principal%' THEN 'ps'
            WHEN engineer_role ILIKE '%member%' THEN 'ms'
            WHEN engineer_role ILIKE '%chief%' THEN 'ce'
            WHEN engineer_role ILIKE '%superintending%' THEN 'se'
            WHEN engineer_role ILIKE '%executive%' OR engineer_role ILIKE '%ee%' THEN 'ee'
            WHEN engineer_role ILIKE '%vendor%' THEN 'vendor'
            ELSE 'de'
          END as tier
        FROM consolidated_email_dispatches
        WHERE dispatch_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'

        UNION ALL

        -- 1b. Fallback to email_acknowledgements for dates prior to consolidated_email_dispatches
        SELECT 
          ea.sent_date::text as sent_date,
          ea.scheme_id,
          LOWER(TRIM(ea.engineer_email)) as engineer_email,
          MAX(ea.engineer_name) as engineer_name,
          CASE 
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.principal_secretary_email), ''))) THEN 'ps'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.member_secretary_email), ''))) THEN 'ms'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.chief_engineer_email), '')))
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.chief_engineer_name), ''))) THEN 'ce'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.se_email), ''))) 
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.se_name), ''))) THEN 'se'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_email), '')))
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_name), ''))) THEN 'ee'
            ELSE 'de'
          END as tier
        FROM email_acknowledgements ea
        LEFT JOIN scheme_engineer_details s ON s.scheme_id = ea.scheme_id
        WHERE ea.sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND ea.sent_date NOT IN (SELECT DISTINCT dispatch_date FROM consolidated_email_dispatches)
        GROUP BY ea.sent_date::text, ea.scheme_id, LOWER(TRIM(ea.engineer_email))

        UNION ALL

        -- 2. Escalation tier-specific notices from email_alert_logs
        SELECT 
          sub2.sent_date,
          sub2.scheme_id,
          sub2.engineer_email,
          sub2.engineer_name,
          sub2.tier
        FROM (
          SELECT 
            e.sent_date::text as sent_date,
            MAX(e.scheme_id) as scheme_id,
            LOWER(TRIM(
              CASE 
                WHEN e.dispatch_type = 'escalation_level5' THEN COALESCE(e.principal_secretary_email, 'ps.wss@maharashtra.gov.in')
                WHEN e.dispatch_type = 'escalation_level4' THEN COALESCE(e.member_secretary_email, 'ms.mjp@gov.in')
                WHEN e.dispatch_type = 'escalation_level3' THEN COALESCE(e.chief_engineer_email, e.se_email, 'ce.mjp@gov.in')
                WHEN e.dispatch_type = 'escalation_level2' THEN COALESCE(e.ee_civil_email, 'ee.mjp@gov.in')
                ELSE COALESCE(e.civil_engineer_email, 'de.mjp@gov.in')
              END
            )) as engineer_email,
            LOWER(TRIM(
              CASE 
                WHEN e.dispatch_type = 'escalation_level5' THEN COALESCE(e.principal_secretary_name, 'Principal Secretary (PS)')
                WHEN e.dispatch_type = 'escalation_level4' THEN COALESCE(e.member_secretary_name, 'Member Secretary (MS)')
                WHEN e.dispatch_type = 'escalation_level3' THEN COALESCE(e.chief_engineer_name, e.se_name, 'Chief Engineer')
                WHEN e.dispatch_type = 'escalation_level2' THEN COALESCE(e.ee_civil_name, 'Executive Engineer (Civil)')
                ELSE COALESCE(e.civil_engineer_name, 'Deputy Engineer')
              END
            )) as engineer_name,
            CASE 
              WHEN e.dispatch_type = 'escalation_level5' THEN 'ps'
              WHEN e.dispatch_type = 'escalation_level4' THEN 'ms'
              WHEN e.dispatch_type = 'escalation_level3' THEN 'ce'
              WHEN e.dispatch_type = 'escalation_level2' THEN 'ee'
              ELSE 'de'
            END as tier
          FROM email_alert_logs e
          WHERE e.dispatch_type LIKE 'escalation_%'
            AND e.sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          GROUP BY e.sent_date::text, 3, 4, 5
        ) sub2
      `),
      db.execute(sql`
        SELECT 
          sent_date::text as sent_date,
          LOWER(TRIM(engineer_name)) as engineer_name,
          mobile,
          COUNT(*) as sms_count
        FROM sms_alert_logs
        WHERE sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND (is_success = true OR gateway_status = 200)
        GROUP BY sent_date, LOWER(TRIM(engineer_name)), mobile
      `),
      db.execute(sql`
        SELECT 
          LOWER(TRIM(de_ae_civil_email)) as de_civil_email,
          LOWER(TRIM(de_ae_mech_email)) as de_mech_email,
          LOWER(TRIM(ee_civil_email)) as ee_civil_email,
          LOWER(TRIM(ee_mech_email)) as ee_mech_email,
          LOWER(TRIM(se_email)) as se_email,
          LOWER(TRIM(chief_engineer_email)) as chief_engineer_email,
          LOWER(TRIM(member_secretary_email)) as member_secretary_email,
          LOWER(TRIM(principal_secretary_email)) as principal_secretary_email,
          REGEXP_REPLACE(COALESCE(de_ae_civil_mobile, ''), '[^0-9]', '', 'g') as de_civil_mobile,
          REGEXP_REPLACE(COALESCE(de_ae_mech_mobile, ''), '[^0-9]', '', 'g') as de_mech_mobile,
          REGEXP_REPLACE(COALESCE(ee_civil_mobile, ''), '[^0-9]', '', 'g') as ee_civil_mobile,
          REGEXP_REPLACE(COALESCE(ee_mech_mobile, ''), '[^0-9]', '', 'g') as ee_mech_mobile,
          REGEXP_REPLACE(COALESCE(se_mobile, ''), '[^0-9]', '', 'g') as se_mobile,
          REGEXP_REPLACE(COALESCE(chief_engineer_mobile, ''), '[^0-9]', '', 'g') as chief_engineer_mobile
        FROM scheme_engineer_details
        UNION ALL
        SELECT 
          LOWER(TRIM(de_ae_civil_email)) as de_civil_email,
          LOWER(TRIM(de_ae_mech_email)) as de_mech_email,
          LOWER(TRIM(ee_civil_email)) as ee_civil_email,
          LOWER(TRIM(ee_mech_email)) as ee_mech_email,
          LOWER(TRIM(se_email)) as se_email,
          LOWER(TRIM(chief_engineer_email)) as chief_engineer_email,
          LOWER(TRIM(member_secretary_email)) as member_secretary_email,
          LOWER(TRIM(principal_secretary_email)) as principal_secretary_email,
          NULL as de_civil_mobile,
          NULL as de_mech_mobile,
          NULL as ee_civil_mobile,
          NULL as ee_mech_mobile,
          NULL as se_mobile,
          NULL as chief_engineer_mobile
        FROM email_alert_logs
        WHERE sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '14 days'
      `),
      db.execute(sql`
        SELECT 
          dispatch_date::text as sent_date,
          'lpcd' as category,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END as tier,
          COUNT(*)::int as email_count,
          COUNT(DISTINCT LOWER(TRIM(engineer_name)))::int as officer_count,
          jsonb_agg(scheme_ids) as all_scheme_ids
        FROM consolidated_email_dispatches
        WHERE dispatch_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND lpcd_alerts_count > 0
        GROUP BY dispatch_date::text, 
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END
        UNION ALL
        SELECT 
          dispatch_date::text as sent_date,
          'chlorine' as category,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END as tier,
          COUNT(*)::int as email_count,
          COUNT(DISTINCT LOWER(TRIM(engineer_name)))::int as officer_count,
          jsonb_agg(scheme_ids) as all_scheme_ids
        FROM consolidated_email_dispatches
        WHERE dispatch_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND chlorine_alerts_count > 0
        GROUP BY dispatch_date::text,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END
        UNION ALL
        SELECT 
          dispatch_date::text as sent_date,
          'pressure' as category,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END as tier,
          COUNT(*)::int as email_count,
          COUNT(DISTINCT LOWER(TRIM(engineer_name)))::int as officer_count,
          jsonb_agg(scheme_ids) as all_scheme_ids
        FROM consolidated_email_dispatches
        WHERE dispatch_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND pressure_alerts_count > 0
        GROUP BY dispatch_date::text,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END
        UNION ALL
        SELECT 
          dispatch_date::text as sent_date,
          'offline' as category,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END as tier,
          COUNT(*)::int as email_count,
          COUNT(DISTINCT LOWER(TRIM(engineer_name)))::int as officer_count,
          jsonb_agg(scheme_ids) as all_scheme_ids
        FROM consolidated_email_dispatches
        WHERE dispatch_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND offline_alerts_count > 0
        GROUP BY dispatch_date::text,
          CASE 
            WHEN engineer_role ILIKE '%Vendor%' THEN 0
            WHEN engineer_role ILIKE '%Principal%' THEN 5
            WHEN engineer_role ILIKE '%Member%' THEN 4
            WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
            WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
            ELSE 1
          END
      `),
      db.execute(sql`
        SELECT 
          sent_date::text as sent_date,
          CASE 
            WHEN template_name ILIKE '%lpcd%' THEN 'lpcd'
            WHEN template_name ILIKE '%chlorine%' THEN 'chlorine'
            WHEN template_name ILIKE '%pressure%' THEN 'pressure'
            ELSE 'offline'
          END as category,
          CASE 
            WHEN engineer_name ILIKE '%Principal Secretary%' OR dispatch_type = 'escalation_level5' THEN 5
            WHEN engineer_name ILIKE '%Member Secretary%' OR dispatch_type = 'escalation_level4' THEN 4
            WHEN engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Chief Engineer%' OR template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
            WHEN engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 3
            WHEN engineer_name ILIKE '%Rishikesh Salunke%' OR template_id = 'LEVEL_2_ESCALATION_EE' THEN 2
            ELSE 1
          END as tier,
          COUNT(*) as sms_count
        FROM sms_alert_logs
        WHERE sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days'
          AND (is_success = true OR gateway_status = 200)
        GROUP BY sent_date, 
          CASE 
            WHEN template_name ILIKE '%lpcd%' THEN 'lpcd'
            WHEN template_name ILIKE '%chlorine%' THEN 'chlorine'
            WHEN template_name ILIKE '%pressure%' THEN 'pressure'
            ELSE 'offline'
          END,
          CASE 
            WHEN engineer_name ILIKE '%Principal Secretary%' OR dispatch_type = 'escalation_level5' THEN 5
            WHEN engineer_name ILIKE '%Member Secretary%' OR dispatch_type = 'escalation_level4' THEN 4
            WHEN engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Chief Engineer%' OR template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
            WHEN engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 3
            WHEN engineer_name ILIKE '%Rishikesh Salunke%' OR template_id = 'LEVEL_2_ESCALATION_EE' THEN 2
            ELSE 1
          END
      `)
    ]);

    const execContacts = await getExecutiveContacts();
    const msEmail = (execContacts.ms.email || '').toLowerCase().trim();
    const psEmail = (execContacts.ps.email || '').toLowerCase().trim();

    const deEmailsSet = new Set<string>();
    const eeEmailsSet = new Set<string>();
    const seEmailsSet = new Set<string>();
    const ceEmailsSet = new Set<string>();
    const ceSeEmailsSet = new Set<string>();
    const msEmailsSet = new Set<string>();
    const psEmailsSet = new Set<string>();

    const deMobilesSet = new Set<string>();
    const eeMobilesSet = new Set<string>();
    const seMobilesSet = new Set<string>();
    const ceMobilesSet = new Set<string>();
    const ceSeMobilesSet = new Set<string>();

    const sanitizeRosterEmails = (raw: string | null | undefined): string[] => {
      if (!raw) return [];
      return String(raw)
        .split(/[,;\/\s]+/)
        .map(e => e.trim().replace(/^['"]+|['"]+$/g, '').toLowerCase())
        .filter(e => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e));
    };

    (engineerRosterRes.rows || []).forEach((row: any) => {
      sanitizeRosterEmails(row.de_civil_email).forEach(e => deEmailsSet.add(e));
      sanitizeRosterEmails(row.ee_civil_email).forEach(e => eeEmailsSet.add(e));
      sanitizeRosterEmails(row.se_email).forEach(e => { seEmailsSet.add(e); ceSeEmailsSet.add(e); });
      sanitizeRosterEmails(row.chief_engineer_email).forEach(e => { ceEmailsSet.add(e); ceSeEmailsSet.add(e); });
      sanitizeRosterEmails(row.member_secretary_email).forEach(e => msEmailsSet.add(e));
      sanitizeRosterEmails(row.principal_secretary_email).forEach(e => psEmailsSet.add(e));

      if (row.de_civil_mobile) deMobilesSet.add(row.de_civil_mobile);
      if (row.ee_civil_mobile) eeMobilesSet.add(row.ee_civil_mobile);
      if (row.se_mobile) { seMobilesSet.add(row.se_mobile); ceSeMobilesSet.add(row.se_mobile); }
      if (row.chief_engineer_mobile) { ceMobilesSet.add(row.chief_engineer_mobile); ceSeMobilesSet.add(row.chief_engineer_mobile); }
    });

    const todayUniqueEmails = new Set<string>();
    const last7DaysUniqueEmails = new Set<string>();

    const todayUniqueByTier: Record<string, Set<string>> = {
      de: new Set(),
      ee: new Set(),
      se: new Set(),
      ce: new Set(),
      ms: new Set(),
      ps: new Set(),
    };
    const last7DaysUniqueByTier: Record<string, Set<string>> = {
      de: new Set(),
      ee: new Set(),
      se: new Set(),
      ce: new Set(),
      ms: new Set(),
      ps: new Set(),
    };

    const todayEmailsCountByTier: Record<string, number> = { de: 0, ee: 0, se: 0, ce: 0, ms: 0, ps: 0 };
    const last7DaysEmailsCountByTier: Record<string, number> = { de: 0, ee: 0, se: 0, ce: 0, ms: 0, ps: 0 };
    let todayTotalEmailDispatches = 0;
    let last7DaysTotalEmailDispatches = 0;

    (emailStatsRes.rows || []).forEach((r: any) => {
      const isToday = r.sent_date === todayStr;
      const recipient = String(r.engineer_name || r.engineer_email || '').toLowerCase().trim();
      const tier: 'de' | 'ee' | 'se' | 'ce' | 'ms' | 'ps' = (r.tier as any) || 'de';

      last7DaysTotalEmailDispatches++;
      last7DaysEmailsCountByTier[tier] = (last7DaysEmailsCountByTier[tier] || 0) + 1;

      if (recipient) {
        last7DaysUniqueEmails.add(recipient);
        last7DaysUniqueByTier[tier]?.add(recipient);
      }

      if (isToday) {
        todayTotalEmailDispatches++;
        todayEmailsCountByTier[tier] = (todayEmailsCountByTier[tier] || 0) + 1;
        if (recipient) {
          todayUniqueEmails.add(recipient);
          todayUniqueByTier[tier]?.add(recipient);
        }
      }
    });

    dispatches.today.total_emails = todayTotalEmailDispatches;
    dispatches.today.total_officers = todayUniqueEmails.size;
    dispatches.today.de_emails = todayEmailsCountByTier.de;
    dispatches.today.de_officers = todayUniqueByTier.de.size;
    dispatches.today.ee_emails = todayEmailsCountByTier.ee;
    dispatches.today.ee_officers = todayUniqueByTier.ee.size;
    dispatches.today.se_emails = todayEmailsCountByTier.se;
    dispatches.today.se_officers = todayUniqueByTier.se.size;
    dispatches.today.ce_emails = todayEmailsCountByTier.ce;
    dispatches.today.ce_officers = todayUniqueByTier.ce.size;
    dispatches.today.ce_se_emails = todayEmailsCountByTier.se + todayEmailsCountByTier.ce;
    dispatches.today.ce_se_officers = todayUniqueByTier.se.size + todayUniqueByTier.ce.size;
    dispatches.today.ms_emails = todayEmailsCountByTier.ms;
    dispatches.today.ms_officers = todayUniqueByTier.ms.size;
    dispatches.today.ps_emails = todayEmailsCountByTier.ps;
    dispatches.today.ps_officers = todayUniqueByTier.ps.size;

    dispatches.last_7_days.total_emails = last7DaysTotalEmailDispatches;
    dispatches.last_7_days.total_officers = last7DaysUniqueEmails.size;
    dispatches.last_7_days.de_emails = last7DaysEmailsCountByTier.de;
    dispatches.last_7_days.de_officers = last7DaysUniqueByTier.de.size;
    dispatches.last_7_days.ee_emails = last7DaysEmailsCountByTier.ee;
    dispatches.last_7_days.ee_officers = last7DaysUniqueByTier.ee.size;
    dispatches.last_7_days.se_emails = last7DaysEmailsCountByTier.se;
    dispatches.last_7_days.se_officers = last7DaysUniqueByTier.se.size;
    dispatches.last_7_days.ce_emails = last7DaysEmailsCountByTier.ce;
    dispatches.last_7_days.ce_officers = last7DaysUniqueByTier.ce.size;
    dispatches.last_7_days.ce_se_emails = last7DaysEmailsCountByTier.se + last7DaysEmailsCountByTier.ce;
    dispatches.last_7_days.ce_se_officers = last7DaysUniqueByTier.se.size + last7DaysUniqueByTier.ce.size;
    dispatches.last_7_days.ms_emails = last7DaysEmailsCountByTier.ms;
    dispatches.last_7_days.ms_officers = last7DaysUniqueByTier.ms.size;
    dispatches.last_7_days.ps_emails = last7DaysEmailsCountByTier.ps;
    dispatches.last_7_days.ps_officers = last7DaysUniqueByTier.ps.size;

    (smsStatsRes.rows || []).forEach((r: any) => {
      const isToday = r.sent_date === todayStr;
      const count = Number(r.sms_count || 0);
      const name = String(r.engineer_name || '').toLowerCase();
      const cleanMobile = String(r.mobile || '').replace(/[^0-9]/g, '');

      let tier: 'de' | 'ee' | 'se' | 'ce' | 'ms' | 'ps' = 'de';
      if (name.includes('principal secretary') || name.includes('ps')) {
        tier = 'ps';
      } else if (name.includes('member secretary') || name.includes('ms')) {
        tier = 'ms';
      } else if (ceMobilesSet.has(cleanMobile) || name.includes('deepak ingale') || name.includes('chief engineer')) {
        tier = 'ce';
      } else if (seMobilesSet.has(cleanMobile) || name.includes('superintending') || name.includes('salunkhe')) {
        tier = 'se';
      } else if (eeMobilesSet.has(cleanMobile) || name.includes('rishikesh salunke') || name.includes('executive engineer')) {
        tier = 'ee';
      } else {
        tier = 'de';
      }

      dispatches.last_7_days.total_sms += count;
      if (tier === 'se') {
        dispatches.last_7_days.se_sms += count;
        dispatches.last_7_days.ce_se_sms += count;
      } else if (tier === 'ce') {
        dispatches.last_7_days.ce_sms += count;
        dispatches.last_7_days.ce_se_sms += count;
      } else {
        (dispatches.last_7_days as any)[`${tier}_sms`] += count;
      }

      if (isToday) {
        dispatches.today.total_sms += count;
        if (tier === 'se') {
          dispatches.today.se_sms += count;
          dispatches.today.ce_se_sms += count;
        } else if (tier === 'ce') {
          dispatches.today.ce_sms += count;
          dispatches.today.ce_se_sms += count;
        } else {
          (dispatches.today as any)[`${tier}_sms`] += count;
        }
      }
    });

    // Populate category breakdown (both overall categories and level_categories by tier 1..5)
    (categoryEmailStatsRes.rows || []).forEach((r: any) => {
      const cat = r.category as 'lpcd' | 'chlorine' | 'pressure' | 'offline';
      const tier = Number(r.tier || 1);
      const emailCount = Number(r.email_count || 0);
      const officerCount = Number(r.officer_count || 0);

      // Extract unique schemes covered
      let schemeCount = 0;
      if (Array.isArray(r.all_scheme_ids)) {
        const sids = new Set<string>();
        r.all_scheme_ids.forEach((item: any) => {
          if (Array.isArray(item)) item.forEach(id => { if (id) sids.add(String(id)); });
          else if (item) sids.add(String(item));
        });
        schemeCount = sids.size;
      }

      if (dispatches.last_7_days.categories[cat]) {
        dispatches.last_7_days.categories[cat].emails += emailCount;
        dispatches.last_7_days.categories[cat].officers += officerCount;
      }
      if (dispatches.last_7_days.level_categories[tier]?.[cat]) {
        dispatches.last_7_days.level_categories[tier][cat].emails += emailCount;
        dispatches.last_7_days.level_categories[tier][cat].officers += officerCount;
        dispatches.last_7_days.level_categories[tier][cat].schemes += schemeCount;
      }

      if (r.sent_date === todayStr) {
        if (tier === 1 && dispatches.today.categories[cat]) {
          dispatches.today.categories[cat].emails = emailCount;
          dispatches.today.categories[cat].officers = officerCount;
        }
        if (dispatches.today.level_categories[tier]?.[cat]) {
          dispatches.today.level_categories[tier][cat].emails = emailCount;
          dispatches.today.level_categories[tier][cat].officers = officerCount;
          dispatches.today.level_categories[tier][cat].schemes = schemeCount;
        }
      }
    });

    (categorySmsStatsRes.rows || []).forEach((r: any) => {
      const cat = r.category as 'lpcd' | 'chlorine' | 'pressure' | 'offline';
      const tier = Number(r.tier || 1);
      const count = Number(r.sms_count || 0);
      if (dispatches.last_7_days.categories[cat]) {
        dispatches.last_7_days.categories[cat].sms += count;
      }
      if (dispatches.last_7_days.level_categories[tier]?.[cat]) {
        dispatches.last_7_days.level_categories[tier][cat].sms += count;
      }
      if (r.sent_date === todayStr) {
        if (tier === 1 && dispatches.today.categories[cat]) {
          dispatches.today.categories[cat].sms = count;
        }
        if (dispatches.today.level_categories[tier]?.[cat]) {
          dispatches.today.level_categories[tier][cat].sms = count;
        }
      }
    });
  } catch (dispErr) {
    console.error("Error computing dispatch metrics in getEscalationStatus:", dispErr);
  }

  // 4. Calculate active escalation levels and flags
  const schemesList = Array.from(schemeAgg.values()).map(s => {
    if (s.max_streak_days >= 15) {
      s.escalation_level = 5;
      s.ee_escalated = true;
      s.ce_escalated = true;
      s.ms_escalated = true;
      s.ps_escalated = true;
    } else if (s.max_streak_days >= 10) {
      s.escalation_level = 4;
      s.ee_escalated = true;
      s.ce_escalated = true;
      s.ms_escalated = true;
      s.ps_escalated = false;
    } else if (s.max_streak_days >= 7) {
      s.escalation_level = 3;
      s.ee_escalated = true;
      s.ce_escalated = true;
      s.ms_escalated = false;
      s.ps_escalated = false;
    } else if (s.max_streak_days >= 3) {
      s.escalation_level = 2;
      s.ee_escalated = true;
      s.ce_escalated = false;
      s.ms_escalated = false;
      s.ps_escalated = false;
    } else {
      s.escalation_level = 1;
      s.ee_escalated = false;
      s.ce_escalated = false;
      s.ms_escalated = false;
      s.ps_escalated = false;
    }
    return s;
  });

  // Sort: Level 5 first, then Level 4, Level 3, Level 2, Level 1, then by streak desc
  schemesList.sort((a, b) => {
    if (b.escalation_level !== a.escalation_level) {
      return b.escalation_level - a.escalation_level;
    }
    return b.max_streak_days - a.max_streak_days;
  });

  // 5. Aggregate overall summary
  const summary: EscalationSummary = {
    total_schemes_in_escalation: schemesList.length,
    level_1_count: schemesList.filter(s => s.escalation_level === 1).length,
    level_2_count: schemesList.filter(s => s.escalation_level === 2).length,
    level_3_count: schemesList.filter(s => s.escalation_level === 3).length,
    level_4_count: schemesList.filter(s => s.escalation_level === 4).length,
    level_5_count: schemesList.filter(s => s.escalation_level === 5).length,
    total_villages_below_55: schemesList.reduce((acc, s) => acc + s.lpcd_villages_count, 0),
    total_esrs_low_chlorine: schemesList.reduce((acc, s) => acc + s.chlorine_low_count, 0),
    total_esrs_high_chlorine: schemesList.reduce((acc, s) => acc + s.chlorine_high_count, 0),
    total_esrs_low_pressure: schemesList.reduce((acc, s) => acc + s.pressure_low_count, 0),
    total_offline_sensors: schemesList.reduce((acc, s) => acc + s.offline_count, 0),
    total_alert_incidents: schemesList.reduce((acc, s) => acc + (s.total_email_count || 0), 0),
    dispatches,
    regional_breakdown: {},
  };

  schemesList.forEach(s => {
    const reg = s.region || 'Maharashtra';
    if (!summary.regional_breakdown[reg]) {
      summary.regional_breakdown[reg] = {
        total: 0,
        level_1: 0,
        level_2: 0,
        level_3: 0,
        level_4: 0,
        level_5: 0,
        schemes: [],
      };
    }
    const r = summary.regional_breakdown[reg];
    r.total++;
    if (s.escalation_level === 1) r.level_1++;
    else if (s.escalation_level === 2) r.level_2++;
    else if (s.escalation_level === 3) r.level_3++;
    else if (s.escalation_level === 4) r.level_4++;
    else if (s.escalation_level === 5) r.level_5++;
    r.schemes.push(s.scheme_id);
  });

  return { summary, schemes: schemesList };
}

/**
 * Builds the scheme-wise SMS text for Deputy Engineer (DE), Executive Engineer (EE Civil), Chief Engineer (CE), or Member Secretary (MS)
 * 
 * Note: Level 2 (EE) and Level 3 (CE) use approved Airtel DLT Template ID: 1077030110068762585:
 * सूचना: JJM MVS {#alphanumeric#} अंतर्गत मागील {#numeric#} दिवसांपासून 55 LPCD पेक्षा कमी पाणीपुरवठा असलेली {#numeric#} गावे आहेत. तसेच, {#alphanumeric#}. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा
 */
export function renderSchemeEscalationSMS(scheme: SchemeEscalationItem, recipientRole: 'DE' | 'EE' | 'CE' | 'MS' | 'PS'): string {
  // EE (after 3 days) and CE (after 7 days) approved Airtel DLT template (Template ID: 1077030110068762585)
  if (recipientRole === 'EE' || recipientRole === 'CE') {
    const days = recipientRole === 'EE' ? 3 : 7;
    const extraParts: string[] = [];
    if (scheme.chlorine_low_count > 0) extraParts.push(`${scheme.chlorine_low_count} ESR कमी क्लोरीन`);
    if (scheme.chlorine_high_count > 0) extraParts.push(`${scheme.chlorine_high_count} ESR जास्त क्लोरीन`);
    if (scheme.pressure_low_count > 0) extraParts.push(`${scheme.pressure_low_count} ESR कमी दाब`);
    if (scheme.offline_count > 0) extraParts.push(`${scheme.offline_count} सेन्सर ऑफलाइन`);

    const otherIssues = extraParts.length > 0
      ? `${extraParts.join(', ')} त्रुटी आढळल्या आहेत`
      : 'इतर तांत्रिक बाबी सुरळीत आहेत';

    return `सूचना: JJM MVS ${scheme.scheme_name} अंतर्गत मागील ${days} दिवसांपासून 55 LPCD पेक्षा कमी पाणीपुरवठा असलेली ${scheme.lpcd_villages_count} गावे आहेत. तसेच, ${otherIssues}. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`;
  }

  const levelText = recipientRole === 'PS'
    ? 'स्तर ५ (PS Principal Secretary Escalation)'
    : recipientRole === 'MS'
    ? 'स्तर ४ (MS Member Secretary Escalation)'
    : 'स्तर १ (DE/AE Daily Notice)';
  const days = scheme.max_streak_days;
  
  const parts: string[] = [];
  if (scheme.lpcd_villages_count > 0) parts.push(`${scheme.lpcd_villages_count} गावे <55 LPCD`);
  if (scheme.chlorine_low_count > 0) parts.push(`${scheme.chlorine_low_count} ESR कमी क्लोरीन`);
  if (scheme.chlorine_high_count > 0) parts.push(`${scheme.chlorine_high_count} ESR जास्त क्लोरीन`);
  if (scheme.pressure_low_count > 0) parts.push(`${scheme.pressure_low_count} ESR कमी दाब`);
  if (scheme.offline_count > 0) parts.push(`${scheme.offline_count} सेन्सर ऑफलाइन`);

  const issuesSummary = parts.length > 0 ? parts.join(', ') : 'त्रुटी आढळल्या';

  if (recipientRole === 'DE') {
    return `सूचना (${levelText}): JJM MVS योजना ${scheme.scheme_name} (ID: ${scheme.scheme_id}) मध्ये आज खालील त्रुटी आढळल्या आहेत: ${issuesSummary}. कृपया प्रत्यक्ष जागेवर जाऊन त्वरित निवारण करावे. – मजीप्रा`;
  }

  // Fallback for MS (every 10 days) and PS (15+ days persistent)
  return `सूचना (${levelText}): JJM MVS योजना ${scheme.scheme_name} (ID: ${scheme.scheme_id}) मध्ये सलग ${days} दिवसांपासून खालील त्रुटी कायम आहेत: ${issuesSummary}. कृपया प्राधान्याने कार्यवाही करावी. – मजीप्रा`;
}

/**
 * Builds the scheme-wise HTML Email for Deputy / Assistant Engineer (DE/AE Civil)
 */
export function renderDeSchemeDailyEmail(scheme: SchemeEscalationItem): { subject: string; html: string } {
  const subject = `🟢 [Tier 1 Daily Operational Alert] Scheme: ${scheme.scheme_name} (${scheme.scheme_id})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 24px; text-align: left; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 0; font-size: 13px; opacity: 0.95; }
        .badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-top: 8px; }
        .content { padding: 24px; }
        .scheme-meta { background: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 24px; }
        .kpi-box { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; background: #f0fdf4; }
        .kpi-num { font-size: 20px; font-weight: 700; color: #047857; }
        .kpi-label { font-size: 11px; color: #065f46; font-weight: 500; text-transform: uppercase; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12.5px; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .alert-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag-lpcd { background: #fee2e2; color: #991b1b; }
        .tag-cl { background: #fef3c7; color: #92400e; }
        .tag-pr { background: #e0f2fe; color: #075985; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🟢 Deputy / Assistant Engineer (Civil) - Tier 1 Operational Alert</h1>
          <p>Daily non-compliance parameters detected for <strong>${scheme.scheme_name}</strong></p>
          <span class="badge">Frontline Operations • Day 1 - 2 Response Window</span>
        </div>
        <div class="content">
          <div class="scheme-meta">
            <strong>Scheme:</strong> ${scheme.scheme_name} (ID: ${scheme.scheme_id})<br>
            <strong>Region:</strong> ${scheme.region} &nbsp;|&nbsp; <strong>Division:</strong> ${scheme.division || 'N/A'}<br>
            <strong>Assigned DE/AE (Civil):</strong> ${scheme.de_ae_civil_name || 'Frontline Engineer'} (${scheme.de_ae_civil_email || 'N/A'}, ${scheme.de_ae_civil_mobile || 'N/A'})<br>
            <strong>Supervising EE (Civil):</strong> ${scheme.ee_civil_name || 'Executive Engineer'} (${scheme.ee_civil_mobile || 'N/A'})
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-num">${scheme.lpcd_villages_count}</div>
              <div class="kpi-label">Villages &lt; 55 LPCD</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_low_count}</div>
              <div class="kpi-label">ESRs Low Cl</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_high_count}</div>
              <div class="kpi-label">ESRs High Cl</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.pressure_low_count}</div>
              <div class="kpi-label">ESRs Low Press</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin: 18px 0 8px 0; color: #0f172a;">Active Location Defect Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Issue Type</th>
                <th>Active Streak</th>
                <th>Recorded Value</th>
              </tr>
            </thead>
            <tbody>
              ${scheme.lpcd_villages.map(v => `
                <tr>
                  <td><strong>${v.village_name}</strong> (Village)</td>
                  <td><span class="alert-tag tag-lpcd">Low LPCD (&lt;55)</span></td>
                  <td>${v.days_count} Days</td>
                  <td>${v.avg_val ? `${v.avg_val} LPCD` : 'Below 55'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_low_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">Low Chlorine (&lt;0.2)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&lt;0.2 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_high_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">High Chlorine (&gt;0.5)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&gt;0.5 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.pressure_low_esrs.map(p => `
                <tr>
                  <td>${p.village_name} - <strong>${p.esr_name}</strong></td>
                  <td><span class="alert-tag tag-pr">Low Pressure (&lt;0.2)</span></td>
                  <td>${p.days_count} Days</td>
                  <td>${p.val ? `${p.val} bar` : '&lt;0.2 bar'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
            Action Directive: Frontline inspection and corrective dosing/valving required within 24 hours. If this issue remains unresolved for 3 days, it will automatically escalate to Tier 2 (Executive Engineer).
          </p>
        </div>
        <div class="footer">
          Jal Jeevan Mission IoT Cell — Maharashtra Jeevan Pradhikaran (MJP)<br>
          Automated Tier 1 Frontline Response Engine
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Builds the scheme-wise HTML Email for Executive Engineer (EE Civil)
 */
export function renderEeSchemeEscalationEmail(scheme: SchemeEscalationItem): { subject: string; html: string } {
  const subject = `⚠️ [Level 2 Escalation - 3+ Days Persistent] Scheme: ${scheme.scheme_name} (${scheme.scheme_id})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; padding: 24px; text-align: left; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 0; font-size: 13px; opacity: 0.95; }
        .badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-top: 8px; }
        .content { padding: 24px; }
        .scheme-meta { background: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 24px; }
        .kpi-box { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .kpi-num { font-size: 20px; font-weight: 700; color: #b45309; }
        .kpi-label { font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12.5px; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .alert-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag-lpcd { background: #fee2e2; color: #991b1b; }
        .tag-cl { background: #fef3c7; color: #92400e; }
        .tag-pr { background: #e0f2fe; color: #075985; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⚠️ Executive Engineer (Civil) - Level 2 Escalation</h1>
          <p>This scheme has triggered non-compliance alerts for <strong>${scheme.max_streak_days} consecutive days</strong></p>
          <span class="badge">Persistence Streak: ${scheme.max_streak_days} Days Unresolved</span>
        </div>
        <div class="content">
          <div class="scheme-meta">
            <strong>Scheme:</strong> ${scheme.scheme_name} (ID: ${scheme.scheme_id})<br>
            <strong>Region:</strong> ${scheme.region} &nbsp;|&nbsp; <strong>Division:</strong> ${scheme.division || 'N/A'}<br>
            <strong>Assigned EE (Civil):</strong> ${scheme.ee_civil_name || 'Executive Engineer'} (${scheme.ee_civil_email || 'N/A'})<br>
            <strong>Frontline DE/AE (Civil):</strong> ${scheme.de_ae_civil_name || 'DE Civil'} (${scheme.de_ae_civil_mobile || 'N/A'})
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-num">${scheme.lpcd_villages_count}</div>
              <div class="kpi-label">Villages &lt; 55 LPCD</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_low_count}</div>
              <div class="kpi-label">ESRs Low Chlorine</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_high_count}</div>
              <div class="kpi-label">ESRs High Chlorine</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.pressure_low_count}</div>
              <div class="kpi-label">ESRs Low Pressure</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin: 18px 0 8px 0; color: #0f172a;">Persistent Village & ESR Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Issue Type</th>
                <th>Persistent Days</th>
                <th>Recorded Value</th>
              </tr>
            </thead>
            <tbody>
              ${scheme.lpcd_villages.map(v => `
                <tr>
                  <td><strong>${v.village_name}</strong> (Village)</td>
                  <td><span class="alert-tag tag-lpcd">Low LPCD (&lt;55)</span></td>
                  <td>${v.days_count} Days</td>
                  <td>${v.avg_val ? `${v.avg_val} LPCD` : 'Below 55'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_low_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">Low Chlorine (&lt;0.2)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&lt;0.2 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_high_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">High Chlorine (&gt;0.5)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&gt;0.5 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.pressure_low_esrs.map(p => `
                <tr>
                  <td>${p.village_name} - <strong>${p.esr_name}</strong></td>
                  <td><span class="alert-tag tag-pr">Low Pressure (&lt;0.2)</span></td>
                  <td>${p.days_count} Days</td>
                  <td>${p.val ? `${p.val} bar` : '&lt;0.2 bar'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
            As per Maharashtra Jeevan Pradhikaran operational escalation protocol, this notification is automatically triggered after 3 consecutive days of unresolved non-compliance. If these issues remain unaddressed for 7 days, they will be automatically escalated to the <strong>Chief Engineer</strong>.
          </p>
        </div>
        <div class="footer">
          Jal Jeevan Mission IoT Cell — Maharashtra Jeevan Pradhikaran (MJP)<br>
          Automated Escalation Matrix Engine
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Builds ONE consolidated regional HTML Email for Chief Engineer (CE) covering ALL 7-day persistent schemes in that region
 */
export function renderCeRegionalConsolidatedEmail(region: string, schemes: SchemeEscalationItem[]): { subject: string; html: string } {
  const subject = `🚨 [Level 3 Escalation] Unresolved Issues Summary: ${region} Region (${schemes.length} Schemes Over 7+ Days)`;

  const totalVillages = schemes.reduce((acc, s) => acc + s.lpcd_villages_count, 0);
  const totalCl = schemes.reduce((acc, s) => acc + s.chlorine_low_count + s.chlorine_high_count, 0);
  const totalPr = schemes.reduce((acc, s) => acc + s.pressure_low_count, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); color: #ffffff; padding: 26px 30px; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
        .header p { margin: 0; font-size: 13.5px; opacity: 0.95; }
        .badge { display: inline-block; background: rgba(255,255,255,0.22); color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 600; margin-top: 10px; }
        .content { padding: 26px 30px; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 26px; }
        .kpi-box { flex: 1; padding: 14px; border-radius: 8px; text-align: center; border: 1px solid #fee2e2; background: #fef2f2; }
        .kpi-num { font-size: 24px; font-weight: 800; color: #991b1b; }
        .kpi-label { font-size: 11px; color: #7f1d1d; font-weight: 600; text-transform: uppercase; margin-top: 3px; }
        .scheme-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; background: #ffffff; }
        .scheme-title { font-size: 15px; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
        .scheme-streak { background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; }
        .scheme-officers { font-size: 12.5px; color: #475569; margin: 8px 0; }
        .scheme-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; font-size: 11.5px; }
        .pill { padding: 3px 9px; border-radius: 4px; font-weight: 600; }
        .pill-red { background: #fee2e2; color: #991b1b; }
        .pill-amber { background: #fef3c7; color: #92400e; }
        .pill-blue { background: #e0f2fe; color: #075985; }
        .footer { background: #f8fafc; padding: 18px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🚨 Chief Engineer — Level 3 Weekly Escalation Summary</h1>
          <p>Region: <strong>${region}</strong> | Comprehensive Weekly Unresolved Summary</p>
          <span class="badge">7+ Consecutive Days of Chronic Breach</span>
        </div>
        <div class="content">
          <p style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-top: 0;">
            Respected Chief Engineer,<br>
            The following <strong>${schemes.length} water supply schemes</strong> in the <strong>${region} Region</strong> have experienced continuous non-compliance exceeding <strong>7 consecutive days</strong>. Despite daily frontline notifications to DE/AE and 3-day Level 2 escalations to Executive Engineers, the issues remain unresolved.
          </p>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-num">${schemes.length}</div>
              <div class="kpi-label">Chronic Schemes</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${totalVillages}</div>
              <div class="kpi-label">Villages &lt; 55 LPCD</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${totalCl}</div>
              <div class="kpi-label">ESRs Chlorine Issues</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${totalPr}</div>
              <div class="kpi-label">ESRs Low Pressure</div>
            </div>
          </div>

          <h3 style="font-size: 15px; margin: 24px 0 12px 0; color: #0f172a;">Chronically Breached Schemes Breakdown</h3>

          ${schemes.map((s, idx) => `
            <div class="scheme-item">
              <div class="scheme-title">
                <span>${idx + 1}. ${s.scheme_name} (ID: ${s.scheme_id})</span>
                <span class="scheme-streak">🔥 ${s.max_streak_days} Days Streak</span>
              </div>
              <div class="scheme-officers">
                <strong>Executive Engineer (Civil):</strong> ${s.ee_civil_name || 'N/A'} (${s.ee_civil_mobile || 'N/A'}, ${s.ee_civil_email || 'N/A'})<br>
                <strong>Deputy Engineer (Civil):</strong> ${s.de_ae_civil_name || 'N/A'} (${s.de_ae_civil_mobile || 'N/A'})
              </div>
              <div class="scheme-pills">
                ${s.lpcd_villages_count > 0 ? `<span class="pill pill-red">💧 ${s.lpcd_villages_count} Villages &lt; 55 LPCD</span>` : ''}
                ${s.chlorine_low_count > 0 ? `<span class="pill pill-amber">🧪 ${s.chlorine_low_count} ESRs Low Chlorine</span>` : ''}
                ${s.chlorine_high_count > 0 ? `<span class="pill pill-amber">🧪 ${s.chlorine_high_count} ESRs High Chlorine</span>` : ''}
                ${s.pressure_low_count > 0 ? `<span class="pill pill-blue">⏱️ ${s.pressure_low_count} ESRs Low Pressure</span>` : ''}
                ${s.offline_count > 0 ? `<span class="pill pill-red">📡 ${s.offline_count} Sensors Offline</span>` : ''}
              </div>
            </div>
          `).join('')}

          <p style="margin-top: 26px; font-size: 13px; color: #64748b; line-height: 1.5;">
            Action Requested: Direct regional intervention with the respective Executive Engineers and Circle Superintending Engineers is requested to ensure compliance under Jal Jeevan Mission service delivery standards.
          </p>
        </div>
        <div class="footer">
          Jal Jeevan Mission IoT Cell — Maharashtra Jeevan Pradhikaran (MJP)<br>
          Escalation Matrix Monitoring System
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Builds the scheme-wise HTML Email for Member Secretary (MS) - Level 4 Escalation
 */
export function renderMsSchemeEscalationEmail(scheme: SchemeEscalationItem): { subject: string; html: string } {
  const subject = `🚨 [Level 4 Escalation - 10+ Days Unresolved] Scheme: ${scheme.scheme_name} (${scheme.scheme_id})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); border: 1px solid #cbd5e1; overflow: hidden; }
        .header { background: linear-gradient(135deg, #581c87 0%, #3b0764 100%); color: #ffffff; padding: 26px 30px; text-align: left; }
        .header h1 { margin: 0 0 6px 0; font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 0; font-size: 13.5px; opacity: 0.95; }
        .badge { display: inline-block; background: rgba(255,255,255,0.22); color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 10px; text-transform: uppercase; }
        .content { padding: 26px 30px; }
        .scheme-meta { background: #faf5ff; border: 1px solid #e9d5ff; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 24px; }
        .kpi-box { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; background: #f8fafc; }
        .kpi-num { font-size: 20px; font-weight: 700; color: #6b21a8; }
        .kpi-label { font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12.5px; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .alert-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag-lpcd { background: #fee2e2; color: #991b1b; }
        .tag-cl { background: #fef3c7; color: #92400e; }
        .tag-pr { background: #e0f2fe; color: #075985; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🚨 Member Secretary (MS) — Level 4 Escalation Notice</h1>
          <p>Critical non-compliance persisting for <strong>${scheme.max_streak_days} consecutive days</strong> across multi-tier alerts</p>
          <span class="badge">Level 4 Escalation • ${scheme.max_streak_days} Days Unresolved</span>
        </div>
        <div class="content">
          <div class="scheme-meta">
            <strong>Scheme:</strong> ${scheme.scheme_name} (ID: ${scheme.scheme_id})<br>
            <strong>Region:</strong> ${scheme.region} &nbsp;|&nbsp; <strong>Division:</strong> ${scheme.division || 'N/A'}<br>
            <strong>Executive Engineer (EE Civil):</strong> ${scheme.ee_civil_name || 'N/A'} (${scheme.ee_civil_mobile || 'N/A'})<br>
            <strong>Chief Engineer (CE):</strong> ${scheme.chief_engineer_name || 'N/A'} (${scheme.chief_engineer_mobile || 'N/A'})<br>
            <strong>Superintending Engineer (SE):</strong> ${scheme.se_name || 'N/A'} (${scheme.se_mobile || 'N/A'})
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-num">${scheme.lpcd_villages_count}</div>
              <div class="kpi-label">Villages &lt; 55 LPCD</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_low_count}</div>
              <div class="kpi-label">ESRs Low Cl</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_high_count}</div>
              <div class="kpi-label">ESRs High Cl</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.pressure_low_count}</div>
              <div class="kpi-label">ESRs Low Press</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin: 18px 0 8px 0; color: #0f172a;">Persistent Defect Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Issue Type</th>
                <th>Active Streak</th>
                <th>Recorded Value</th>
              </tr>
            </thead>
            <tbody>
              ${scheme.lpcd_villages.map(v => `
                <tr>
                  <td><strong>${v.village_name}</strong> (Village)</td>
                  <td><span class="alert-tag tag-lpcd">Low LPCD (&lt;55)</span></td>
                  <td>${v.days_count} Days</td>
                  <td>${v.avg_val ? `${v.avg_val} LPCD` : '&lt;55 LPCD'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_low_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">Low Chlorine (&lt;0.2)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&lt;0.2 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_high_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">High Chlorine (&gt;0.5)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&gt;0.5 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.pressure_low_esrs.map(p => `
                <tr>
                  <td>${p.village_name} - <strong>${p.esr_name}</strong></td>
                  <td><span class="alert-tag tag-pr">Low Pressure (&lt;0.2)</span></td>
                  <td>${p.days_count} Days</td>
                  <td>${p.val ? `${p.val} bar` : '&lt;0.2 bar'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
            Escalation Note: This scheme has exceeded 14 consecutive days of unresolved issues despite Sub-Division (DE), Division (EE), and Regional (CE/SE) alerts. Direct administrative review by the Member Secretary is initiated.
          </p>
        </div>
        <div class="footer">
          Jal Jeevan Mission IoT Cell — Maharashtra Jeevan Pradhikaran (MJP)<br>
          Escalation Matrix Monitoring System
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Builds the scheme-wise HTML Email for Principal Secretary (PS) - Level 5 Escalation
 */
export function renderPsSchemeEscalationEmail(scheme: SchemeEscalationItem): { subject: string; html: string } {
  const subject = `🚨 [Level 5 Escalation - 15+ Days Persistent] Scheme: ${scheme.scheme_name} (${scheme.scheme_id})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid #cbd5e1; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 26px 30px; text-align: left; }
        .header h1 { margin: 0 0 6px 0; font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 0; font-size: 13.5px; opacity: 0.95; }
        .badge { display: inline-block; background: rgba(255,255,255,0.22); color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 10px; text-transform: uppercase; }
        .content { padding: 26px 30px; }
        .scheme-meta { background: #eef2ff; border: 1px solid #c7d2fe; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 24px; }
        .kpi-box { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; background: #f8fafc; }
        .kpi-num { font-size: 20px; font-weight: 700; color: #3730a3; }
        .kpi-label { font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12.5px; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .alert-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag-lpcd { background: #fee2e2; color: #991b1b; }
        .tag-cl { background: #fef3c7; color: #92400e; }
        .tag-pr { background: #e0f2fe; color: #075985; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🚨 Principal Secretary (PS) — Level 5 Escalation Notice</h1>
          <p>Critical non-compliance persisting for <strong>${scheme.max_streak_days} consecutive days (15+ Days Persisting)</strong></p>
          <span class="badge">Level 5 Escalation • ${scheme.max_streak_days} Days Unresolved</span>
        </div>
        <div class="content">
          <div class="scheme-meta">
            <strong>Scheme:</strong> ${scheme.scheme_name} (ID: ${scheme.scheme_id})<br>
            <strong>Region:</strong> ${scheme.region} &nbsp;|&nbsp; <strong>Division:</strong> ${scheme.division || 'N/A'}<br>
            <strong>Executive Engineer (EE Civil):</strong> ${scheme.ee_civil_name || 'N/A'} (${scheme.ee_civil_mobile || 'N/A'})<br>
            <strong>Chief Engineer (CE):</strong> ${scheme.chief_engineer_name || 'N/A'} (${scheme.chief_engineer_mobile || 'N/A'})<br>
            <strong>Superintending Engineer (SE):</strong> ${scheme.se_name || 'N/A'} (${scheme.se_mobile || 'N/A'})<br>
            <strong>Member Secretary (MS):</strong> Member Secretary, MJP (ms.mjp@gov.in)
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-num">${scheme.max_streak_days}d</div>
              <div class="kpi-label">Active Streak</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.lpcd_villages_count}</div>
              <div class="kpi-label">Villages &lt; 55 LPCD</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.chlorine_low_count + scheme.chlorine_high_count}</div>
              <div class="kpi-label">Chlorine Defects</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${scheme.offline_count}</div>
              <div class="kpi-label">Offline Sensors</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin: 0 0 8px 0; color: #1e293b;">Persistent Non-Compliance Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Village / Component</th>
                <th>Issue Category</th>
                <th>Consecutive Days</th>
                <th>Last Sensor Reading</th>
              </tr>
            </thead>
            <tbody>
              ${scheme.lpcd_villages.map(v => `
                <tr>
                  <td><strong>${v.village_name}</strong></td>
                  <td><span class="alert-tag tag-lpcd">Low LPCD (&lt;55)</span></td>
                  <td>${v.days_count} Days</td>
                  <td>${v.avg_val ? `${v.avg_val} LPCD` : '&lt;55 LPCD'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_low_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">Low Chlorine (&lt;0.2)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&lt;0.2 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.chlorine_high_esrs.map(c => `
                <tr>
                  <td>${c.village_name} - <strong>${c.esr_name}</strong></td>
                  <td><span class="alert-tag tag-cl">High Chlorine (&gt;0.5)</span></td>
                  <td>${c.days_count} Days</td>
                  <td>${c.val ? `${c.val} mg/L` : '&gt;0.5 mg/L'}</td>
                </tr>
              `).join('')}
              ${scheme.pressure_low_esrs.map(p => `
                <tr>
                  <td>${p.village_name} - <strong>${p.esr_name}</strong></td>
                  <td><span class="alert-tag tag-pr">Low Pressure (&lt;0.2)</span></td>
                  <td>${p.days_count} Days</td>
                  <td>${p.val ? `${p.val} bar` : '&lt;0.2 bar'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
            Escalation Note: This scheme has persisted for 15+ consecutive days without resolution across frontline, division, regional, and Member Secretary levels. Escalated directly to Principal Secretary (PS), Water Supply and Sanitation Department.
          </p>
        </div>
        <div class="footer">
          Water Supply & Sanitation Department, Government of Maharashtra • High-Level Escalation Matrix
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}


/**
 * Fetches configured Executive Contacts for Member Secretary (MS) and Principal Secretary (PS).
 * Priority: Environment Variables -> DB users table -> Default fallbacks.
 */
export async function getExecutiveContacts(): Promise<{
  ms: { name: string; email: string; mobile: string };
  ps: { name: string; email: string; mobile: string };
}> {
  try {
    const db = await getDB();
    const [msUser, psUser] = await Promise.all([
      db.select().from(users).where(eq(users.username, "member_secretary")).limit(1),
      db.select().from(users).where(eq(users.username, "principal_secretary")).limit(1),
    ]);

    return {
      ms: {
        name: process.env.MS_NAME || msUser[0]?.name || "Member Secretary (MS)",
        email: process.env.MS_EMAIL || msUser[0]?.email || "ms.mjp@gov.in",
        mobile: process.env.MS_MOBILE || msUser[0]?.phone || "9820000000",
      },
      ps: {
        name: process.env.PS_NAME || psUser[0]?.name || "Principal Secretary (PS)",
        email: process.env.PS_EMAIL || psUser[0]?.email || "ps.wss@maharashtra.gov.in",
        mobile: process.env.PS_MOBILE || psUser[0]?.phone || "9821000000",
      },
    };
  } catch (err) {
    console.error("Error in getExecutiveContacts:", err);
    return {
      ms: {
        name: process.env.MS_NAME || "Member Secretary (MS)",
        email: process.env.MS_EMAIL || "ms.mjp@gov.in",
        mobile: process.env.MS_MOBILE || "9820000000",
      },
      ps: {
        name: process.env.PS_NAME || "Principal Secretary (PS)",
        email: process.env.PS_EMAIL || "ps.wss@maharashtra.gov.in",
        mobile: process.env.PS_MOBILE || "9821000000",
      },
    };
  }
}

/**
 * Updates configured Executive Contacts for Member Secretary (MS) and Principal Secretary (PS) in the users table.
 */
export async function updateExecutiveContacts(data: {
  ms?: { name?: string; email?: string; mobile?: string };
  ps?: { name?: string; email?: string; mobile?: string };
}): Promise<void> {
  const db = await getDB();
  if (data.ms) {
    const updatePayload: Record<string, any> = {};
    if (data.ms.name) updatePayload.name = data.ms.name.trim();
    if (data.ms.email) updatePayload.email = data.ms.email.trim().toLowerCase();
    if (data.ms.mobile) updatePayload.phone = data.ms.mobile.trim();

    if (Object.keys(updatePayload).length > 0) {
      await db.update(users).set(updatePayload).where(eq(users.username, "member_secretary"));
    }
  }

  if (data.ps) {
    const updatePayload: Record<string, any> = {};
    if (data.ps.name) updatePayload.name = data.ps.name.trim();
    if (data.ps.email) updatePayload.email = data.ps.email.trim().toLowerCase();
    if (data.ps.mobile) updatePayload.phone = data.ps.mobile.trim();

    if (Object.keys(updatePayload).length > 0) {
      await db.update(users).set(updatePayload).where(eq(users.username, "principal_secretary"));
    }
  }
}

/**
 * Dispatches Escalations:
 * - Level 2 (EE Civil): Scheme-wise Email & Scheme-wise SMS (3+ days unresolved)
 * - Level 3 (Chief Engineer): Consolidated Regional Email + Scheme-wise SMS (7+ days unresolved)
 * - Level 4 (Member Secretary): Scheme-wise Email & SMS for all schemes unresolved for 10+ days (dispatched every 10 days)
 * - Level 5 (Principal Secretary): Scheme-wise Email & SMS for all persistent schemes unresolved for 15+ days
 */
export async function executeEscalationDispatch(options: {
  dryRun?: boolean;
  schemeId?: string;
  region?: string;
} = {}): Promise<{
  success: boolean;
  ee_emails_sent: number;
  ee_sms_sent: number;
  ce_emails_sent: number;
  ce_sms_sent: number;
  ms_emails_sent: number;
  ms_sms_sent: number;
  ps_emails_sent: number;
  ps_sms_sent: number;
  logs: string[];
}> {
  const { schemes } = await getEscalationStatus({ region: options.region });
  const execContacts = await getExecutiveContacts();
  const logs: string[] = [];
  const result = {
    success: true,
    ee_emails_sent: 0,
    ee_sms_sent: 0,
    ce_emails_sent: 0,
    ce_sms_sent: 0,
    ms_emails_sent: 0,
    ms_sms_sent: 0,
    ps_emails_sent: 0,
    ps_sms_sent: 0,
    logs,
  };

  const dryRun = options.dryRun !== false; // Default to dry-run unless explicitly false

  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
  }).formatToParts(now);
  let weekday = "";
  let dayOfMonth = 1;
  for (const p of istParts) {
    if (p.type === "weekday") weekday = p.value;
    if (p.type === "day") dayOfMonth = parseInt(p.value, 10);
  }
  const isMonday = weekday === "Mon";
  const is1stMonday = isMonday && dayOfMonth >= 1 && dayOfMonth <= 7;
  const is3rdMonday = isMonday && dayOfMonth >= 15 && dayOfMonth <= 21;
  const is1stOr3rdMonday = is1stMonday || is3rdMonday;

  // Filter if single scheme requested
  const targetSchemes = options.schemeId
    ? schemes.filter(s => s.scheme_id === options.schemeId)
    : schemes;

  logs.push(`🔍 Evaluating ${targetSchemes.length} schemes for escalation dispatch (Mode: ${dryRun ? 'PREVIEW / DRY RUN' : 'LIVE DISPATCH'}, Monday: ${isMonday}, 1st/3rd Mon: ${is1stOr3rdMonday})...`);

  // --- 1. Level 2 Escalations to EE (Civil) (Every 3rd day if streak >= 3 days) ---
  const level2Schemes = options.schemeId
    ? targetSchemes.filter(s => s.max_streak_days >= 3)
    : targetSchemes.filter(s => s.max_streak_days >= 3 && s.max_streak_days % 3 === 0);
  logs.push(`📊 Found ${level2Schemes.length} schemes eligible for Level 2 EE dispatch (Every 3rd day, streak >= 3 days).`);

  for (const scheme of level2Schemes) {
    const eeEmail = scheme.ee_civil_email;
    const eeMobile = scheme.ee_civil_mobile;

    // Send Scheme-wise Email to EE Civil
    if (eeEmail) {
      const emailPayload = renderEeSchemeEscalationEmail(scheme);
      if (!dryRun) {
        try {
          await sendMail({
            to: eeEmail,
            subject: emailPayload.subject,
            html: emailPayload.html,
          });
          result.ee_emails_sent++;
          try {
            const db = await getDB();
            await db.insert(emailAlertLogs).values({
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              region: scheme.region,
              alert_type: 'Escalation Level 2 (EE)',
              alert_value: `${scheme.max_streak_days} Days Unresolved`,
              ee_civil_name: scheme.ee_civil_name,
              ee_civil_email: eeEmail,
              ticket_id: `ESC-EE-${scheme.scheme_id}-${Date.now()}`,
              dispatch_type: 'escalation_level2',
            });
          } catch (logErr) {
            console.error("Failed to insert EE email alert log:", logErr);
          }
          logs.push(`✅ [EE Email Sent] ${scheme.scheme_name} -> ${eeEmail}`);
        } catch (err: any) {
          logs.push(`❌ [EE Email Failed] ${scheme.scheme_name} (${eeEmail}): ${err.message}`);
        }
      } else {
        result.ee_emails_sent++;
        logs.push(`[Dry Run EE Email] Would send to ${eeEmail} for scheme ${scheme.scheme_id}`);
      }
    }

    // Send Scheme-wise SMS to EE Civil
    if (eeMobile) {
      const smsText = renderSchemeEscalationSMS(scheme, 'EE');
      if (!dryRun) {
        try {
          const smsRes = await sendSmartpingDLTSMS({
            mobile: eeMobile,
            text: smsText,
            dltContentId: '1077030110068762585', // Approved Airtel DLT Escalation Template ID (EE - 3 Days)
          });
          if (smsRes.success) result.ee_sms_sent++;
          await logSmsAlert({
            mobile: eeMobile,
            engineer_name: scheme.ee_civil_name,
            engineer_email: eeEmail,
            scheme_id: scheme.scheme_id,
            scheme_name: scheme.scheme_name,
            template_id: '1077030110068762585',
            template_name: 'Level 2 Escalation EE Civil (3 Days)',
            message_text: smsText,
            gateway_status: smsRes.status,
            gateway_response: smsRes.response,
            is_success: smsRes.success,
            dispatch_type: 'escalation_level2',
          });
          logs.push(`✅ [EE SMS Sent] ${scheme.scheme_name} -> ${eeMobile}`);
        } catch (err: any) {
          logs.push(`❌ [EE SMS Failed] ${scheme.scheme_name} (${eeMobile}): ${err.message}`);
        }
      } else {
        result.ee_sms_sent++;
        logs.push(`[Dry Run EE SMS] Would send to ${eeMobile}: "${smsText.slice(0, 60)}..."`);
      }
    }
  }

  // --- 2. Level 3 Escalations to Chief Engineer (CE) (Every Monday for streak >= 7 days) ---
  const level3Schemes = options.schemeId
    ? targetSchemes.filter(s => s.max_streak_days >= 7)
    : (isMonday ? targetSchemes.filter(s => s.max_streak_days >= 7) : []);
  logs.push(`📊 Found ${level3Schemes.length} schemes for Level 3 (Every Monday, streak >= 7 days; Today is Monday: ${isMonday}).`);

  // Group Level 3 schemes by Region for CE consolidated Email
  const schemesByRegion = new Map<string, SchemeEscalationItem[]>();
  level3Schemes.forEach(s => {
    const reg = s.region || 'Maharashtra';
    if (!schemesByRegion.has(reg)) schemesByRegion.set(reg, []);
    schemesByRegion.get(reg)!.push(s);
  });

  for (const [region, regSchemes] of schemesByRegion.entries()) {
    const firstScheme = regSchemes[0];
    const ceEmail = firstScheme?.chief_engineer_email;
    const ceMobile = firstScheme?.chief_engineer_mobile;

    // Send ONE Consolidated Regional Email to CE covering all chronic schemes in that region
    if (ceEmail) {
      const emailPayload = renderCeRegionalConsolidatedEmail(region, regSchemes);
      if (!dryRun) {
        try {
          await sendMail({
            to: ceEmail,
            subject: emailPayload.subject,
            html: emailPayload.html,
          });
          result.ce_emails_sent++;
          try {
            const db = await getDB();
            await db.insert(emailAlertLogs).values({
              scheme_id: firstScheme.scheme_id,
              scheme_name: `${region} Consolidated (${regSchemes.length} Schemes)`,
              region: region,
              alert_type: 'Escalation Level 3 (CE)',
              alert_value: '7+ Days Regional Digest',
              chief_engineer_name: firstScheme.chief_engineer_name,
              chief_engineer_email: ceEmail,
              ticket_id: `ESC-CE-${region}-${Date.now()}`,
              dispatch_type: 'escalation_level3',
            });
          } catch (logErr) {
            console.error("Failed to insert CE email alert log:", logErr);
          }
          logs.push(`✅ [CE Consolidated Email Sent] ${region} (${regSchemes.length} schemes) -> ${ceEmail}`);
        } catch (err: any) {
          logs.push(`❌ [CE Email Failed] ${region} (${ceEmail}): ${err.message}`);
        }
      } else {
        result.ce_emails_sent++;
        logs.push(`[Dry Run CE Regional Email] Would send consolidated digest for ${region} (${regSchemes.length} schemes) to ${ceEmail}`);
      }
    }

    // Send Scheme-wise SMS to CE for each chronic scheme
    if (ceMobile) {
      for (const scheme of regSchemes) {
        const smsText = renderSchemeEscalationSMS(scheme, 'CE');
        if (!dryRun) {
          try {
            const smsRes = await sendSmartpingDLTSMS({
              mobile: ceMobile,
              text: smsText,
              dltContentId: '1077030110068762585', // Approved Airtel DLT Escalation Template ID (CE - 7 Days)
            });
            if (smsRes.success) result.ce_sms_sent++;
            await logSmsAlert({
              mobile: ceMobile,
              engineer_name: scheme.chief_engineer_name,
              engineer_email: ceEmail,
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              template_id: '1077030110068762585',
              template_name: 'Level 3 Escalation CE (7 Days)',
              message_text: smsText,
              gateway_status: smsRes.status,
              gateway_response: smsRes.response,
              is_success: smsRes.success,
              dispatch_type: 'escalation_level3',
            });
            logs.push(`✅ [CE Scheme SMS Sent] ${scheme.scheme_name} -> ${ceMobile}`);
          } catch (err: any) {
            logs.push(`❌ [CE SMS Failed] ${scheme.scheme_name} (${ceMobile}): ${err.message}`);
          }
        } else {
          result.ce_sms_sent++;
          logs.push(`[Dry Run CE SMS] Would send to ${ceMobile} for scheme ${scheme.scheme_id}: "${smsText.slice(0, 60)}..."`);
        }
      }
    }
  }

  // --- 3. Level 4 Escalations to Member Secretary (MS) (1st & 3rd Monday for streak >= 15 days) ---
  const level4Schemes = options.schemeId
    ? targetSchemes.filter(s => s.max_streak_days >= 15)
    : (is1stOr3rdMonday ? targetSchemes.filter(s => s.max_streak_days >= 15) : []);
  logs.push(`📊 Found ${level4Schemes.length} schemes for Member Secretary (MS) Escalation (1st & 3rd Monday, streak >= 15 days; Today: ${is1stOr3rdMonday}).`);

  if (level4Schemes.length > 0) {
    const msEmail = execContacts.ms.email;
    const msMobile = execContacts.ms.mobile;

    // Send Scheme-wise Email to MS
    if (msEmail) {
      for (const scheme of level4Schemes) {
        const emailPayload = renderMsSchemeEscalationEmail(scheme);
        if (!dryRun) {
          try {
            await sendMail({
              to: msEmail,
              subject: emailPayload.subject,
              html: emailPayload.html,
            });
            result.ms_emails_sent++;
            try {
              const db = await getDB();
              await db.insert(emailAlertLogs).values({
                scheme_id: scheme.scheme_id,
                scheme_name: scheme.scheme_name,
                region: scheme.region,
                alert_type: 'Escalation Level 4 (MS)',
                alert_value: `${scheme.max_streak_days} Days Unresolved`,
                member_secretary_name: execContacts.ms.name,
                member_secretary_email: msEmail,
                civil_engineer_name: execContacts.ms.name,
                civil_engineer_email: msEmail,
                ticket_id: `ESC-MS-${scheme.scheme_id}-${Date.now()}`,
                dispatch_type: 'escalation_level4',
              });
            } catch (logErr) {
              console.error("Failed to insert MS email alert log:", logErr);
            }
            logs.push(`✅ [MS Email Sent] ${scheme.scheme_name} -> ${msEmail}`);
          } catch (err: any) {
            logs.push(`❌ [MS Email Failed] ${scheme.scheme_name} (${msEmail}): ${err.message}`);
          }
        } else {
          result.ms_emails_sent++;
          logs.push(`[Dry Run MS Email] Would send to ${msEmail} for scheme ${scheme.scheme_id}`);
        }
      }
    }

    // Send Scheme-wise SMS to MS
    if (msMobile && msMobile !== "Head Office") {
      for (const scheme of level4Schemes) {
        const smsText = renderSchemeEscalationSMS(scheme, 'MS');
        if (!dryRun) {
          try {
            const smsRes = await sendSmartpingDLTSMS({
              mobile: msMobile,
              text: smsText,
            });
            if (smsRes.success) result.ms_sms_sent++;
            await logSmsAlert({
              mobile: msMobile,
              engineer_name: execContacts.ms.name,
              engineer_email: msEmail,
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              template_id: 'MS_ESCALATION_10D',
              template_name: 'Level 4 Escalation Member Secretary (10 Days)',
              message_text: smsText,
              gateway_status: smsRes.status,
              gateway_response: smsRes.response,
              is_success: smsRes.success,
              dispatch_type: 'escalation_level4',
            });
            logs.push(`✅ [MS SMS Sent] ${scheme.scheme_name} -> ${msMobile}`);
          } catch (err: any) {
            logs.push(`❌ [MS SMS Failed] ${scheme.scheme_name} (${msMobile}): ${err.message}`);
          }
        } else {
          result.ms_sms_sent++;
          logs.push(`[Dry Run MS SMS] Would send to ${msMobile} for scheme ${scheme.scheme_id}`);
        }
      }
    }
  }

  // --- 4. Level 5 Escalations to Principal Secretary (PS) (1st & 3rd Monday for streak >= 15 days) ---
  const level5Schemes = options.schemeId
    ? targetSchemes.filter(s => s.max_streak_days >= 15)
    : (is1stOr3rdMonday ? targetSchemes.filter(s => s.max_streak_days >= 15) : []);
  logs.push(`📊 Found ${level5Schemes.length} schemes for Principal Secretary (PS) Escalation (1st & 3rd Monday, streak >= 15 days; Today: ${is1stOr3rdMonday}).`);

  if (level5Schemes.length > 0) {
    const psEmail = execContacts.ps.email;
    const psMobile = execContacts.ps.mobile;

    // Send Scheme-wise Email to PS
    if (psEmail) {
      for (const scheme of level5Schemes) {
        const emailPayload = renderPsSchemeEscalationEmail(scheme);
        if (!dryRun) {
          try {
            await sendMail({
              to: psEmail,
              subject: emailPayload.subject,
              html: emailPayload.html,
            });
            result.ps_emails_sent++;
            try {
              const db = await getDB();
              await db.insert(emailAlertLogs).values({
                scheme_id: scheme.scheme_id,
                scheme_name: scheme.scheme_name,
                region: scheme.region,
                alert_type: 'Escalation Level 5 (PS)',
                alert_value: `${scheme.max_streak_days} Days Unresolved`,
                principal_secretary_name: execContacts.ps.name,
                principal_secretary_email: psEmail,
                chief_engineer_name: execContacts.ps.name,
                chief_engineer_email: psEmail,
                ticket_id: `ESC-PS-${scheme.scheme_id}-${Date.now()}`,
                dispatch_type: 'escalation_level5',
              });
            } catch (logErr) {
              console.error("Failed to insert PS email alert log:", logErr);
            }
            logs.push(`✅ [PS Email Sent] ${scheme.scheme_name} -> ${psEmail}`);
          } catch (err: any) {
            logs.push(`❌ [PS Email Failed] ${scheme.scheme_name} (${psEmail}): ${err.message}`);
          }
        } else {
          result.ps_emails_sent++;
          logs.push(`[Dry Run PS Email] Would send to ${psEmail} for scheme ${scheme.scheme_id}`);
        }
      }
    }

    // Send Scheme-wise SMS to PS
    if (psMobile && psMobile !== "Secretariat") {
      for (const scheme of level5Schemes) {
        const smsText = renderSchemeEscalationSMS(scheme, 'PS');
        if (!dryRun) {
          try {
            const smsRes = await sendSmartpingDLTSMS({
              mobile: psMobile,
              text: smsText,
            });
            if (smsRes.success) result.ps_sms_sent++;
            await logSmsAlert({
              mobile: psMobile,
              engineer_name: execContacts.ps.name,
              engineer_email: psEmail,
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              template_id: 'PS_ESCALATION_15D',
              template_name: 'Level 5 Escalation Principal Secretary (15 Days)',
              message_text: smsText,
              gateway_status: smsRes.status,
              gateway_response: smsRes.response,
              is_success: smsRes.success,
              dispatch_type: 'escalation_level5',
            });
            logs.push(`✅ [PS SMS Sent] ${scheme.scheme_name} -> ${psMobile}`);
          } catch (err: any) {
            logs.push(`❌ [PS SMS Failed] ${scheme.scheme_name} (${psMobile}): ${err.message}`);
          }
        } else {
          result.ps_sms_sent++;
          logs.push(`[Dry Run PS SMS] Would send to ${psMobile} for scheme ${scheme.scheme_id}`);
        }
      }
    }
  }

  return result;
}

export interface SentAlertItem {
  id: number | string;
  channel: 'sms' | 'email';
  created_at: string;
  sent_date?: string;
  scheme_id: string;
  scheme_name: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_mobile?: string;
  recipient_role: string;
  tier: 1 | 2 | 3 | 4 | 5;
  alert_title: string;
  message_content: string;
  status: string;
  is_success?: boolean;
  gateway_status?: number;
  error_message?: string;
  dispatch_type?: string;
  is_lpcd?: boolean;
  is_chlorine?: boolean;
  is_pressure?: boolean;
  is_offline?: boolean;
  categories?: string[];
}

export interface SentAlertsResponse {
  timeRange: string;
  summary: {
    total_sent: number;
    sms_sent: number;
    email_sent: number;
    tier_1_sent: number;
    tier_2_sent: number;
    tier_3_sent: number;
    tier_4_sent: number;
    tier_5_sent: number;
    today_sent_count: number;
    last_dispatched_at: string | null;
    tier_breakdown?: {
      de_emails: number;
      ee_emails: number;
      se_emails: number;
      ce_emails: number;
      ms_emails: number;
      ps_emails: number;
      de_sms: number;
      ee_sms: number;
      se_sms: number;
      ce_sms: number;
      ms_sms: number;
      ps_sms: number;
    };
    category_breakdown?: {
      lpcd_emails: number;
      chlorine_emails: number;
      pressure_emails: number;
      offline_emails: number;
    };
  };
  alerts: SentAlertItem[];
}

export async function getSentEscalationAlerts(options: {
  timeRange?: 'today' | 'yesterday' | '7days' | '30days' | 'all';
  date?: string;
  tier?: 'all' | '1' | '2' | '3' | '4' | '5';
  channel?: 'all' | 'sms' | 'email';
  category?: 'all' | 'lpcd' | 'chlorine' | 'pressure' | 'offline';
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<SentAlertsResponse> {
  const db = await getDB();
  const timeRange = options.timeRange || 'today';
  const limit = Math.min(Math.max(options.limit || 50, 1), 5000);
  const offset = Math.max(options.offset || 0, 0);

  let dateFilter = '';
  if (options.date && options.date.trim()) {
    const d = options.date.trim().replace(/'/g, "''");
    dateFilter = `sent_date = '${d}'::date`;
  } else if (timeRange === 'today') {
    dateFilter = "((created_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)";
  } else if (timeRange === 'yesterday') {
    dateFilter = "((created_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - 1 OR sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - 1)";
  } else if (timeRange === '7days') {
    dateFilter = "(sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days' OR created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days')";
  } else if (timeRange === '30days') {
    dateFilter = "(sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days' OR created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days')";
  }

  const whereClauses: string[] = [];
  if (dateFilter) whereClauses.push(dateFilter);
  if (options.channel && options.channel !== 'all') {
    whereClauses.push(`channel = '${options.channel.toLowerCase()}'`);
  }
  if (options.tier && options.tier !== 'all') {
    if (options.tier === 'vendor' || options.tier === '0') {
      whereClauses.push(`(tier = 0 OR recipient_role ILIKE '%Vendor%')`);
    } else {
      whereClauses.push(`tier = ${parseInt(options.tier, 10)}`);
    }
  }
  if (options.category && options.category !== 'all') {
    if (options.category === 'lpcd') whereClauses.push(`is_lpcd = true`);
    else if (options.category === 'chlorine') whereClauses.push(`is_chlorine = true`);
    else if (options.category === 'pressure') whereClauses.push(`is_pressure = true`);
    else if (options.category === 'offline') whereClauses.push(`is_offline = true`);
  }
  if (options.search && options.search.trim()) {
    const s = options.search.trim().replace(/'/g, "''");
    whereClauses.push(`(scheme_name ILIKE '%${s}%' OR scheme_id ILIKE '%${s}%' OR recipient_name ILIKE '%${s}%' OR alert_title ILIKE '%${s}%' OR recipient_email ILIKE '%${s}%')`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const baseCte = `
    WITH combined_alerts AS (
      -- 1. Actual SMS Alerts Logged
      SELECT 
        s.id::text,
        'sms' AS channel,
        s.created_at,
        s.sent_date::date AS sent_date,
        s.scheme_id,
        s.scheme_name,
        COALESCE(s.engineer_name, 'Engineer') AS recipient_name,
        s.engineer_email AS recipient_email,
        s.mobile AS recipient_mobile,
        CASE 
          WHEN s.engineer_name ILIKE '%Principal Secretary%' OR s.dispatch_type = 'escalation_level5' THEN 'Principal Secretary (PS)'
          WHEN s.engineer_name ILIKE '%Member Secretary%' OR s.dispatch_type = 'escalation_level4' THEN 'Member Secretary (MS)'
          WHEN (sed.chief_engineer_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.chief_engineer_name)))
            OR s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 'Chief Engineer (CE)'
          WHEN (sed.se_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.se_name)))
            OR s.engineer_name ILIKE '%Rishikesh Salunkhe%' OR s.engineer_name ILIKE '%Superintending Engineer%' OR s.engineer_name ILIKE '% SE%' THEN 'Superintending Engineer (SE)'
          WHEN (sed.ee_civil_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.ee_civil_name)))
            OR s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' OR s.engineer_name ILIKE '%EE Civil%' THEN 'Executive Engineer (EE Civil)'
          WHEN (sed.ee_mech_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.ee_mech_name)))
            OR s.engineer_name ILIKE '%Rushikesh Salunke%' OR s.engineer_name ILIKE '%EE Mech%' THEN 'Executive Engineer (EE Mech)'
          WHEN (sed.de_ae_civil_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.de_ae_civil_name)))
            OR s.engineer_name ILIKE '%Akshay Bhojane%' OR s.engineer_name ILIKE '%DE Civil%' OR s.engineer_name ILIKE '%AE Civil%' OR s.engineer_name ILIKE '%Nagrale%' THEN 'Deputy Engineer (DE Civil)'
          WHEN (sed.de_ae_mech_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.de_ae_mech_name)))
            OR s.engineer_name ILIKE '%Rushikesh Salunkhe%' OR s.engineer_name ILIKE '%DE Mech%' OR s.engineer_name ILIKE '%AE Mech%' THEN 'Deputy Engineer (DE Mech)'
          WHEN s.engineer_name ILIKE '%EE%' OR s.engineer_name ILIKE '%Executive%' THEN 'Executive Engineer (EE Civil)'
          WHEN s.engineer_name ILIKE '%DE%' OR s.engineer_name ILIKE '%AE%' OR s.engineer_name ILIKE '%Deputy%' OR s.engineer_name ILIKE '%Assistant%' THEN 'Deputy Engineer (DE Civil)'
          ELSE 'Deputy Engineer (DE Civil)'
        END AS recipient_role,
        CASE 
          WHEN s.engineer_name ILIKE '%Principal Secretary%' OR s.dispatch_type = 'escalation_level5' THEN 5
          WHEN s.engineer_name ILIKE '%Member Secretary%' OR s.dispatch_type = 'escalation_level4' THEN 4
          WHEN (sed.chief_engineer_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.chief_engineer_name)))
            OR s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
          WHEN (sed.se_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.se_name)))
            OR s.engineer_name ILIKE '%Rishikesh Salunkhe%' OR s.engineer_name ILIKE '%Superintending Engineer%' OR s.engineer_name ILIKE '% SE%' THEN 3
          WHEN (sed.ee_civil_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.ee_civil_name)))
            OR (sed.ee_mech_name IS NOT NULL AND LOWER(TRIM(s.engineer_name)) = LOWER(TRIM(sed.ee_mech_name)))
            OR s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' OR s.engineer_name ILIKE '%Rushikesh Salunke%' THEN 2
          ELSE 1
        END AS tier,
        s.template_name AS alert_title,
        s.message_text AS message_content,
        CASE 
          WHEN s.is_success = false 
            OR s.gateway_status >= 400 
            OR s.delivery_status ILIKE '%FAIL%' THEN 'FAILED'
          WHEN s.delivery_status = 'DELIVERED' 
            OR s.delivery_status = 'SUBMIT_ACCEPTED' 
            OR (s.is_success = true AND (s.gateway_status = 200 OR s.gateway_status IS NULL)) THEN 'DELIVERED'
          ELSE COALESCE(s.delivery_status, 'PENDING')
        END AS status,
        s.is_success,
        s.gateway_status,
        COALESCE(s.delivery_description, s.gateway_response) AS error_message,
        s.dispatch_type,
        (s.template_name ILIKE '%lpcd%') AS is_lpcd,
        (s.template_name ILIKE '%chlorine%' AND s.template_name NOT ILIKE '%offline%') AS is_chlorine,
        (s.template_name ILIKE '%pressure%' AND s.template_name NOT ILIKE '%offline%') AS is_pressure,
        (s.template_name ILIKE '%offline%') AS is_offline,
        ARRAY[
          CASE 
            WHEN s.template_name ILIKE '%offline%' THEN 'offline'
            WHEN s.template_name ILIKE '%lpcd%' THEN 'lpcd'
            WHEN s.template_name ILIKE '%chlorine%' THEN 'chlorine'
            WHEN s.template_name ILIKE '%pressure%' THEN 'pressure'
            ELSE 'offline'
          END
        ] AS categories
      FROM sms_alert_logs s
      LEFT JOIN scheme_engineer_details sed ON (
        (s.scheme_id IS NOT NULL AND s.scheme_id != '' AND s.scheme_id = sed.scheme_id)
        OR (s.scheme_name IS NOT NULL AND s.scheme_name != '' AND s.scheme_name ILIKE sed.scheme)
      )

      UNION ALL

      -- 2. Actual Daily Emails Dispatched to Officers from consolidated_email_dispatches
      SELECT 
        (ced.id::text || '-' || COALESCE(sid.scheme_id, '0')) AS id,
        'email' AS channel,
        ced.created_at,
        ced.dispatch_date::date AS sent_date,
        COALESCE(sid.scheme_id, ced.scheme_ids->>0, 'MJP-SCHEME') AS scheme_id,
        CASE 
          WHEN jsonb_array_length(ced.scheme_names) = 1 THEN ced.scheme_names->>0
          WHEN jsonb_array_length(ced.scheme_names) > 1 THEN (ced.scheme_names->>0) || ' (+' || (jsonb_array_length(ced.scheme_names) - 1) || ' more)'
          ELSE 'Maharashtra Jeevan Pradhikaran'
        END AS scheme_name,
        ced.engineer_name AS recipient_name,
        LOWER(TRIM(ced.engineer_email)) AS recipient_email,
        ced.engineer_mobile AS recipient_mobile,
        ced.engineer_role AS recipient_role,
        CASE 
          WHEN ced.engineer_role ILIKE '%Principal%' THEN 5
          WHEN ced.engineer_role ILIKE '%Member%' THEN 4
          WHEN ced.engineer_role ILIKE '%Chief%' OR ced.engineer_role ILIKE '%Superintending%' OR ced.engineer_role ILIKE '%SE%' THEN 3
          WHEN ced.engineer_role ILIKE '%Executive%' OR ced.engineer_role ILIKE '%EE%' THEN 2
          WHEN ced.engineer_role ILIKE '%Vendor%' THEN 0
          ELSE 1
        END AS tier,
        CONCAT('Daily Alert Digest (', ced.total_alerts, ' Issues)') AS alert_title,
        CONCAT('Consolidated alert digest containing ', ced.total_alerts, ' unresolved telemetry alerts.') AS message_content,
        'DELIVERED' AS status,
        (ced.status = 'SENT') AS is_success,
        200 AS gateway_status,
        ced.error_message AS error_message,
        'daily' AS dispatch_type,
        (ced.lpcd_alerts_count > 0) AS is_lpcd,
        (ced.chlorine_alerts_count > 0) AS is_chlorine,
        (ced.pressure_alerts_count > 0) AS is_pressure,
        (ced.offline_alerts_count > 0) AS is_offline,
        ARRAY(
          SELECT x FROM unnest(ARRAY[
            CASE WHEN ced.lpcd_alerts_count > 0 THEN 'lpcd' END,
            CASE WHEN ced.chlorine_alerts_count > 0 THEN 'chlorine' END,
            CASE WHEN ced.pressure_alerts_count > 0 THEN 'pressure' END,
            CASE WHEN ced.offline_alerts_count > 0 THEN 'offline' END
          ]) AS x WHERE x IS NOT NULL
        ) AS categories
      FROM consolidated_email_dispatches ced
      LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(ced.scheme_ids, '[]'::jsonb)) AS sid(scheme_id) ON true

      UNION ALL

      -- 2b. Fallback for older historical dates from email_acknowledgements
      SELECT 
        sub.id,
        'email' AS channel,
        sub.created_at,
        sub.sent_date,
        sub.scheme_id,
        sub.scheme_name,
        sub.recipient_name,
        sub.recipient_email,
        NULL AS recipient_mobile,
        sub.role_name AS recipient_role,
        sub.role_tier AS tier,
        CONCAT('Daily Alert Digest (', sub.issue_count, ' Issues • ', sub.alert_types, ')') AS alert_title,
        CONCAT('Consolidated alert digest containing ', sub.issue_count, ' unresolved telemetry alerts across ', sub.alert_types, '.') AS message_content,
        'DELIVERED' AS status,
        true AS is_success,
        200 AS gateway_status,
        NULL::text AS error_message,
        'daily' AS dispatch_type,
        sub.is_lpcd,
        sub.is_chlorine,
        sub.is_pressure,
        sub.is_offline,
        sub.categories
      FROM (
        SELECT 
          MIN(ea.id)::text AS id,
          MIN(ea.created_at) AS created_at,
          ea.sent_date::date AS sent_date,
          COALESCE(ea.scheme_id, 'MJP-SCHEME') AS scheme_id,
          COALESCE(MAX(s.scheme), MAX(ea.scheme_id), 'Maharashtra Jeevan Pradhikaran') AS scheme_name,
          MAX(ea.engineer_name) AS recipient_name,
          LOWER(TRIM(ea.engineer_email)) AS recipient_email,
          CASE 
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.principal_secretary_email), ''))) THEN 5
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.member_secretary_email), ''))) THEN 4
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.chief_engineer_email), '')))
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.chief_engineer_name), ''))) THEN 3
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.se_email), ''))) 
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.se_name), ''))) THEN 3
            WHEN (LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_email), ''))) OR LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.ee_mech_email), ''))))
                 OR (LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_name), ''))) OR LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%executive%' OR LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%ee%') THEN 2
            ELSE 1
          END AS role_tier,
          CASE 
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.principal_secretary_email), ''))) THEN 'Principal Secretary (PS)'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.member_secretary_email), ''))) THEN 'Member Secretary (MS)'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.chief_engineer_email), '')))
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.chief_engineer_name), ''))) THEN 'Chief Engineer (CE)'
            WHEN LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.se_email), ''))) 
                 AND LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.se_name), ''))) THEN 'Superintending Engineer (SE)'
            WHEN (LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_email), ''))) OR LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(MAX(s.ee_mech_email), ''))))
                 OR (LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_name), ''))) OR LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%executive%' OR LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%ee%') THEN 'Executive Engineer (EE)'
            ELSE 'Deputy Engineer (DE Civil)'
          END AS role_name,
          COUNT(*) AS issue_count,
          string_agg(DISTINCT ea.alert_type, ', ') AS alert_types,
          bool_or(ea.alert_type ILIKE '%lpcd%') AS is_lpcd,
          bool_or(ea.alert_type ILIKE '%chlorine%') AS is_chlorine,
          bool_or(ea.alert_type ILIKE '%pressure%') AS is_pressure,
          bool_or(ea.alert_type ILIKE '%offline%') AS is_offline,
          array_agg(DISTINCT 
            CASE 
              WHEN ea.alert_type ILIKE '%lpcd%' THEN 'lpcd'
              WHEN ea.alert_type ILIKE '%chlorine%' THEN 'chlorine'
              WHEN ea.alert_type ILIKE '%pressure%' THEN 'pressure'
              ELSE 'offline'
            END
          ) AS categories
        FROM email_acknowledgements ea
        LEFT JOIN scheme_engineer_details s ON s.scheme_id = ea.scheme_id
        WHERE ea.sent_date::date NOT IN (SELECT DISTINCT dispatch_date FROM consolidated_email_dispatches)
        GROUP BY ea.sent_date::date, LOWER(TRIM(ea.engineer_email)), ea.scheme_id
      ) sub

      UNION ALL

      -- 3. Escalation Tier Specific Emails from email_alert_logs
      SELECT 
        e.id::text,
        'email' AS channel,
        e.created_at,
        e.sent_date::date AS sent_date,
        e.scheme_id,
        e.scheme_name,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN COALESCE(e.principal_secretary_name, 'Principal Secretary (PS)')
          WHEN e.dispatch_type = 'escalation_level4' THEN COALESCE(e.member_secretary_name, 'Member Secretary (MS)')
          WHEN e.dispatch_type = 'escalation_level3' THEN COALESCE(e.chief_engineer_name, e.se_name, 'Chief Engineer')
          WHEN e.dispatch_type = 'escalation_level2' THEN COALESCE(e.ee_civil_name, 'Executive Engineer (Civil)')
          ELSE COALESCE(e.civil_engineer_name, 'Deputy Engineer')
        END AS recipient_name,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN COALESCE(e.principal_secretary_email, 'ps.wss@maharashtra.gov.in')
          WHEN e.dispatch_type = 'escalation_level4' THEN COALESCE(e.member_secretary_email, 'ms.mjp@gov.in')
          WHEN e.dispatch_type = 'escalation_level3' THEN COALESCE(e.chief_engineer_email, e.se_email, 'ce.mjp@gov.in')
          WHEN e.dispatch_type = 'escalation_level2' THEN COALESCE(e.ee_civil_email, 'ee.mjp@gov.in')
          ELSE COALESCE(e.civil_engineer_email, 'de.mjp@gov.in')
        END AS recipient_email,
        NULL AS recipient_mobile,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN 'Principal Secretary (PS)'
          WHEN e.dispatch_type = 'escalation_level4' THEN 'Member Secretary (MS)'
          WHEN e.dispatch_type = 'escalation_level3' THEN 'Chief Engineer (CE)'
          WHEN e.dispatch_type = 'escalation_level2' THEN 'Executive Engineer (EE Civil)'
          ELSE 'Deputy Engineer (DE Civil)'
        END AS recipient_role,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN 5
          WHEN e.dispatch_type = 'escalation_level4' THEN 4
          WHEN e.dispatch_type = 'escalation_level3' THEN 3
          WHEN e.dispatch_type = 'escalation_level2' THEN 2
          ELSE 1
        END AS tier,
        e.alert_type AS alert_title,
        e.alert_value AS message_content,
        'DELIVERED' AS status,
        true AS is_success,
        200 AS gateway_status,
        NULL::text AS error_message,
        e.dispatch_type,
        (e.alert_type ILIKE '%lpcd%') AS is_lpcd,
        (e.alert_type ILIKE '%chlorine%') AS is_chlorine,
        (e.alert_type ILIKE '%pressure%') AS is_pressure,
        (e.alert_type ILIKE '%offline%') AS is_offline,
        ARRAY[
          CASE 
            WHEN e.alert_type ILIKE '%lpcd%' THEN 'lpcd'
            WHEN e.alert_type ILIKE '%chlorine%' THEN 'chlorine'
            WHEN e.alert_type ILIKE '%pressure%' THEN 'pressure'
            ELSE 'offline'
          END
        ] AS categories
      FROM email_alert_logs e
      WHERE e.dispatch_type LIKE 'escalation_%'
    )
  `;

  const summaryQuery = `
    ${baseCte}
    SELECT 
      COUNT(*) FILTER (WHERE channel = 'email' OR status = 'DELIVERED') AS total_sent,
      COUNT(*) FILTER (WHERE channel = 'sms' AND status = 'DELIVERED') AS sms_sent,
      COUNT(*) FILTER (WHERE channel = 'email') AS email_sent,
      COUNT(*) FILTER (WHERE tier = 1 AND (channel = 'email' OR status = 'DELIVERED')) AS tier_1_sent,
      COUNT(*) FILTER (WHERE tier = 2 AND (channel = 'email' OR status = 'DELIVERED')) AS tier_2_sent,
      COUNT(*) FILTER (WHERE tier = 3 AND (channel = 'email' OR status = 'DELIVERED')) AS tier_3_sent,
      COUNT(*) FILTER (WHERE tier = 4 AND (channel = 'email' OR status = 'DELIVERED')) AS tier_4_sent,
      COUNT(*) FILTER (WHERE tier = 5 AND (channel = 'email' OR status = 'DELIVERED')) AS tier_5_sent,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 0) AS vendor_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 1) AS de_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 2) AS ee_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 3 AND recipient_role ILIKE '%Superintending%') AS se_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 3 AND recipient_role ILIKE '%Chief Engineer%') AS ce_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 4) AS ms_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 5) AS ps_emails,
      COUNT(*) FILTER (WHERE channel = 'sms' AND tier = 1 AND status = 'DELIVERED') AS de_sms,
      COUNT(*) FILTER (WHERE channel = 'sms' AND tier = 2 AND status = 'DELIVERED') AS ee_sms,
      COUNT(*) FILTER (WHERE channel = 'sms' AND tier = 3 AND recipient_role ILIKE '%Superintending%' AND status = 'DELIVERED') AS se_sms,
      COUNT(*) FILTER (WHERE channel = 'sms' AND tier = 3 AND recipient_role ILIKE '%Chief Engineer%' AND status = 'DELIVERED') AS ce_sms,
      COUNT(*) FILTER (WHERE channel = 'sms' AND tier = 4 AND status = 'DELIVERED') AS ms_sms,
      COUNT(*) FILTER (WHERE channel = 'sms' AND tier = 5 AND status = 'DELIVERED') AS ps_sms,
      COUNT(*) FILTER (WHERE channel = 'email' AND is_lpcd = true) AS lpcd_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND is_chlorine = true) AS chlorine_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND is_pressure = true) AS pressure_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND is_offline = true) AS offline_emails,
      (SELECT COUNT(*) FROM combined_alerts WHERE (channel = 'email' OR status = 'DELIVERED') AND (sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)) AS today_sent_count,
      MAX(created_at) AS last_dispatched_at
    FROM combined_alerts
    ${whereSql};
  `;

  const rowsQuery = `
    ${baseCte}
    SELECT * FROM combined_alerts
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  const [summaryRes, rowsRes] = await Promise.all([
    db.execute(sql.raw(summaryQuery)),
    db.execute(sql.raw(rowsQuery)),
  ]);

  const rawSummary = summaryRes.rows?.[0] || {};

  return {
    timeRange,
    summary: {
      total_sent: Number(rawSummary.total_sent || 0),
      sms_sent: Number(rawSummary.sms_sent || 0),
      email_sent: Number(rawSummary.email_sent || 0),
      tier_1_sent: Number(rawSummary.tier_1_sent || 0),
      tier_2_sent: Number(rawSummary.tier_2_sent || 0),
      tier_3_sent: Number(rawSummary.tier_3_sent || 0),
      tier_4_sent: Number(rawSummary.tier_4_sent || 0),
      tier_5_sent: Number(rawSummary.tier_5_sent || 0),
      today_sent_count: Number(rawSummary.today_sent_count || 0),
      last_dispatched_at: rawSummary.last_dispatched_at || null,
      tier_breakdown: {
        vendor_emails: Number(rawSummary.vendor_emails || 0),
        de_emails: Number(rawSummary.de_emails || 0),
        ee_emails: Number(rawSummary.ee_emails || 0),
        se_emails: Number(rawSummary.se_emails || 0),
        ce_emails: Number(rawSummary.ce_emails || 0),
        ms_emails: Number(rawSummary.ms_emails || 0),
        ps_emails: Number(rawSummary.ps_emails || 0),
        de_sms: Number(rawSummary.de_sms || 0),
        ee_sms: Number(rawSummary.ee_sms || 0),
        se_sms: Number(rawSummary.se_sms || 0),
        ce_sms: Number(rawSummary.ce_sms || 0),
        ms_sms: Number(rawSummary.ms_sms || 0),
        ps_sms: Number(rawSummary.ps_sms || 0),
      },
      category_breakdown: {
        lpcd_emails: Number(rawSummary.lpcd_emails || 0),
        chlorine_emails: Number(rawSummary.chlorine_emails || 0),
        pressure_emails: Number(rawSummary.pressure_emails || 0),
        offline_emails: Number(rawSummary.offline_emails || 0),
      },
    },
    alerts: (rowsRes.rows || []).map((r: any) => ({
      id: isNaN(Number(r.id)) ? String(r.id) : Number(r.id),
      channel: r.channel,
      created_at: r.created_at,
      sent_date: r.sent_date ? (r.sent_date instanceof Date ? r.sent_date.toISOString().split('T')[0] : String(r.sent_date).split('T')[0]) : undefined,
      scheme_id: String(r.scheme_id),
      scheme_name: String(r.scheme_name),
      recipient_name: String(r.recipient_name),
      recipient_email: r.recipient_email || undefined,
      recipient_mobile: r.recipient_mobile || undefined,
      recipient_role: String(r.recipient_role),
      tier: Number(r.tier) as 1 | 2 | 3 | 4 | 5,
      alert_title: String(r.alert_title),
      message_content: String(r.message_content),
      status: String(r.status),
      is_success: r.is_success !== undefined && r.is_success !== null ? Boolean(r.is_success) : undefined,
      gateway_status: r.gateway_status !== undefined && r.gateway_status !== null ? Number(r.gateway_status) : undefined,
      error_message: r.error_message || undefined,
      dispatch_type: r.dispatch_type || undefined,
      is_lpcd: Boolean(r.is_lpcd),
      is_chlorine: Boolean(r.is_chlorine),
      is_pressure: Boolean(r.is_pressure),
      is_offline: Boolean(r.is_offline),
      categories: Array.isArray(r.categories) ? r.categories : [],
    })),
  };
}
