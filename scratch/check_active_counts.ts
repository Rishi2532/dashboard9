import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkRowCounts() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM water_scheme_data) as w_rows,
      (SELECT COUNT(*) FROM chlorine_data) as cl_rows,
      (SELECT COUNT(*) FROM pressure_data) as pr_rows,
      (SELECT COUNT(*) FROM communication_status) as comm_rows
  `);
  console.log("Current table rows:", res.rows[0]);
  process.exit(0);
}

checkRowCounts().catch(console.error);
