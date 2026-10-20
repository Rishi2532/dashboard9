import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testRegionIot() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT
      region,
      COUNT(DISTINCT scheme_id) as total_schemes,
      COUNT(DISTINCT CASE WHEN total_villages_integrated > 0 OR total_esr_integrated > 0 THEN scheme_id END) as integrated_schemes,
      COUNT(DISTINCT CASE WHEN TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') THEN scheme_id END) as fully_completed_schemes,
      SUM(total_villages_integrated) as villages_integrated,
      SUM(fully_completed_villages) as villages_fully_completed,
      SUM(total_esr_integrated) as esr_integrated,
      SUM(no_fully_completed_esr) as esr_fully_completed
    FROM scheme_status
    GROUP BY region;
  `);
  console.log('scheme_status by region:');
  console.table(res.rows);

  process.exit(0);
}

testRegionIot().catch(console.error);
