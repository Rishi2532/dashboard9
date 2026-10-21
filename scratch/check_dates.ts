import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT DISTINCT data_date, COUNT(*) 
    FROM water_scheme_data_history 
    WHERE data_date IN ('12-Oct', '13-Oct', '14-Oct', '15-Oct', '16-Oct', '17-Oct', '18-Oct')
    GROUP BY data_date
    ORDER BY data_date;
  `);
  console.log('water_scheme_data_history counts by date:', res.rows);

  const clRes = await db.execute(sql`
    SELECT DISTINCT chlorine_date, COUNT(*) 
    FROM chlorine_history 
    WHERE chlorine_date IN ('12-Oct', '13-Oct', '14-Oct', '15-Oct', '16-Oct', '17-Oct', '18-Oct')
    GROUP BY chlorine_date
    ORDER BY chlorine_date;
  `);
  console.log('chlorine_history counts by date:', clRes.rows);

  const prRes = await db.execute(sql`
    SELECT DISTINCT pressure_date, COUNT(*) 
    FROM pressure_history 
    WHERE pressure_date IN ('12-Oct', '13-Oct', '14-Oct', '15-Oct', '16-Oct', '17-Oct', '18-Oct')
    GROUP BY pressure_date
    ORDER BY pressure_date;
  `);
  console.log('pressure_history counts by date:', prRes.rows);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
