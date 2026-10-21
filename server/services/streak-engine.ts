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

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateRecentDateStrings(referenceDateStr?: string, daysLookback: number = 35): string[] {
  let baseDate = new Date();
  if (referenceDateStr) {
    const parts = referenceDateStr.split('-');
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const monIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
      if (!isNaN(day) && monIdx !== -1) {
        baseDate = new Date(Date.UTC(2026, monIdx, day));
      }
    }
  }

  const dateStrings = new Set<string>();
  for (let i = 0; i < daysLookback; i++) {
    const d = new Date(baseDate.getTime() - i * 86400000);
    const day = d.getUTCDate();
    const mon = MONTHS_SHORT[d.getUTCMonth()];
    const padDay = String(day).padStart(2, '0');
    dateStrings.add(`${padDay}-${mon}`);
    dateStrings.add(`${day}-${mon}`);
    dateStrings.add(`${padDay}-${mon}-25`);
    dateStrings.add(`${day}-${mon}-2025`);
    dateStrings.add(`${padDay}-${mon}-2026`);
    dateStrings.add(`${day}-${mon}-2026`);
  }
  return Array.from(dateStrings);
}

export function parseHistoryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const parts = str.split('-');
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const mon = MONTH_MAP[parts[1].toLowerCase().slice(0, 3)];
    if (!isNaN(day) && mon !== undefined && day >= 1 && day <= 31) {
      let year = 2026;
      if (parts.length >= 3) {
        let yr = parseInt(parts[2], 10);
        if (!isNaN(yr)) {
          if (yr < 100) yr += 2000;
          year = yr;
        }
      }
      return new Date(Date.UTC(year, mon, day));
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return null;
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
let cachedAlertsMap = new Map<string, {
  timestamp: number;
  data: {
    allAlerts: AlertWithHistoryStreak[];
    alertsByScheme: Map<string, AlertWithHistoryStreak[]>;
    alertsByKey: Map<string, AlertWithHistoryStreak>;
  };
}>();

const STREAK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export function invalidateStreakCache() {
  cachedAlertsMap.clear();
}

export async function calculateAllAlertStreaksFromHistory(
  db: any,
  forceRefresh: boolean = false,
  asOfDateStr: string = '18-Oct'
): Promise<{
  allAlerts: AlertWithHistoryStreak[];
  alertsByScheme: Map<string, AlertWithHistoryStreak[]>;
  alertsByKey: Map<string, AlertWithHistoryStreak>;
}> {
  const cacheKey = asOfDateStr || '18-Oct';
  const cached = cachedAlertsMap.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < STREAK_CACHE_TTL_MS) {
    return cached.data;
  }

  const targetDate = parseHistoryDate(asOfDateStr);

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

  // 1. Fetch operational schemes and reference date
  const [opSchemesRes, latestDateRes] = await Promise.all([
    db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`),
    db.execute(sql`
      SELECT COALESCE(
        (SELECT chlorine_date_day_7 FROM chlorine_data WHERE chlorine_date_day_7 IS NOT NULL LIMIT 1),
        (SELECT pressure_date_day_7 FROM pressure_data WHERE pressure_date_day_7 IS NOT NULL LIMIT 1),
        (SELECT lpcd_date_day7 FROM water_scheme_data WHERE lpcd_date_day7 IS NOT NULL LIMIT 1),
        '18-Oct'
      ) as latest_date
    `)
  ]);

  const opIds: string[] = (opSchemesRes.rows || []).map((r: any) => String(r.scheme_id)).filter(Boolean);
  if (opIds.length === 0) {
    const emptyResult = { allAlerts, alertsByScheme, alertsByKey };
    cachedAlertsMap.set(cacheKey, { timestamp: Date.now(), data: emptyResult });
    return emptyResult;
  }
  const sqlOpIds = sql.join(opIds.map(id => sql`${id}`), sql`, `);

  const rawLatest = asOfDateStr || latestDateRes.rows?.[0]?.latest_date || '18-Oct';
  const recentDates = generateRecentDateStrings(String(rawLatest), 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  // 2. Execute LPCD, Chlorine, Pressure, and Offline queries in parallel
  const [lpcdRows, clRows, prRows, offRes] = await Promise.all([
    // -------------------------------------------------------------
    // 1. LPCD Streaks (from water_scheme_data_history scoped to op schemes & recent dates)
    // -------------------------------------------------------------
    db.execute(sql`
      SELECT DISTINCT ON (h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date)
        h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
      FROM water_scheme_data_history h
      WHERE h.scheme_id IN (${sqlOpIds})
        AND h.data_date IN (${sqlDateList})
      ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date, h.uploaded_at DESC, h.id DESC
    `),

    // -------------------------------------------------------------
    // 2. Chlorine Streaks (deduplicated per date before join)
    // -------------------------------------------------------------
    db.execute(sql`
      WITH dedup_cl AS (
        SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date)
          c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
          c.uploaded_at, c.id
        FROM chlorine_history c
        WHERE c.scheme_id IN (${sqlOpIds})
          AND c.chlorine_date IN (${sqlDateList})
        ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date, c.uploaded_at DESC, c.id DESC
      ),
      dedup_wc AS (
        SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
          wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
        FROM water_consumption_history wc
        WHERE wc.scheme_id IN (${sqlOpIds})
          AND wc.data_date IN (${sqlDateList})
        ORDER BY wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date, wc.uploaded_at DESC, wc.id DESC
      )
      SELECT 
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
        wc.water_value
      FROM dedup_cl c
      LEFT JOIN dedup_wc wc ON (
        c.scheme_id = wc.scheme_id AND
        LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
        LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
        c.chlorine_date = wc.data_date
      )
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.uploaded_at DESC, c.id DESC
    `),

    // -------------------------------------------------------------
    // 3. Pressure Streaks (deduplicated per date before join)
    // -------------------------------------------------------------
    db.execute(sql`
      WITH dedup_pr AS (
        SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date)
          p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
          p.uploaded_at, p.id
        FROM pressure_history p
        WHERE p.scheme_id IN (${sqlOpIds})
          AND p.pressure_date IN (${sqlDateList})
        ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date, p.uploaded_at DESC, p.id DESC
      ),
      dedup_wc AS (
        SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
          wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
        FROM water_consumption_history wc
        WHERE wc.scheme_id IN (${sqlOpIds})
          AND wc.data_date IN (${sqlDateList})
        ORDER BY wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date, wc.uploaded_at DESC, wc.id DESC
      )
      SELECT 
        p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
        wc.water_value
      FROM dedup_pr p
      LEFT JOIN dedup_wc wc ON (
        p.scheme_id = wc.scheme_id AND
        LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
        LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
        p.pressure_date = wc.data_date
      )
      ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.uploaded_at DESC, p.id DESC
    `),

    // -------------------------------------------------------------
    // 4. Offline Streaks (from communication_status vs yesterday)
    // -------------------------------------------------------------
    db.execute(sql`
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name,
        c.chlorine_connected, c.pressure_connected, c.flow_meter_connected,
        c.chlorine_status, c.pressure_status, c.flow_meter_status,
        c.last_seen, c.pressure_last_seen,
        ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - 1) as yesterday_ist
      FROM communication_status c
      WHERE c.scheme_id IN (${sqlOpIds})
        AND ((TRIM(c.chlorine_connected) = 'Connected' AND c.chlorine_status = 'Offline')
         OR (TRIM(c.pressure_connected) = 'Connected' AND c.pressure_status = 'Offline')
         OR (TRIM(c.flow_meter_connected) = 'Connected' AND c.flow_meter_status = 'Offline'))
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
    `)
  ]);

  // Process LPCD rows
  const villageLpcdMap = new Map<string, {
    scheme_id: string;
    scheme_name: string;
    region?: string;
    village_name: string;
    records: Array<{ date: Date; dateStr: string; lpcd: number }>;
  }>();

  for (const r of lpcdRows.rows) {
    const d = parseHistoryDate(String(r.data_date));
    if (!d) continue;
    if (targetDate && d.getTime() > targetDate.getTime()) continue;

    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}`;

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
    entry.records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;

    const latest = entry.records[0];
    if (targetDate && latest.date.getTime() !== targetDate.getTime()) return;
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
      category: 'lpcd',
      alert_type: 'Low LPCD',
      village_name: entry.village_name,
      esr_name: '-',
      parameter_value: `${latest.lpcd.toFixed(0)} LPCD`,
      streak_days: streak,
      telemetry_date: latest.dateStr
    });
  });

  // Process Chlorine rows
  const esrClMap = new Map<string, {
    scheme_id: string;
    scheme_name: string;
    region?: string;
    village_name: string;
    esr_name: string;
    records: Array<{ date: Date; dateStr: string; cl: number | null; water: number }>;
  }>();

  for (const r of clRows.rows) {
    const d = parseHistoryDate(String(r.chlorine_date));
    if (!d) continue;
    if (targetDate && d.getTime() > targetDate.getTime()) continue;

    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;

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
    if (targetDate && latest.date.getTime() !== targetDate.getTime()) return;
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

  // Process Pressure rows
  const esrPrMap = new Map<string, {
    scheme_id: string;
    scheme_name: string;
    region?: string;
    village_name: string;
    esr_name: string;
    records: Array<{ date: Date; dateStr: string; pr: number | null; water: number }>;
  }>();

  for (const r of prRows.rows) {
    const d = parseHistoryDate(String(r.pressure_date));
    if (!d) continue;
    if (targetDate && d.getTime() > targetDate.getTime()) continue;

    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;

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
    if (targetDate && latest.date.getTime() !== targetDate.getTime()) return;
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

  // Process Offline rows
  (offRes.rows || []).forEach((row: any) => {
    const isChlorine = String(row.chlorine_connected || '').trim() === 'Connected' && row.chlorine_status === 'Offline';
    const isPressure = String(row.pressure_connected || '').trim() === 'Connected' && row.pressure_status === 'Offline';
    const isFlow = String(row.flow_meter_connected || '').trim() === 'Connected' && row.flow_meter_status === 'Offline';

    const offlineSensorsList: string[] = [];
    if (isChlorine) offlineSensorsList.push('Chlorine');
    if (isPressure) offlineSensorsList.push('Pressure');
    if (isFlow) offlineSensorsList.push('Flow Meter');
    if (offlineSensorsList.length === 0) return;

    const evalDate = targetDate || new Date(row.yesterday_ist);
    let clFlowDays = 0;
    if ((isChlorine || isFlow) && row.last_seen) {
      const ls = new Date(row.last_seen);
      clFlowDays = Math.max(1, Math.floor((evalDate.getTime() - ls.getTime()) / (1000 * 86400)));
    }
    let prDays = 0;
    if (isPressure && row.pressure_last_seen) {
      const pls = new Date(row.pressure_last_seen);
      prDays = Math.max(1, Math.floor((evalDate.getTime() - pls.getTime()) / (1000 * 86400)));
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

  const result = { allAlerts, alertsByScheme, alertsByKey };
  cachedAlertsMap.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}
