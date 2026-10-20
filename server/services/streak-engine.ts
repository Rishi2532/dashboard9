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

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

export function parseHistoryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const parts = str.split('-');
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const mon = MONTH_MAP[parts[1].toLowerCase().slice(0, 3)];
    if (!isNaN(day) && mon !== undefined) {
      // Standardize to UTC for continuous day difference calculations (default year 2026)
      return new Date(Date.UTC(2026, mon, day));
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Computes exact streaks directly from history tables for continuous non-compliant days:
 * - LPCD: from water_scheme_data_history (<55 LPCD) backwards across continuous days from latest available date
 * - Chlorine: from chlorine_history joined with water_consumption_history (<0.2 or >0.5 with water>0) backwards across continuous days
 * - Pressure: from pressure_history joined with water_consumption_history (<0.2 Bar with water>0) backwards across continuous days
 * - Offline: from communication_status: difference in days between yesterday and last_seen / pressure_last_seen
 *
 * If data is continuous on cloud (e.g. from 2-Oct to 17-Oct = 16 days), streak reaches 15+ days (Level 4 & 5).
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

  // -------------------------------------------------------------
  // 1. LPCD Streaks (from water_scheme_data_history)
  // -------------------------------------------------------------
  const lpcdRows = await db.execute(sql`
    SELECT 
      h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    JOIN scheme_status ss ON ss.scheme_id = h.scheme_id AND ss.water_supply = 'Yes'
    WHERE h.data_date IS NOT NULL
    ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.uploaded_at DESC, h.id DESC
  `);

  const villageLpcdMap = new Map<string, {
    scheme_id: string;
    scheme_name: string;
    region?: string;
    village_name: string;
    records: Array<{ date: Date; dateStr: string; lpcd: number }>;
  }>();

  for (const r of lpcdRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}`;
    const d = parseHistoryDate(String(r.data_date));
    if (!d) continue;

    if (!villageLpcdMap.has(key)) {
      villageLpcdMap.set(key, {
        scheme_id: String(r.scheme_id),
        scheme_name: String(r.scheme_name || `Scheme ${r.scheme_id}`),
        region: r.region ? String(r.region) : undefined,
        village_name: String(r.village_name || '-'),
        records: []
      });
    }

    const entry = villageLpcdMap.get(key)!;
    if (!entry.records.some(item => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        dateStr: String(r.data_date),
        lpcd: parseFloat(String(r.lpcd_value || '0'))
      });
    }
  }

  villageLpcdMap.forEach((entry) => {
    // Sort descending by date (latest first)
    entry.records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;

    const latest = entry.records[0];
    // Active alert only if latest date is non-compliant (< 55 LPCD)
    if (latest.lpcd >= 55) return;

    let streak = 1;
    let prevDate = latest.date;

    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));

      if (diffDays === 1) {
        if (curr.lpcd < 55) {
          streak++;
          prevDate = curr.date;
        } else {
          // Breached condition stopped
          break;
        }
      } else {
        // Calendar continuity broken
        break;
      }
    }

    registerAlert({
      scheme_id: entry.scheme_id,
      scheme_name: entry.scheme_name,
      region: entry.region,
      category: 'lpcd',
      alert_type: 'Low LPCD',
      village_name: entry.village_name,
      esr_name: '-',
      parameter_value: `${latest.lpcd.toFixed(0)} LPCD`,
      streak_days: streak,
      telemetry_date: latest.dateStr
    });
  });

  // -------------------------------------------------------------
  // 2. Chlorine Streaks (from chlorine_history & water_consumption_history)
  // -------------------------------------------------------------
  const clRows = await db.execute(sql`
    SELECT 
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
      wc.water_value
    FROM chlorine_history c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    LEFT JOIN water_consumption_history wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      c.chlorine_date = wc.data_date
    )
    WHERE c.chlorine_date IS NOT NULL
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.uploaded_at DESC, c.id DESC
  `);

  const esrClMap = new Map<string, {
    scheme_id: string;
    scheme_name: string;
    region?: string;
    village_name: string;
    esr_name: string;
    records: Array<{ date: Date; dateStr: string; cl: number | null; water: number }>;
  }>();

  for (const r of clRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    const d = parseHistoryDate(String(r.chlorine_date));
    if (!d) continue;

    if (!esrClMap.has(key)) {
      esrClMap.set(key, {
        scheme_id: String(r.scheme_id),
        scheme_name: String(r.scheme_name || `Scheme ${r.scheme_id}`),
        region: r.region ? String(r.region) : undefined,
        village_name: String(r.village_name || '-'),
        esr_name: String(r.esr_name || '-'),
        records: []
      });
    }

    const entry = esrClMap.get(key)!;
    if (!entry.records.some(item => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        dateStr: String(r.chlorine_date),
        cl: r.chlorine_value !== null ? parseFloat(String(r.chlorine_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  esrClMap.forEach((entry) => {
    entry.records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;

    const latest = entry.records[0];
    // Active Day 7 breach: chlorine < 0.2 or > 0.5 with water > 0
    if (latest.cl === null || isNaN(latest.cl) || (latest.cl >= 0.2 && latest.cl <= 0.5) || latest.water <= 0) {
      return;
    }

    let streak = 1;
    let prevDate = latest.date;

    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));

      if (diffDays === 1) {
        if (curr.cl !== null && !isNaN(curr.cl) && (curr.cl < 0.2 || curr.cl > 0.5) && curr.water > 0) {
          streak++;
          prevDate = curr.date;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const isHigh = latest.cl > 0.5;
    registerAlert({
      scheme_id: entry.scheme_id,
      scheme_name: entry.scheme_name,
      region: entry.region,
      category: 'chlorine',
      alert_type: isHigh ? 'High Chlorine' : 'Low Chlorine',
      village_name: entry.village_name,
      esr_name: entry.esr_name,
      parameter_value: `${latest.cl.toFixed(2)} mg/L`,
      streak_days: streak,
      telemetry_date: latest.dateStr
    });
  });

  // -------------------------------------------------------------
  // 3. Pressure Streaks (from pressure_history & water_consumption_history)
  // -------------------------------------------------------------
  const prRows = await db.execute(sql`
    SELECT 
      p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
      wc.water_value
    FROM pressure_history p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    LEFT JOIN water_consumption_history wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      p.pressure_date = wc.data_date
    )
    WHERE p.pressure_date IS NOT NULL
    ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.uploaded_at DESC, p.id DESC
  `);

  const esrPrMap = new Map<string, {
    scheme_id: string;
    scheme_name: string;
    region?: string;
    village_name: string;
    esr_name: string;
    records: Array<{ date: Date; dateStr: string; pr: number | null; water: number }>;
  }>();

  for (const r of prRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    const d = parseHistoryDate(String(r.pressure_date));
    if (!d) continue;

    if (!esrPrMap.has(key)) {
      esrPrMap.set(key, {
        scheme_id: String(r.scheme_id),
        scheme_name: String(r.scheme_name || `Scheme ${r.scheme_id}`),
        region: r.region ? String(r.region) : undefined,
        village_name: String(r.village_name || '-'),
        esr_name: String(r.esr_name || '-'),
        records: []
      });
    }

    const entry = esrPrMap.get(key)!;
    if (!entry.records.some(item => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        dateStr: String(r.pressure_date),
        pr: r.pressure_value !== null ? parseFloat(String(r.pressure_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  esrPrMap.forEach((entry) => {
    entry.records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;

    const latest = entry.records[0];
    // Active Day 7 breach: pressure < 0.2 Bar and >= 0 with water > 0
    if (latest.pr === null || isNaN(latest.pr) || latest.pr >= 0.2 || latest.pr < 0 || latest.water <= 0) {
      return;
    }

    let streak = 1;
    let prevDate = latest.date;

    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));

      if (diffDays === 1) {
        if (curr.pr !== null && !isNaN(curr.pr) && curr.pr < 0.2 && curr.pr >= 0 && curr.water > 0) {
          streak++;
          prevDate = curr.date;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    registerAlert({
      scheme_id: entry.scheme_id,
      scheme_name: entry.scheme_name,
      region: entry.region,
      category: 'pressure',
      alert_type: 'Low Pressure',
      village_name: entry.village_name,
      esr_name: entry.esr_name,
      parameter_value: `${latest.pr.toFixed(2)} Bar`,
      streak_days: streak,
      telemetry_date: latest.dateStr
    });
  });

  // -------------------------------------------------------------
  // 4. Offline Streaks (from communication_status vs yesterday)
  // -------------------------------------------------------------
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
