import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkCurrentTables() {
  const db = await getDB();
  
  const w = await db.execute(sql`
    SELECT lpcd_date_day7, lpcd_date_day6, lpcd_date_day5, lpcd_date_day4, lpcd_date_day3, lpcd_date_day2, lpcd_date_day1
    FROM water_scheme_data
    WHERE lpcd_date_day7 IS NOT NULL
    LIMIT 3;
  `);
  console.log("water_scheme_data sample dates:", w.rows[0]);

  const cl = await db.execute(sql`
    SELECT chlorine_date_day_7, chlorine_date_day_6, chlorine_date_day_5, chlorine_date_day_4, chlorine_date_day_3, chlorine_date_day_2, chlorine_date_day_1
    FROM chlorine_data
    WHERE chlorine_date_day_7 IS NOT NULL
    LIMIT 3;
  `);
  console.log("chlorine_data sample dates:", cl.rows[0]);

  const pr = await db.execute(sql`
    SELECT pressure_date_day_7, pressure_date_day_6, pressure_date_day_5, pressure_date_day_4, pressure_date_day_3, pressure_date_day_2, pressure_date_day_1
    FROM pressure_data
    WHERE pressure_date_day_7 IS NOT NULL
    LIMIT 3;
  `);
  console.log("pressure_data sample dates:", pr.rows[0]);

  process.exit(0);
}

checkCurrentTables().catch(console.error);
