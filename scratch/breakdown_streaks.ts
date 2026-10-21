import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { parseHistoryDate, generateRecentDateStrings } from '../server/services/streak-engine';

async function breakdownStreaks() {
  const db = await getDB();

  const [opSchemesRes, latestDateRes] = await Promise.all([
    db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`),
    db.execute(sql`
      SELECT COALESCE(
        (SELECT lpcd_date_day7 FROM water_scheme_data WHERE lpcd_date_day7 IS NOT NULL LIMIT 1),
        '19-Oct'
      ) as latest_date
    `)
  ]);

  const opIds: string[] = (opSchemesRes.rows || []).map((r: any) => String(r.scheme_id)).filter(Boolean);
  const sqlOpIds = sql.join(opIds.map(id => sql`${id}`), sql`, `);

  const rawLatest = latestDateRes.rows?.[0]?.latest_date || '19-Oct';
  const recentDates = generateRecentDateStrings(String(rawLatest), 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  const lpcdRows = await db.execute(sql`
    SELECT DISTINCT ON (h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date)
      h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    WHERE h.scheme_id IN (${sqlOpIds})
      AND h.data_date IN (${sqlDateList})
    ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date, h.uploaded_at DESC, h.id DESC
  `);

  const villageLpcdMap = new Map<string, {
    scheme_id: string;
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

  const results: any[] = [];
  villageLpcdMap.forEach((entry) => {
    entry.records.sort((a, b) => b.date.getTime() - a.date.getTime());
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

    results.push({
      village: entry.village_name,
      scheme_id: entry.scheme_id,
      streak,
      recordsCount: entry.records.length,
      latestLpcd: latest.lpcd,
      oldestStreakDate: entry.records[streak - 1]?.dateStr,
      brokenByDate: streak < entry.records.length ? entry.records[streak]?.dateStr : null,
      brokenByValue: streak < entry.records.length ? entry.records[streak]?.lpcd : null,
      brokenByDiff: streak < entry.records.length ? Math.round((entry.records[streak - 1].date.getTime() - entry.records[streak].date.getTime()) / 86400000) : null,
    });
  });

  console.log(`Total active non-compliant villages: ${results.length}`);
  console.log(`Villages with streak >= 20: ${results.filter(r => r.streak >= 20).length}`);
  console.log(`Villages with streak >= 7: ${results.filter(r => r.streak >= 7).length}`);
  console.log(`Villages with streak < 7: ${results.filter(r => r.streak < 7).length}`);
  console.log(`Villages with streak between 7 and 19: ${results.filter(r => r.streak >= 7 && r.streak < 20).length}`);

  console.log("\nSample of villages with streak between 7 and 19 (why did their streak stop before 20?):");
  console.table(results.filter(r => r.streak >= 7 && r.streak < 20).slice(0, 10));

  console.log("\nSample of villages with streak < 7 (why did their streak stop before 7?):");
  console.table(results.filter(r => r.streak < 7).slice(0, 10));

  process.exit(0);
}

breakdownStreaks().catch(console.error);
