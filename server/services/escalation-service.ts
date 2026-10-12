import { getDB } from "../db";
import { sql } from "drizzle-orm";
import { schemeEngineerDetails } from "../../shared/schema";
import { sendSmartpingDLTSMS, normalizeIndianMobile, logSmsAlert } from "./sms-service";
import { sendMail } from "./email-service";

export interface SchemeEscalationItem {
  scheme_id: string;
  scheme_name: string;
  region: string;
  division?: string;
  district?: string;
  // Highest active escalation level
  escalation_level: 1 | 2 | 3;
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
  // Dispatch / Status Tracking
  ee_escalated: boolean;
  ce_escalated: boolean;
  last_escalated_at?: string;
  // Actual Notified Counts
  de_sms_count: number;
  ee_sms_count: number;
  ce_se_sms_count: number;
  total_email_count: number;
  last_notified_at?: string;
}

export interface EscalationSummary {
  total_schemes_in_escalation: number;
  level_1_count: number; // 1-2 days (DE/AE Civil)
  level_2_count: number; // 3-6 days (EE Civil Escalated)
  level_3_count: number; // 7+ days (CE Apex Escalated)
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
    schemes: string[];
  }>;
}

/**
 * Computes the real-time escalation status across all schemes.
 * - Level 1: Issue active for 1 to 2 days (DE/AE Civil)
 * - Level 2: Issue persists for 3 to 6 consecutive days (EE Civil Escalation)
 * - Level 3: Issue persists for 7+ consecutive days (CE Apex Regional Escalation)
 */
