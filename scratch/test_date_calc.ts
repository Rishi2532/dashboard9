import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { parseHistoryDate, generateRecentDateStrings } from '../server/services/streak-engine.js';

async function test() {
  const db = await getDB();
  const targetDate = new Date(Date.UTC(2026, 9, 18)); // 18-Oct-2026

  const opSchemesRes: any = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIds: string[] = (opSchemesRes.rows || []).map((r: any) => String(r.scheme_id)).filter(Boolean);
  const sqlOpIds = sql.join(opIds.map(id => sql`${id}`), sql`, `);

  const recentDates = generateRecentDateStrings('18-Oct', 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  const [lpcdRows, clRows, prRows, offRes]: any = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ON (h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date)
        h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
      FROM water_scheme_data_history h
      WHERE h.scheme_id IN (${sqlOpIds})
        AND h.data_date IN (${sqlDateList})
      ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date, h.uploaded_at DESC, h.id DESC
    `),
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
    db.execute(sql`
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name,
        c.chlorine_connected, c.pressure_connected, c.flow_meter_connected,
        c.chlorine_status, c.pressure_status, c.flow_meter_status,
        c.last_seen, c.pressure_last_seen
      FROM communication_status c
      WHERE c.scheme_id IN (${sqlOpIds})
        AND ((TRIM(c.chlorine_connected) = 'Connected' AND c.chlorine_status = 'Offline')
         OR (TRIM(c.pressure_connected) = 'Connected' AND c.pressure_status = 'Offline')
         OR (TRIM(c.flow_meter_connected) = 'Connected' AND c.flow_meter_status = 'Offline'))
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
    `)
  ]);

  // LPCD
  const villageLpcdMap = new Map();
  for (const r of lpcdRows.rows) {
    const d = parseHistoryDate(String(r.data_date));
    if (!d || d.getTime() > targetDate.getTime()) continue;
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}`;
    if (!villageLpcdMap.has(key)) villageLpcdMap.set(key, { scheme_id: r.scheme_id, records: [] });
    const entry = villageLpcdMap.get(key);
    if (!entry.records.some((item: any) => item.date.getTime() === d.getTime())) {
      entry.records.push({ date: d, lpcd: parseFloat(String(r.lpcd_value || '0')) });
    }
  }

  let lpcd3 = 0, lpcd7 = 0;
  villageLpcdMap.forEach(entry => {
    entry.records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;
    const latest = entry.records[0];
    if (latest.date.getTime() !== targetDate.getTime() || latest.lpcd >= 55) return;
    let streak = 1, prevDate = latest.date;
    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diff = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
      if (diff === 1 && curr.lpcd < 55) { streak++; prevDate = curr.date; } else break;
    }
    if (streak >= 3) lpcd3++;
    if (streak >= 7) lpcd7++;
  });

  // Chlorine
  const esrClMap = new Map();
  for (const r of clRows.rows) {
    const d = parseHistoryDate(String(r.chlorine_date));
    if (!d || d.getTime() > targetDate.getTime()) continue;
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    if (!esrClMap.has(key)) esrClMap.set(key, { scheme_id: r.scheme_id, records: [] });
    const entry = esrClMap.get(key);
    if (!entry.records.some((item: any) => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        cl: r.chlorine_value !== null ? parseFloat(String(r.chlorine_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }
  let cl3 = 0, cl7 = 0;
  esrClMap.forEach(entry => {
    entry.records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;
    const latest = entry.records[0];
    if (latest.date.getTime() !== targetDate.getTime()) return;
    if (latest.cl === null || isNaN(latest.cl) || (latest.cl >= 0.2 && latest.cl <= 0.5) || latest.water <= 0) return;
    let streak = 1, prevDate = latest.date;
    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diff = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
      if (diff === 1 && curr.cl !== null && !isNaN(curr.cl) && (curr.cl < 0.2 || curr.cl > 0.5) && curr.water > 0) {
        streak++; prevDate = curr.date;
      } else break;
    }
    if (streak >= 3) cl3++;
    if (streak >= 7) cl7++;
  });

  // Pressure
  const esrPrMap = new Map();
  for (const r of prRows.rows) {
    const d = parseHistoryDate(String(r.pressure_date));
    if (!d || d.getTime() > targetDate.getTime()) continue;
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    if (!esrPrMap.has(key)) esrPrMap.set(key, { scheme_id: r.scheme_id, records: [] });
    const entry = esrPrMap.get(key);
    if (!entry.records.some((item: any) => item.date.getTime() === d.getTime())) {
      entry.records.push({
        date: d,
        pr: r.pressure_value !== null ? parseFloat(String(r.pressure_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }
  let pr3 = 0, pr7 = 0;
  esrPrMap.forEach(entry => {
    entry.records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (entry.records.length === 0) return;
    const latest = entry.records[0];
    if (latest.date.getTime() !== targetDate.getTime()) return;
    if (latest.pr === null || isNaN(latest.pr) || latest.pr >= 0.2 || latest.pr < 0 || latest.water <= 0) return;
    let streak = 1, prevDate = latest.date;
    for (let i = 1; i < entry.records.length; i++) {
      const curr = entry.records[i];
      const diff = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
      if (diff === 1 && curr.pr !== null && !isNaN(curr.pr) && curr.pr < 0.2 && curr.pr >= 0 && curr.water > 0) {
        streak++; prevDate = curr.date;
      } else break;
    }
    if (streak >= 3) pr3++;
    if (streak >= 7) pr7++;
  });

  // Offline
  let off3 = 0, off7 = 0;
  (offRes.rows || []).forEach((row: any) => {
    const isChlorine = String(row.chlorine_connected || '').trim() === 'Connected' && row.chlorine_status === 'Offline';
    const isPressure = String(row.pressure_connected || '').trim() === 'Connected' && row.pressure_status === 'Offline';
    const isFlow = String(row.flow_meter_connected || '').trim() === 'Connected' && row.flow_meter_status === 'Offline';
    if (!isChlorine && !isPressure && !isFlow) return;

    let clFlowDays = 0;
    if ((isChlorine || isFlow) && row.last_seen) {
      const ls = new Date(row.last_seen);
      clFlowDays = Math.max(1, Math.floor((targetDate.getTime() - ls.getTime()) / (1000 * 86400)));
    }
    let prDays = 0;
    if (isPressure && row.pressure_last_seen) {
      const pls = new Date(row.pressure_last_seen);
      prDays = Math.max(1, Math.floor((targetDate.getTime() - pls.getTime()) / (1000 * 86400)));
    }
    const finalStreak = Math.max(clFlowDays, prDays, 1);
    if (finalStreak >= 3) off3++;
    if (finalStreak >= 7) off7++;
  });

  console.log('18-Oct counts:');
  console.log('Level 2 (Streak >= 3): LPCD:', lpcd3, 'Chlorine:', cl3, 'Pressure:', pr3, 'Offline:', off3);
  console.log('Level 3 (Streak >= 7): LPCD:', lpcd7, 'Chlorine:', cl7, 'Pressure:', pr7, 'Offline:', off7);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
