import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { parseHistoryDate } from '../server/services/streak-engine';
import { generateRecentDateStrings } from './test_date_gen';

async function testEngineWithOpt() {
  const db = await getDB();
  
  const latestDateRes = await db.execute(sql`
    SELECT COALESCE(
      (SELECT chlorine_date_day_7 FROM chlorine_data WHERE chlorine_date_day_7 IS NOT NULL LIMIT 1),
      (SELECT pressure_date_day_7 FROM pressure_data WHERE pressure_date_day_7 IS NOT NULL LIMIT 1),
      (SELECT lpcd_date_day7 FROM water_scheme_data WHERE lpcd_date_day7 IS NOT NULL LIMIT 1),
      '19-Oct'
    ) as latest_date
  `);
  const rawLatest = latestDateRes.rows?.[0]?.latest_date || '19-Oct';
  const recentDates = generateRecentDateStrings(String(rawLatest), 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  const allAlerts: any[] = [];
  const registerAlert = (alert: any) => allAlerts.push(alert);

  // 1. LPCD
  console.time("LPCD Calculation");
  const lpcdRows = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    )
    SELECT DISTINCT ON (h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date)
      h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    JOIN op_schemes ss ON ss.scheme_id = h.scheme_id
    WHERE h.data_date IN (${sqlDateList})
    ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date, h.uploaded_at DESC, h.id DESC
  `);

  const villageLpcdMap = new Map<string, any>();
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
    if (!entry.records.some((item: any) => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        dateStr: String(r.data_date),
        lpcd: parseFloat(String(r.lpcd_value || '0'))
      });
    }
  }

  villageLpcdMap.forEach((entry) => {
    entry.records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;
    const latest = entry.records[0];
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
        } else break;
      } else break;
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
  console.timeEnd("LPCD Calculation");

  // 2. Chlorine
  console.time("Chlorine Calculation");
  const clRows = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    dedup_cl AS (
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date)
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
        c.uploaded_at, c.id
      FROM chlorine_history c
      JOIN op_schemes ss ON ss.scheme_id = c.scheme_id
      WHERE c.chlorine_date IN (${sqlDateList})
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date, c.uploaded_at DESC, c.id DESC
    ),
    dedup_wc AS (
      SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      JOIN op_schemes ss ON ss.scheme_id = wc.scheme_id
      WHERE wc.data_date IN (${sqlDateList})
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
  `);

  const esrClMap = new Map<string, any>();
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
    if (!entry.records.some((item: any) => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        dateStr: String(r.chlorine_date),
        cl: r.chlorine_value !== null ? parseFloat(String(r.chlorine_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  esrClMap.forEach((entry) => {
    entry.records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;
    const latest = entry.records[0];
    if (latest.cl === null || isNaN(latest.cl) || (latest.cl >= 0.2 && latest.cl <= 0.5) || latest.water <= 0) return;

    let streak = 1;
    let prevDate = latest.date;
    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
      if (diffDays === 1) {
        if (curr.cl !== null && !isNaN(curr.cl) && (curr.cl < 0.2 || curr.cl > 0.5) && curr.water > 0) {
          streak++;
          prevDate = curr.date;
        } else break;
      } else break;
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
  console.timeEnd("Chlorine Calculation");

  // 3. Pressure
  console.time("Pressure Calculation");
  const prRows = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    dedup_pr AS (
      SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date)
        p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
        p.uploaded_at, p.id
      FROM pressure_history p
      JOIN op_schemes ss ON ss.scheme_id = p.scheme_id
      WHERE p.pressure_date IN (${sqlDateList})
      ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date, p.uploaded_at DESC, p.id DESC
    ),
    dedup_wc AS (
      SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      JOIN op_schemes ss ON ss.scheme_id = wc.scheme_id
      WHERE wc.data_date IN (${sqlDateList})
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
  `);

  const esrPrMap = new Map<string, any>();
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
    if (!entry.records.some((item: any) => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        dateStr: String(r.pressure_date),
        pr: r.pressure_value !== null ? parseFloat(String(r.pressure_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  esrPrMap.forEach((entry) => {
    entry.records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;
    const latest = entry.records[0];
    if (latest.pr === null || isNaN(latest.pr) || latest.pr >= 0.2 || latest.pr < 0 || latest.water <= 0) return;

    let streak = 1;
    let prevDate = latest.date;
    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
      if (diffDays === 1) {
        if (curr.pr !== null && !isNaN(curr.pr) && curr.pr < 0.2 && curr.pr >= 0 && curr.water > 0) {
          streak++;
          prevDate = curr.date;
        } else break;
      } else break;
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
  console.timeEnd("Pressure Calculation");

  console.log(`\n=== RESULTS ===`);
  console.log(`Total alerts generated: ${allAlerts.length}`);
  const counts: Record<string, number> = {};
  allAlerts.forEach(a => counts[a.category] = (counts[a.category] || 0) + 1);
  console.log("Alerts by category:", counts);

  const schemeIds = new Set(allAlerts.map(a => a.scheme_id));
  console.log(`Across ${schemeIds.size} operational schemes.`);

  // Tier counts
  [1, 3, 7, 15, 20].forEach(minStreak => {
    const tierSchemes = new Set();
    allAlerts.forEach(a => {
      if (a.streak_days >= minStreak) tierSchemes.add(a.scheme_id);
    });
    console.log(`Streak >= ${minStreak}d: ${tierSchemes.size} qualifying schemes`);
  });

  process.exit(0);
}

testEngineWithOpt().catch(console.error);
