import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testSchemeStatusSums() {
  const db = await getDB();

  console.log('--- scheme_status total sums ---');
  const res = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT scheme_id) as total_schemes,
      COUNT(DISTINCT CASE WHEN TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') THEN scheme_id END) as fully_completed_schemes,
      COUNT(DISTINCT CASE WHEN total_villages_integrated > 0 OR total_esr_integrated > 0 THEN scheme_id END) as integrated_schemes,
      SUM(total_villages_integrated) as total_villages_integrated,
      SUM(fully_completed_villages) as fully_completed_villages,
      SUM(total_esr_integrated) as total_esr_integrated,
      SUM(no_fully_completed_esr) as fully_completed_esr
    FROM scheme_status;
  `);
  console.log(res.rows[0]);

  console.log('--- region table sums ---');
  const regRes = await db.execute(sql`
    SELECT 
      SUM(total_schemes_integrated) as tot_schemes_int,
      SUM(fully_completed_schemes) as fc_schemes,
      SUM(total_villages_integrated) as tot_villages_int,
      SUM(fully_completed_villages) as fc_villages,
      SUM(total_esr_integrated) as tot_esr_int,
      SUM(fully_completed_esr) as fc_esr
    FROM region;
  `);
  console.log(regRes.rows[0]);

  process.exit(0);
}

testSchemeStatusSums().catch(console.error);
