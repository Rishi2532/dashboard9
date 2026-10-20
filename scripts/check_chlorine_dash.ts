import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkChlorineDashboard() {
  const db = await getDB();

  // In ChlorineDashboard, how many sensors with water have consistent low chlorine?
  const q = await db.execute(sql`
    SELECT 
      cd.scheme_id, cd.village_name, cd.esr_name,
      cd.chlorine_value_7, cd.chlorine_value_6, cd.chlorine_value_5, cd.chlorine_value_4,
      cd.chlorine_value_3, cd.chlorine_value_2, cd.chlorine_value_1,
      cd.number_of_consistent_zero_value_in_chlorine,
      wc.water_value_day7, wc.water_value_day6, wc.water_value_day5, wc.water_value_day4,
      wc.water_value_day3, wc.water_value_day2, wc.water_value_day1
    FROM communication_status cs
    JOIN chlorine_data cd ON (
      cs.scheme_id = cd.scheme_id AND
      LOWER(TRIM(cs.village_name)) = LOWER(TRIM(cd.village_name)) AND
      LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(cd.esr_name))
    )
    LEFT JOIN water_consumption wc ON (
      cs.scheme_id = wc.scheme_id AND
      LOWER(TRIM(cs.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    JOIN scheme_status ss ON (cs.scheme_id = ss.scheme_id)
    WHERE ss.water_supply = 'Yes'
      AND (cs.chlorine_connected = 'Connected' OR cs.chlorine_connected = 'connected')
      AND (cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online')
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7 > 0
  `);

  console.log(`Chlorine Sensors with Water on Day 7: ${q.rows.length}`);

  let cZero = 0;
  let cBelow = 0; // 0 < cl < 0.2 on all 7 days
  let cOptimal = 0;
  let cAbove = 0;

  for (const row of q.rows) {
    const isZero = Number(row.number_of_consistent_zero_value_in_chlorine) === 7;
    const vals = [
      parseFloat(String(row.chlorine_value_1 || 0)),
      parseFloat(String(row.chlorine_value_2 || 0)),
      parseFloat(String(row.chlorine_value_3 || 0)),
      parseFloat(String(row.chlorine_value_4 || 0)),
      parseFloat(String(row.chlorine_value_5 || 0)),
      parseFloat(String(row.chlorine_value_6 || 0)),
      parseFloat(String(row.chlorine_value_7 || 0)),
    ];
    const isBelow = vals.every(v => v > 0 && v < 0.2);
    const isOpt = vals.every(v => v >= 0.2 && v <= 0.5);
    const isAbv = vals.every(v => v > 0.5);

    if (isZero) cZero++;
    if (isBelow) cBelow++;
    if (isOpt) cOptimal++;
    if (isAbv) cAbove++;
  }

  console.log(`Chlorine Consistent Zero: ${cZero}`);
  console.log(`Chlorine Consistent Below (< 0.2): ${cBelow}`);
  console.log(`Total Consistent Low Chlorine (Zero + Below): ${cZero + cBelow}`);

  process.exit(0);
}

checkChlorineDashboard().catch(console.error);
