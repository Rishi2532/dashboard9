import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { parseHistoryDate } from '../server/services/streak-engine';

async function checkLatestDates() {
  const db = await getDB();
  
  // Check unique dates in water_scheme_data_history
  const wDates = await db.execute(sql`
    SELECT DISTINCT data_date FROM water_scheme_data_history WHERE data_date IS NOT NULL
  `);
  const parsedWDates = wDates.rows
    .map((r: any) => ({ raw: r.data_date, parsed: parseHistoryDate(r.data_date) }))
    .filter((x: any) => x.parsed !== null)
    .sort((a: any, b: any) => b.parsed.getTime() - a.parsed.getTime());

  console.log("Water history top 10 latest dates:", parsedWDates.slice(0, 10).map((x: any) => `${x.raw} -> ${x.parsed.toISOString()}`));

  // Check unique dates in chlorine_history
  const clDates = await db.execute(sql`
    SELECT DISTINCT chlorine_date FROM chlorine_history WHERE chlorine_date IS NOT NULL
  `);
  const parsedClDates = clDates.rows
    .map((r: any) => ({ raw: r.chlorine_date, parsed: parseHistoryDate(r.chlorine_date) }))
    .filter((x: any) => x.parsed !== null)
    .sort((a: any, b: any) => b.parsed.getTime() - a.parsed.getTime());

  console.log("Chlorine history top 10 latest dates:", parsedClDates.slice(0, 10).map((x: any) => `${x.raw} -> ${x.parsed.toISOString()}`));

  // Check unique dates in pressure_history
  const prDates = await db.execute(sql`
    SELECT DISTINCT pressure_date FROM pressure_history WHERE pressure_date IS NOT NULL
  `);
  const parsedPrDates = prDates.rows
    .map((r: any) => ({ raw: r.pressure_date, parsed: parseHistoryDate(r.pressure_date) }))
    .filter((x: any) => x.parsed !== null)
    .sort((a: any, b: any) => b.parsed.getTime() - a.parsed.getTime());

  console.log("Pressure history top 10 latest dates:", parsedPrDates.slice(0, 10).map((x: any) => `${x.raw} -> ${x.parsed.toISOString()}`));

  process.exit(0);
}

checkLatestDates().catch(console.error);