export async function getEscalationStatus(options: {
  daysLookback?: number;
  region?: string;
} = {}): Promise<{
  summary: EscalationSummary;
  schemes: SchemeEscalationItem[];
}> {
  const db = await getDB();
  const daysLookback = options.daysLookback || 14;

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

  // 2. Query persistent alert records from email_alert_logs
  const alertsQuery = sql`
    SELECT 
      scheme_id,
      scheme_name,
      region,
      COALESCE(NULLIF(TRIM(village_name), ''), '-') as village_name,
      COALESCE(NULLIF(TRIM(esr_name), ''), '-') as esr_name,
      alert_type,
      COUNT(DISTINCT sent_date) as active_days_count,
      ARRAY_AGG(DISTINCT sent_date::text ORDER BY sent_date::text DESC) as dates_seen,
      MAX(alert_value) as latest_val
    FROM email_alert_logs
    WHERE sent_date >= CURRENT_DATE - (${daysLookback} * INTERVAL '1 day')
      AND scheme_id IS NOT NULL
      ${options.region && options.region !== 'All' ? sql`AND (TRIM(REPLACE(region, chr(65279), '')) = ${options.region} OR region = ${options.region})` : sql``}
    GROUP BY scheme_id, scheme_name, region, village_name, esr_name, alert_type
    HAVING COUNT(DISTINCT sent_date) >= 1
    ORDER BY scheme_id, active_days_count DESC
  `;

  const rawRes = await db.execute(alertsQuery);
  const alertRows: any[] = rawRes.rows || [];

  // 3. Group by scheme
  const schemeAgg = new Map<string, SchemeEscalationItem>();

  for (const row of alertRows) {
    const schemeId = String(row.scheme_id || '').trim();
    if (!schemeId) continue;

    const schemeName = String(row.scheme_name || schemeId).trim();
    const region = String(row.region || 'Maharashtra').replace(/^\uFEFF/, '').trim();
    const alertType = String(row.alert_type || '').toLowerCase();
    const days = Number(row.active_days_count) || 1;
    const village = String(row.village_name || '-');
    const esr = String(row.esr_name || '-');
    const val = String(row.latest_val || '');

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
        ee_escalated: false,
        ce_escalated: false,
        de_sms_count: 0,
        ee_sms_count: 0,
        ce_se_sms_count: 0,
        total_email_count: 0,
      });
    }

    const item = schemeAgg.get(schemeId)!;
    item.total_issues_count++;
    if (days > item.max_streak_days) {
      item.max_streak_days = days;
    }

    if (alertType.includes('lpcd')) {
      item.lpcd_villages_count++;
      item.lpcd_villages.push({ village_name: village, days_count: days, avg_val: val });
    } else if (alertType.includes('high chlorine') || alertType.includes('chlorine high')) {
      item.chlorine_high_count++;
      item.chlorine_high_esrs.push({ village_name: village, esr_name: esr, days_count: days, val });
    } else if (alertType.includes('chlorine') || alertType.includes('low chlorine')) {
      item.chlorine_low_count++;
      item.chlorine_low_esrs.push({ village_name: village, esr_name: esr, days_count: days, val });
    } else if (alertType.includes('pressure')) {
      item.pressure_low_count++;
      item.pressure_low_esrs.push({ village_name: village, esr_name: esr, days_count: days, val });
    } else if (alertType.includes('offline')) {
      item.offline_count++;
      item.offline_esrs.push({ village_name: village, esr_name: esr, days_count: days, sensors: val });
    }
  }

  // 3b. Fetch actual notified message counts from sms_alert_logs and email_alert_logs
  try {
    const [smsRes, emailRes] = await Promise.all([
      db.execute(sql`
        SELECT 
          scheme_id,
          COUNT(*) FILTER (WHERE engineer_name ILIKE '%Akshay Bhojane%') as de_sms_count,
          COUNT(*) FILTER (WHERE engineer_name ILIKE '%Rishikesh Salunke%') as ee_sms_count,
          COUNT(*) FILTER (WHERE engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Rishikesh Salunkhe%') as ce_se_sms_count,
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

  // 4. Calculate active escalation levels and flags
  const schemesList = Array.from(schemeAgg.values()).map(s => {
    if (s.max_streak_days >= 7) {
      s.escalation_level = 3;
      s.ee_escalated = true;
      s.ce_escalated = true;
    } else if (s.max_streak_days >= 3) {
      s.escalation_level = 2;
      s.ee_escalated = true;
      s.ce_escalated = false;
    } else {
      s.escalation_level = 1;
      s.ee_escalated = false;
      s.ce_escalated = false;
    }
    return s;
  });

  // Sort: Level 3 first, then Level 2, then Level 1, then by streak desc
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
    total_villages_below_55: schemesList.reduce((acc, s) => acc + s.lpcd_villages_count, 0),
    total_esrs_low_chlorine: schemesList.reduce((acc, s) => acc + s.chlorine_low_count, 0),
    total_esrs_high_chlorine: schemesList.reduce((acc, s) => acc + s.chlorine_high_count, 0),
    total_esrs_low_pressure: schemesList.reduce((acc, s) => acc + s.pressure_low_count, 0),
    total_offline_sensors: schemesList.reduce((acc, s) => acc + s.offline_count, 0),
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
        schemes: [],
      };
    }
    const r = summary.regional_breakdown[reg];
    r.total++;
    if (s.escalation_level === 1) r.level_1++;
    else if (s.escalation_level === 2) r.level_2++;
    else if (s.escalation_level === 3) r.level_3++;
    r.schemes.push(s.scheme_id);
  });

  return { summary, schemes: schemesList };
}

/**
 * Builds the scheme-wise SMS text for Deputy Engineer (DE), Executive Engineer (EE Civil), or Chief Engineer (CE)
 */
export function renderSchemeEscalationSMS(scheme: SchemeEscalationItem, recipientRole: 'DE' | 'EE' | 'CE'): string {
  const levelText = recipientRole === 'CE'
    ? 'स्तर ३ (CE Apex Escalation)'
    : recipientRole === 'EE'
      ? 'स्तर २ (EE Civil Escalation)'
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

  // Crisp Marathi format compliant with telecom guidelines
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
  const subject = `🚨 [Level 3 Apex Escalation] Chronic Non-Compliance Digest: ${region} Region (${schemes.length} Schemes Over 7+ Days)`;

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
          <h1>🚨 Chief Engineer — Level 3 Apex Escalation Digest</h1>
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
          Apex Escalation Matrix Monitoring System
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Dispatches Escalations:
 * - Level 2 (EE Civil): Scheme-wise Email & Scheme-wise SMS
 * - Level 3 (Chief Engineer): ONE consolidated Regional Email + Scheme-wise SMS
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
  logs: string[];
}> {
  const { schemes } = await getEscalationStatus({ region: options.region });
  const logs: string[] = [];
  const result = {
    success: true,
    ee_emails_sent: 0,
    ee_sms_sent: 0,
    ce_emails_sent: 0,
    ce_sms_sent: 0,
    logs,
  };

  const dryRun = options.dryRun !== false; // Default to dry-run unless explicitly false

  // Filter if single scheme requested
  const targetSchemes = options.schemeId
    ? schemes.filter(s => s.scheme_id === options.schemeId)
    : schemes;

  logs.push(`🔍 Evaluating ${targetSchemes.length} schemes for escalation dispatch (Mode: ${dryRun ? 'PREVIEW / DRY RUN' : 'LIVE DISPATCH'})...`);

  // --- 1. Level 2 Escalations to EE (Civil) ---
  const level2Schemes = targetSchemes.filter(s => s.escalation_level >= 2);
  logs.push(`📊 Found ${level2Schemes.length} schemes at Level 2 or higher (>= 3 days persistence).`);

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
            dltContentId: '1077196480123998489', // Use general DLT or registered escalation template
          });
          if (smsRes.success) result.ee_sms_sent++;
          await logSmsAlert({
            mobile: eeMobile,
            engineer_name: scheme.ee_civil_name,
            engineer_email: eeEmail,
            scheme_id: scheme.scheme_id,
            scheme_name: scheme.scheme_name,
            template_id: 'LEVEL_2_ESCALATION_EE',
            template_name: 'Level 2 Escalation EE Civil',
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

  // --- 2. Level 3 Escalations to Chief Engineer (CE) ---
  const level3Schemes = targetSchemes.filter(s => s.escalation_level === 3);
  logs.push(`📊 Found ${level3Schemes.length} schemes at Level 3 (>= 7 days chronic persistence).`);

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
              dltContentId: '1077196480123998489',
            });
            if (smsRes.success) result.ce_sms_sent++;
            await logSmsAlert({
              mobile: ceMobile,
              engineer_name: scheme.chief_engineer_name,
              engineer_email: ceEmail,
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              template_id: 'LEVEL_3_ESCALATION_CE',
              template_name: 'Level 3 Escalation CE',
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

  return result;
}

export interface SentAlertItem {
  id: number;
  channel: 'sms' | 'email';
  created_at: string;
  scheme_id: string;
  scheme_name: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_mobile?: string;
  recipient_role: string;
  tier: 1 | 2 | 3;
  alert_title: string;
  message_content: string;
  status: string;
  dispatch_type?: string;
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
    today_sent_count: number;
    last_dispatched_at: string | null;
  };
  alerts: SentAlertItem[];
}

export async function getSentEscalationAlerts(options: {
  timeRange?: 'today' | 'yesterday' | '7days' | '30days' | 'all';
  tier?: 'all' | '1' | '2' | '3';
  channel?: 'all' | 'sms' | 'email';
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<SentAlertsResponse> {
  const db = await getDB();
  const timeRange = options.timeRange || 'today';
  const limit = Math.min(Math.max(options.limit || 50, 1), 500);
  const offset = Math.max(options.offset || 0, 0);

  let dateFilter = '';
  if (timeRange === 'today') {
    dateFilter = "created_at >= CURRENT_DATE";
  } else if (timeRange === 'yesterday') {
    dateFilter = "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE";
  } else if (timeRange === '7days') {
    dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
  } else if (timeRange === '30days') {
    dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
  }

  const whereClauses: string[] = [];
  if (dateFilter) whereClauses.push(dateFilter);
  if (options.channel && options.channel !== 'all') {
    whereClauses.push(`channel = '${options.channel.toLowerCase()}'`);
  }
  if (options.tier && options.tier !== 'all') {
    whereClauses.push(`tier = ${parseInt(options.tier, 10)}`);
  }
  if (options.search && options.search.trim()) {
    const s = options.search.trim().replace(/'/g, "''");
    whereClauses.push(`(scheme_name ILIKE '%${s}%' OR scheme_id ILIKE '%${s}%' OR recipient_name ILIKE '%${s}%' OR alert_title ILIKE '%${s}%')`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const baseCte = `
    WITH combined_alerts AS (
      SELECT 
        s.id,
        'sms' AS channel,
        s.created_at,
        s.scheme_id,
        s.scheme_name,
        COALESCE(s.engineer_name, 'Engineer') AS recipient_name,
        s.engineer_email AS recipient_email,
        s.mobile AS recipient_mobile,
        CASE 
          WHEN s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 'Chief Engineer'
          WHEN s.engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 'Superintending Engineer'
          WHEN s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' THEN 'Executive Engineer (Civil)'
          WHEN s.engineer_name ILIKE '%Akshay Bhojane%' THEN 'Deputy Engineer (Civil)'
          ELSE 'Field Engineer'
        END AS recipient_role,
        CASE 
          WHEN s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
          WHEN s.engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 3
          WHEN s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' THEN 2
          WHEN s.engineer_name ILIKE '%Akshay Bhojane%' THEN 1
          ELSE 1
        END AS tier,
        s.template_name AS alert_title,
        s.message_text AS message_content,
        COALESCE(s.delivery_status, CASE WHEN s.is_success THEN 'DELIVERED' ELSE 'FAILED' END) AS status,
        s.dispatch_type
      FROM sms_alert_logs s

      UNION ALL

      SELECT 
        e.id,
        'email' AS channel,
        e.created_at,
        e.scheme_id,
        e.scheme_name,
        COALESCE(e.civil_engineer_name, e.ee_civil_name, e.chief_engineer_name, 'Engineer') AS recipient_name,
        COALESCE(e.civil_engineer_email, e.ee_civil_email, e.chief_engineer_email, 'Email') AS recipient_email,
        NULL AS recipient_mobile,
        CASE 
          WHEN e.chief_engineer_email IS NOT NULL AND e.chief_engineer_email != '' THEN 'Chief Engineer'
          WHEN e.ee_civil_email IS NOT NULL AND e.ee_civil_email != '' THEN 'Executive Engineer (Civil)'
          ELSE 'Deputy Engineer (Civil)'
        END AS recipient_role,
        CASE 
          WHEN e.chief_engineer_email IS NOT NULL AND e.chief_engineer_email != '' THEN 3
          WHEN e.ee_civil_email IS NOT NULL AND e.ee_civil_email != '' THEN 2
          ELSE 1
        END AS tier,
        CONCAT(e.alert_type, ' - ', e.alert_value) AS alert_title,
        CONCAT('Ticket: ', e.ticket_id, ' | Village: ', e.village_name, ' | ESR: ', e.esr_name, ' | Issue: ', e.alert_type, ' (', e.alert_value, ')') AS message_content,
        'DELIVERED' AS status,
        e.dispatch_type
      FROM email_alert_logs e
    )
  `;

  const summaryQuery = `
    ${baseCte}
    SELECT 
      COUNT(*) AS total_sent,
      COUNT(*) FILTER (WHERE channel = 'sms') AS sms_sent,
      COUNT(*) FILTER (WHERE channel = 'email') AS email_sent,
      COUNT(*) FILTER (WHERE tier = 1) AS tier_1_sent,
      COUNT(*) FILTER (WHERE tier = 2) AS tier_2_sent,
      COUNT(*) FILTER (WHERE tier = 3) AS tier_3_sent,
      (SELECT COUNT(*) FROM combined_alerts WHERE created_at >= CURRENT_DATE) AS today_sent_count,
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
      today_sent_count: Number(rawSummary.today_sent_count || 0),
      last_dispatched_at: rawSummary.last_dispatched_at || null,
    },
    alerts: (rowsRes.rows || []).map((r: any) => ({
      id: Number(r.id),
      channel: r.channel,
      created_at: r.created_at,
      scheme_id: String(r.scheme_id),
      scheme_name: String(r.scheme_name),
      recipient_name: String(r.recipient_name),
      recipient_email: r.recipient_email || undefined,
      recipient_mobile: r.recipient_mobile || undefined,
      recipient_role: String(r.recipient_role),
      tier: Number(r.tier) as 1 | 2 | 3,
      alert_title: String(r.alert_title),
      message_content: String(r.message_content),
      status: String(r.status),
      dispatch_type: r.dispatch_type || undefined,
    })),
  };
}
