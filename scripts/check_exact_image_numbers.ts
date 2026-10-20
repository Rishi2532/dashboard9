import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkExactImageNumbers() {
  const db = await getDB();

  console.log('--- 1. Scope from scheme_progress_summary ---');
  const scopeAll = await db.execute(sql`
    SELECT
      COUNT(DISTINCT scheme_id) AS total_schemes,
      COALESCE(SUM(number_of_villages), 0) AS total_villages,
      COALESCE(SUM(COALESCE(number_of_esr,0) + COALESCE(number_of_gsr,0) + COALESCE(number_of_mbr,0)), 0) AS total_esr
    FROM scheme_progress_summary;
  `);
  console.log('Scope All:', scopeAll.rows[0]);

  console.log('--- 2. Scope by region ---');
  const scopeByRegion = await db.execute(sql`
    SELECT
      region,
      COUNT(DISTINCT scheme_id) AS total_schemes,
      COALESCE(SUM(number_of_villages), 0) AS total_villages,
      COALESCE(SUM(COALESCE(number_of_esr,0) + COALESCE(number_of_gsr,0) + COALESCE(number_of_mbr,0)), 0) AS total_esr
    FROM scheme_progress_summary
    GROUP BY region;
  `);
  console.log('Scope by region:', scopeByRegion.rows);

  console.log('--- 3. IoT Progress from region table or schemes ---');
  // Check schemes query from /api/schemes or scheme_status
  // In user image:
  // Schemes: Total Integrated: 226, Fully Integrated: 52
  // Villages: Total Integrated: 2,249, Fully Integrated: 1,271
  // ESRs: Total Integrated: 3,018, Fully Integrated: 2,249
  const stStats = await db.execute(sql`
    SELECT 
      COUNT(*) as total_schemes,
      COUNT(CASE WHEN fully_completion_scheme_status ILIKE '%complete%' THEN 1 END) as fully_schemes,
      SUM(total_villages) as tot_villages,
      SUM(villages_integrated) as tot_villages_int,
      SUM(total_esr) as tot_esrs,
      SUM(esr_integrated) as tot_esr_int
    FROM scheme_status;
  `);
  console.log('scheme_status totals:', stStats.rows[0]);

  // Check what scheme_progress_summary has for integrated / completed
  const spCompleted = await db.execute(sql`
    SELECT 
      SUM(number_of_completed_villages) as comp_villages,
      SUM(number_of_completed_esr) as comp_esrs,
      SUM(number_of_completed_gsr) as comp_gsrs,
      SUM(number_of_completed_mbr) as comp_mbrs
    FROM scheme_progress_summary;
  `);
  console.log('scheme_progress_summary completed:', spCompleted.rows[0]);

  process.exit(0);
}

checkExactImageNumbers().catch(console.error);
