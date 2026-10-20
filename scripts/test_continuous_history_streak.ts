import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

// Helper to convert "18-Oct" to a Date in 2026
const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parseHistoryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const mon = MONTH_MAP[parts[1].toLowerCase().slice(0, 3)];
    if (!isNaN(day) && mon !== undefined) {
      // Use 2026 as standard year for the project
      return new Date(Date.UTC(2026, mon, day));
    }
  }
  // Try standard parse
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

async function testHistoryStreakEngine() {
  const db = await getDB();

  console.log('Testing LPCD Continuous Streak from water_scheme_data_history...');
  const lpcdRows = await db.execute(sql`
    SELECT 
      h.scheme_id, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    JOIN scheme_status ss ON ss.scheme_id = h.scheme_id AND ss.water_supply = 'Yes'
    WHERE h.data_date IS NOT NULL
    ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.uploaded_at DESC, h.id DESC
  `);

  console.log(`Fetched ${lpcdRows.rows.length} rows for operational schemes`);

  // Group by scheme_id + village_name
  const villageMap = new Map<string, Array<{ date: Date; dateStr: string; lpcd: number }>>();

  for (const r of lpcdRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}`;
    const d = parseHistoryDate(String(r.data_date));
    if (!d) continue;

    if (!villageMap.has(key)) {
      villageMap.set(key, []);
    }
    const arr = villageMap.get(key)!;
    // Don't add duplicate dates for the same village
    if (!arr.some(item => item.date.getTime() === d.getTime())) {
      arr.push({
        date: d,
        dateStr: String(r.data_date),
        lpcd: parseFloat(String(r.lpcd_value || '0'))
      });
    }
  }

  // Calculate continuous streak backwards from latest date for each village
  let streakGte1 = 0;
  let streakGte3 = 0;
  let streakGte7 = 0;
  let streakGte15 = 0;

  const results: any[] = [];

  villageMap.forEach((dateRecords, key) => {
    // Sort descending by date (latest first)
    dateRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Only active alert if latest date is non-compliant (< 55 LPCD)
    if (dateRecords.length === 0) return;
    const latest = dateRecords[0];
    if (latest.lpcd >= 55) return; // Compliant on latest date, no active alert

    let streak = 1;
    let prevDate = latest.date;

    for (let i = 1; i < dateRecords.length; i++) {
      const curr = dateRecords[i];
      const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));

      // MUST be strictly continuous calendar day (diffDays === 1)
      if (diffDays === 1) {
        if (curr.lpcd < 55) {
          streak++;
          prevDate = curr.date;
        } else {
          // Breached condition stopped (village was compliant on this day)
          break;
        }
      } else {
        // Continuity broken (missing date in history)
        break;
      }
    }

    if (streak >= 1) streakGte1++;
    if (streak >= 3) streakGte3++;
    if (streak >= 7) streakGte7++;
    if (streak >= 15) streakGte15++;

    results.push({ key, latestDate: latest.dateStr, latestLpcd: latest.lpcd, streak });
  });

  console.log(`\nLPCD Active Alerts from History: ${results.length}`);
  console.log(`Streak >= 1d (Level 1): ${streakGte1}`);
  console.log(`Streak >= 3d (Level 2): ${streakGte3}`);
  console.log(`Streak >= 7d (Level 3): ${streakGte7}`);
  console.log(`Streak >= 15d (Level 4/5): ${streakGte15}`);

  process.exit(0);
}

testHistoryStreakEngine().catch(console.error);
