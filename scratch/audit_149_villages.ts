import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { parseHistoryDate, generateRecentDateStrings } from '../server/services/streak-engine';

async function audit149() {
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

  // Check what dates exist in water_scheme_data_history for op schemes
  const distinctDates = await db.execute(sql`
    SELECT DISTINCT data_date
    FROM water_scheme_data_history h
    WHERE h.scheme_id IN (${sqlOpIds})
      AND h.data_date IN (${sqlDateList})
    ORDER BY data_date;
  `);
  console.log("Distinct dates in water_scheme_data_history for op schemes:", distinctDates.rows.map(r => r.data_date));

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

  // Let's inspect villages with streak >= 20
  const villages20Plus: any[] = [];
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
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (streak >= 20) {
      villages20Plus.push({
        scheme: entry.scheme_id,
        village: entry.village_name,
        streak,
        newestDate: entry.records[0].dateStr,
        oldestDateInStreak: entry.records[streak - 1].dateStr,
        oldestParsedDate: entry.records[streak - 1].date.toISOString().slice(0, 10),
        newestParsedDate: entry.records[0].date.toISOString().slice(0, 10),
        allStreakDates: entry.records.slice(0, streak).map(r => r.dateStr)
      });
    }
  });

  console.log(`\nTotal villages with streak >= 20: ${villages20Plus.length}`);
  if (villages20Plus.length > 0) {
    console.log("Sample village 1 with streak >= 20:");
    console.log("Village:", villages20Plus[0].village, "Scheme:", villages20Plus[0].scheme, "Streak:", villages20Plus[0].streak);
    console.log("Newest Date:", villages20Plus[0].newestDate, "(", villages20Plus[0].newestParsedDate, ")");
    console.log("Oldest Date in streak:", villages20Plus[0].oldestDateInStreak, "(", villages20Plus[0].oldestParsedDate, ")");
    console.log("All dates in streak:", villages20Plus[0].allStreakDates);

    console.log("\nOldest date distribution across the 149 villages:");
    const oldestDist: Record<string, number> = {};
    villages20Plus.forEach(v => {
      oldestDist[`${v.oldestDateInStreak} (${v.oldestParsedDate})`] = (oldestDist[`${v.oldestDateInStreak} (${v.oldestParsedDate})`] || 0) + 1;
    });
    console.log(oldestDist);
  }

  process.exit(0);
}

audit149().catch(console.error);
