import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkIotProgressNumbers() {
  const db = await getDB();

  console.log('--- 1. Check scheme_progress_summary columns ---');
  const spCols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'scheme_progress_summary'
    ORDER BY ordinal_position;
  `);
  console.log(spCols.rows.map(r => r.column_name).join(', '));

  console.log('--- 2. Sums from scheme_progress_summary ---');
  const spSums = await db.execute(sql`
    SELECT 
      COUNT(*) as total_rows,
      COUNT(DISTINCT scheme_id) as total_schemes,
      SUM(number_of_villages) as total_villages,
      SUM(COALESCE(number_of_esr,0) + COALESCE(number_of_gsr,0) + COALESCE(number_of_mbr,0)) as total_esr,
      SUM(total_villages_integrated) as tot_villages_int,
      SUM(fully_completed_villages) as fc_villages,
      SUM(total_esr_integrated) as tot_esr_int,
      SUM(fully_completed_esr) as fc_esr
    FROM scheme_progress_summary;
  `);
  console.log(spSums.rows[0]);

  console.log('--- 3. Check region table ---');
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
  console.log('Region table sums:', regRes.rows[0]);

  console.log('--- 4. Check schemes.tsx cards endpoint (/api/schemes/summary or similar) ---');
  // Check routes for /api/schemes
  const scStatus = await db.execute(sql`
    SELECT 
      COUNT(*) as total_schemes_in_status,
      COUNT(CASE WHEN fully_completion_scheme_status ILIKE '%complete%' THEN 1 END) as fully_completed_schemes,
      SUM(total_villages) as sum_villages,
      SUM(total_esr) as sum_esrs,
      SUM(esr_integrated) as sum_esr_integrated
    FROM scheme_status;
  `);
  console.log('scheme_status sums:', scStatus.rows[0]);

  process.exit(0);
}

checkIotProgressNumbers().catch(console.error);
