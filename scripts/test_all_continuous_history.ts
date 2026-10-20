import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

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
      return new Date(Date.UTC(2026, mon, day));
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

async function testAllContinuousHistory() {
  const db = await getDB();

  console.log('Testing Chlorine Continuous Streak from chlorine_history & water_consumption_history...');
  const clRows = await db.execute(sql`
    SELECT 
      c.scheme_id, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
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
  `);

  console.log(`Fetched ${clRows.rows.length} chlorine history rows`);

  const clMap = new Map<string, Array<{ date: Date; dateStr: string; cl: number | null; water: number }>>();

  for (const r of clRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    const d = parseHistoryDate(String(r.chlorine_date));
    if (!d) continue;

    if (!clMap.has(key)) clMap.set(key, []);
    const arr = clMap.get(key)!;
    if (!arr.some(item => item.date.getTime() === d.getTime())) {
      arr.push({
        date: d,
        dateStr: String(r.chlorine_date),
        cl: r.chlorine_value !== null ? parseFloat(String(r.chlorine_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  let clL1 = 0, clL2 = 0, clL3 = 0, clL4 = 0;

  clMap.forEach((records) => {
    records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (records.length === 0) return;
    const latest = records[0];

    // Active Day 7 breach: chlorine < 0.2 or > 0.5 with water > 0
    if (latest.cl === null || isNaN(latest.cl) || (latest.cl >= 0.2 && latest.cl <= 0.5) || latest.water <= 0) {
      return;
    }

    let streak = 1;
    let prevDate = latest.date;

    for (let i = 1; i < records.length; i++) {
      const curr = records[i];
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

    if (streak >= 1) clL1++;
    if (streak >= 3) clL2++;
    if (streak >= 7) clL3++;
    if (streak >= 15) clL4++;
  });

  console.log(`Chlorine Alerts: L1=${clL1}, L2=${clL2}, L3=${clL3}, L4/5=${clL4}`);

  console.log('\nTesting Pressure Continuous Streak from pressure_history & water_consumption_history...');
  const prRows = await db.execute(sql`
    SELECT 
      p.scheme_id, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
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
  `);

  console.log(`Fetched ${prRows.rows.length} pressure history rows`);

  const prMap = new Map<string, Array<{ date: Date; dateStr: string; pr: number | null; water: number }>>();

  for (const r of prRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    const d = parseHistoryDate(String(r.pressure_date));
    if (!d) continue;

    if (!prMap.has(key)) prMap.set(key, []);
    const arr = prMap.get(key)!;
    if (!arr.some(item => item.date.getTime() === d.getTime())) {
      arr.push({
        date: d,
        dateStr: String(r.pressure_date),
        pr: r.pressure_value !== null ? parseFloat(String(r.pressure_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  let prL1 = 0, prL2 = 0, prL3 = 0, prL4 = 0;

  prMap.forEach((records) => {
    records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (records.length === 0) return;
    const latest = records[0];

    // Active Day 7 breach: pressure < 0.2 with water > 0
    if (latest.pr === null || isNaN(latest.pr) || latest.pr >= 0.2 || latest.pr < 0 || latest.water <= 0) {
      return;
    }

    let streak = 1;
    let prevDate = latest.date;

    for (let i = 1; i < records.length; i++) {
      const curr = records[i];
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

    if (streak >= 1) prL1++;
    if (streak >= 3) prL2++;
    if (streak >= 7) prL3++;
    if (streak >= 15) prL4++;
  });

  console.log(`Pressure Alerts: L1=${prL1}, L2=${prL2}, L3=${prL3}, L4/5=${prL4}`);

  process.exit(0);
}

testAllContinuousHistory().catch(console.error);
