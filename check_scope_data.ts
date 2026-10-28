import { getDB } from './server/db';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDB();
  
  // 1. Total in scheme_progress_summary
  const spsSum = await db.execute(sql`
    SELECT 
      COUNT(*) as total_schemes,
      SUM(number_of_villages) as sum_villages,
      SUM(number_of_esr) as sum_esr,
      SUM(number_of_gsr) as sum_gsr,
      SUM(number_of_mbr) as sum_mbr,
      SUM(COALESCE(number_of_esr,0) + COALESCE(number_of_gsr,0) + COALESCE(number_of_mbr,0)) as sum_all_reservoirs
    FROM scheme_progress_summary;
  `);
  console.log('1. scheme_progress_summary total sums:');
  console.log(spsSum.rows[0]);

  // 2. Total in scheme_status
  const ssSum = await db.execute(sql`
    SELECT 
      COUNT(*) as total_schemes,
      SUM(number_of_village) as sum_villages,
      SUM(total_number_of_esr) as sum_esr
    FROM scheme_status;
  `);
  console.log('2. scheme_status total sums:');
  console.log(ssSum.rows[0]);

  // 3. Check schemes in scheme_status vs scheme_progress_summary
  const joinCheck = await db.execute(sql`
    SELECT 
      CASE 
        WHEN TRIM(LOWER(ss.water_supply)) = 'yes' THEN 'Fully Completed'
        ELSE 'Partial'
      END as category,
      COUNT(DISTINCT ss.scheme_id) as scheme_count,
      SUM(sps.number_of_villages) as villages_from_sps,
      SUM(ss.number_of_village) as villages_from_ss,
      SUM(sps.number_of_esr) as esr_from_sps,
      SUM(sps.number_of_gsr) as gsr_from_sps,
      SUM(sps.number_of_mbr) as mbr_from_sps,
      SUM(COALESCE(sps.number_of_esr,0) + COALESCE(sps.number_of_gsr,0) + COALESCE(sps.number_of_mbr,0)) as all_res_from_sps,
      SUM(ss.total_number_of_esr) as esr_from_ss
    FROM scheme_status ss
    LEFT JOIN scheme_progress_summary sps ON sps.scheme_id::text = ss.scheme_id
    GROUP BY category;
  `);
  console.log('3. Breakdown by water_supply:');
  console.log(joinCheck.rows);

  // 4. Schemes missing in sps
  const missingInSps = await db.execute(sql`
    SELECT ss.scheme_id, ss.scheme_name, ss.water_supply, ss.number_of_village, ss.total_number_of_esr
    FROM scheme_status ss
    LEFT JOIN scheme_progress_summary sps ON sps.scheme_id::text = ss.scheme_id
    WHERE sps.scheme_id IS NULL;
  `);
  console.log('4. Schemes in scheme_status but not in scheme_progress_summary (count: ' + missingInSps.rows.length + '):');
  console.log(missingInSps.rows);

  // 5. Schemes missing in ss
  const missingInSs = await db.execute(sql`
    SELECT sps.scheme_id, sps.scheme_name, sps.number_of_villages, sps.number_of_esr, sps.number_of_gsr, sps.number_of_mbr
    FROM scheme_progress_summary sps
    LEFT JOIN scheme_status ss ON ss.scheme_id = sps.scheme_id::text
    WHERE ss.scheme_id IS NULL;
  `);
  console.log('5. Schemes in scheme_progress_summary but not in scheme_status (count: ' + missingInSs.rows.length + '):');
  console.log(missingInSs.rows);

  process.exit(0);
}
check();
