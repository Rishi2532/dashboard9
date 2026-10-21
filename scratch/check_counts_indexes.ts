import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDB();
  
  const counts = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM water_scheme_data_history) as w_hist,
      (SELECT COUNT(*) FROM chlorine_history) as cl_hist,
      (SELECT COUNT(*) FROM pressure_history) as pr_hist,
      (SELECT COUNT(*) FROM water_consumption_history) as wc_hist
  `);
  console.log("Table counts:", counts.rows[0]);

  const indexes = await db.execute(sql`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('water_scheme_data_history', 'chlorine_history', 'pressure_history', 'water_consumption_history')
    ORDER BY tablename, indexname;
  `);
  console.log("Indexes:", indexes.rows);

  process.exit(0);
}

check().catch(console.error);
