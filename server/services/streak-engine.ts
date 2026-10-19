import { sql } from "drizzle-orm";

export interface AlertWithHistoryStreak {
  scheme_id: string;
  scheme_name: string;
  region?: string;
  category: 'lpcd' | 'chlorine' | 'pressure' | 'offline';
  alert_type: string;
  village_name: string;
  esr_name: string;
  parameter_value: string;
  streak_days: number;
  telemetry_date?: string;
  offline_sensors?: string;
  flow_offline?: boolean;
  pressure_offline?: boolean;
  chlorine_offline?: boolean;
}

/**
 * Computes exact streaks from history tables from the latest available date:
 * - LPCD: from water_scheme_data 7-day readings (<55 LPCD) backwards from Day 7
 * - Chlorine: from chlorine_data 7-day readings (<0.2 or >0.5 with water>0) backwards from Day 7
 * - Pressure: from pressure_data 7-day readings (<0.2 Bar with water>0) backwards from Day 7
 * - Offline: from communication_status:
 *     difference between yesterday date and last_seen date for Chlorine & Flow Meter,
 *     and pressure_last_seen date for Pressure
 */
export async function calculateAllAlertStreaksFromHistory(db: any): Promise<{
  allAlerts: AlertWithHistoryStreak[];
  alertsByScheme: Map<string, AlertWithHistoryStreak[]>;
  alertsByKey: Map<string, AlertWithHistoryStreak>;
}> {
  const allAlerts: AlertWithHistoryStreak[] = [];
  const alertsByScheme = new Map<string, AlertWithHistoryStreak[]>();
  const alertsByKey = new Map<string, AlertWithHistoryStreak>();

  const registerAlert = (alert: AlertWithHistoryStreak) => {
    allAlerts.push(alert);
    const sId = String(alert.scheme_id).trim();
    if (!alertsByScheme.has(sId)) {
      alertsByScheme.set(sId, []);
    }
    alertsByScheme.get(sId)!.push(alert);

    const vName = (alert.village_name || '-').trim().toLowerCase();
    const eName = (alert.esr_name || '-').trim().toLowerCase();
    const key = `${sId}|${alert.category}|${vName}|${eName}`;
    alertsByKey.set(key, alert);
  };

  // 1. LPCD Streaks (from water_scheme_data Day 7..1)
  const lpcdRes: any = await db.execute(sql`
    SELECT 
      ws.scheme_id, ws.scheme_name, ws.region, ws.village_name,
      ws.lpcd_value_day7 as d7, ws.lpcd_value_day6 as d6, ws.lpcd_value_day5 as d5,
      ws.lpcd_value_day4 as d4, ws.lpcd_value_day3 as d3, ws.lpcd_value_day2 as d2,
      ws.lpcd_value_day1 as d1,
      ws.lpcd_date_day7
    FROM water_scheme_data ws
    JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes'
    WHERE ws.lpcd_value_day7 IS NOT NULL 
      AND NULLIF(REGEXP_REPLACE(ws.lpcd_value_day7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
      AND (NULLIF(REGEXP_REPLACE(ws.lpcd_value_day7::text, '[^0-9.]', '', 'g'), '')::numeric) < 55
    ORDER BY ws.scheme_id, ws.village_name
  `);

  (lpcdRes.rows || []).forEach((row: any) => {
    let streak = 0;
    const vals = [row.d7, row.d6, row.d5, row.d4, row.d3, row.d2, row.d1];
    for (const v of vals) {
      const num = v !== null && v !== undefined ? parseFloat(String(v)) : null;
      if (num !== null && !isNaN(num) && num < 55) {
        streak++;
      } else {
        break;
      }
    }
    const finalStreak = Math.max(1, streak);
    const lpcdVal = row.d7 ? `${parseFloat(String(row.d7)).toFixed(0)} LPCD` : "0 LPCD";

    registerAlert({
      scheme_id: row.scheme_id,
      scheme_name: row.scheme_name || `Scheme ${row.scheme_id}`,
      region: row.region || undefined,
      category: 'lpcd',
      alert_type: 'Low LPCD',
      village_name: row.village_name || '-',
      esr_name: '-',
      parameter_value: lpcdVal,
      streak_days: finalStreak,
      telemetry_date: row.lpcd_date_day7 ? String(row.lpcd_date_day7) : undefined,
    });
  });

  // 2. Chlorine Streaks (from chlorine_data Day 7..1 & water_consumption)
  const clRes: any = await db.execute(sql`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name,
      c.chlorine_value_7 as c7, c.chlorine_value_6 as c6, c.chlorine_value_5 as c5,
      c.chlorine_value_4 as c4, c.chlorine_value_3 as c3, c.chlorine_value_2 as c2,
      c.chlorine_value_1 as c1,
      c.chlorine_date_day_7,
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM chlorine_data c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    JOIN water_consumption wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE c.chlorine_value_7 IS NOT NULL
      AND NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
      AND (
        (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
        OR (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) > 0.5
      )
      AND wc.water_value_day7 IS NOT NULL 
      AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
      AND wc.water_value_day7::numeric > 0
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date_day_7 DESC
  `);

  (clRes.rows || []).forEach((row: any) => {
    let streak = 0;
    const cVals = [row.c7, row.c6, row.c5, row.c4, row.c3, row.c2, row.c1];
    const wVals = [row.w7, row.w6, row.w5, row.w4, row.w3, row.w2, row.w1];
    for (let i = 0; i < 7; i++) {
      const cv = cVals[i] !== null && cVals[i] !== undefined ? parseFloat(String(cVals[i])) : null;
      const wv = wVals[i] !== null && wVals[i] !== undefined ? parseFloat(String(wVals[i])) : null;
      if (cv !== null && !isNaN(cv) && (cv < 0.2 || cv > 0.5) && wv !== null && !isNaN(wv) && wv > 0) {
        streak++;
      } else {
        break;
      }
    }
    const finalStreak = Math.max(1, streak);
    const numVal = parseFloat(String(row.c7 || "0"));
    const isHigh = numVal > 0.5;
    const alertType = isHigh ? "High Chlorine" : "Low Chlorine";
    const clVal = `${numVal.toFixed(2)} mg/L`;

    registerAlert({
      scheme_id: row.scheme_id,
      scheme_name: row.scheme_name || `Scheme ${row.scheme_id}`,
      region: row.region || undefined,
      category: 'chlorine',
      alert_type: alertType,
      village_name: row.village_name || '-',
      esr_name: row.esr_name || '-',
      parameter_value: clVal,
      streak_days: finalStreak,
      telemetry_date: row.chlorine_date_day_7 ? String(row.chlorine_date_day_7) : undefined,
    });
  });

  // 3. Pressure Streaks (from pressure_data Day 7..1 & water_consumption)
  const prRes: any = await db.execute(sql`
    SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))))
      p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name,
      p.pressure_value_7 as p7, p.pressure_value_6 as p6, p.pressure_value_5 as p5,
      p.pressure_value_4 as p4, p.pressure_value_3 as p3, p.pressure_value_2 as p2,
      p.pressure_value_1 as p1,
      p.pressure_date_day_7,
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM pressure_data p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    JOIN water_consumption wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE p.pressure_value_7 IS NOT NULL
      AND NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
      AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
      AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) >= 0
      AND wc.water_value_day7 IS NOT NULL 
      AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
      AND wc.water_value_day7::numeric > 0
    ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date_day_7 DESC
  `);

  (prRes.rows || []).forEach((row: any) => {
    let streak = 0;
    const pVals = [row.p7, row.p6, row.p5, row.p4, row.p3, row.p2, row.p1];
    const wVals = [row.w7, row.w6, row.w5, row.w4, row.w3, row.w2, row.w1];
    for (let i = 0; i < 7; i++) {
      const pv = pVals[i] !== null && pVals[i] !== undefined ? parseFloat(String(pVals[i])) : null;
      const wv = wVals[i] !== null && wVals[i] !== undefined ? parseFloat(String(wVals[i])) : null;
      if (pv !== null && !isNaN(pv) && pv < 0.2 && pv >= 0 && wv !== null && !isNaN(wv) && wv > 0) {
        streak++;
      } else {
        break;
      }
    }
    const finalStreak = Math.max(1, streak);
    const numVal = parseFloat(String(row.p7 || "0"));
    const prVal = `${numVal.toFixed(2)} Bar`;

    registerAlert({
      scheme_id: row.scheme_id,
      scheme_name: row.scheme_name || `Scheme ${row.scheme_id}`,
      region: row.region || undefined,
      category: 'pressure',
      alert_type: 'Low Pressure',
      village_name: row.village_name || '-',
      esr_name: row.esr_name || '-',
      parameter_value: prVal,
      streak_days: finalStreak,
      telemetry_date: row.pressure_date_day_7 ? String(row.pressure_date_day_7) : undefined,
    });
  });

  // 4. Offline Streaks (from communication_status vs yesterday)
  const offRes: any = await db.execute(sql`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name,
      c.chlorine_connected, c.pressure_connected, c.flow_meter_connected,
      c.chlorine_status, c.pressure_status, c.flow_meter_status,
      c.last_seen, c.pressure_last_seen,
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - 1) as yesterday_ist
    FROM communication_status c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    WHERE (TRIM(c.chlorine_connected) = 'Connected' AND c.chlorine_status = 'Offline')
       OR (TRIM(c.pressure_connected) = 'Connected' AND c.pressure_status = 'Offline')
       OR (TRIM(c.flow_meter_connected) = 'Connected' AND c.flow_meter_status = 'Offline')
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
  `);

  (offRes.rows || []).forEach((row: any) => {
    const isChlorine = String(row.chlorine_connected || '').trim() === 'Connected' && row.chlorine_status === 'Offline';
    const isPressure = String(row.pressure_connected || '').trim() === 'Connected' && row.pressure_status === 'Offline';
    const isFlow = String(row.flow_meter_connected || '').trim() === 'Connected' && row.flow_meter_status === 'Offline';

    const offlineSensorsList: string[] = [];
    if (isChlorine) offlineSensorsList.push('Chlorine');
    if (isPressure) offlineSensorsList.push('Pressure');
    if (isFlow) offlineSensorsList.push('Flow Meter');
    if (offlineSensorsList.length === 0) return;

    const yesterday = new Date(row.yesterday_ist);
    let clFlowDays = 0;
    if ((isChlorine || isFlow) && row.last_seen) {
      const ls = new Date(row.last_seen);
      clFlowDays = Math.max(1, Math.floor((yesterday.getTime() - ls.getTime()) / (1000 * 86400)));
    }
    let prDays = 0;
    if (isPressure && row.pressure_last_seen) {
      const pls = new Date(row.pressure_last_seen);
      prDays = Math.max(1, Math.floor((yesterday.getTime() - pls.getTime()) / (1000 * 86400)));
    }
    const finalStreak = Math.max(clFlowDays, prDays, 1);
    const offlineDate = row.last_seen || row.pressure_last_seen || null;

    registerAlert({
      scheme_id: row.scheme_id,
      scheme_name: row.scheme_name || `Scheme ${row.scheme_id}`,
      region: row.region || undefined,
      category: 'offline',
      alert_type: 'Offline',
      village_name: row.village_name || '-',
      esr_name: row.esr_name || '-',
      parameter_value: offlineSensorsList.join(', '),
      streak_days: finalStreak,
      offline_sensors: offlineSensorsList.join(', '),
      flow_offline: isFlow,
      pressure_offline: isPressure,
      chlorine_offline: isChlorine,
      telemetry_date: offlineDate ? (typeof offlineDate === 'object' ? new Date(offlineDate).toISOString() : String(offlineDate)) : undefined,
    });
  });

  return { allAlerts, alertsByScheme, alertsByKey };
}
