import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testAllTableMetrics() {
  const db = await getDB();

  console.log('--- 1. PROJECT SCOPE ---');
  // Overall
  const scopeAll = await db.execute(sql`
    SELECT
      COUNT(DISTINCT scheme_id) AS total_schemes,
      COALESCE(SUM(number_of_villages), 0) AS total_villages,
      COALESCE(SUM(COALESCE(number_of_esr,0) + COALESCE(number_of_gsr,0) + COALESCE(number_of_mbr,0)), 0) AS total_esr
    FROM scheme_progress_summary;
  `);
  console.log('Scope All:', scopeAll.rows[0]);

  console.log('--- 2. IOT PROGRESS ---');
  // Check schemes integrated & fully completed
  // Total Integrated Schemes: schemes with any integration in scheme_status
  // Fully Integrated Schemes: fully completed schemes
  // Total Integrated Villages: 2249 (from water_scheme_data or scheme_status)
  // Fully Integrated Villages: 1271 (from scheme_status)
  // Total Integrated ESRs: 3018 (from scheme_status or communication_status)
  // Fully Integrated ESRs: 2249 (from scheme_status)

  // Let's inspect scheme_status:
  const ssTotal = await db.execute(sql`
    SELECT
      -- Schemes
      COUNT(DISTINCT CASE WHEN total_villages_integrated > 0 OR total_esr_integrated > 0 THEN scheme_id END) as schemes_integrated,
      COUNT(DISTINCT CASE WHEN TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') THEN scheme_id END) as schemes_fully_completed,
      
      -- Villages from scheme_status
      SUM(total_villages_integrated) as villages_integrated_sum,
      SUM(fully_completed_villages) as villages_fully_completed_sum,
      
      -- ESRs from scheme_status
      SUM(total_esr_integrated) as esr_integrated_sum,
      SUM(no_fully_completed_esr) as esr_fully_completed_sum
    FROM scheme_status;
  `);
  console.log('scheme_status metrics:', ssTotal.rows[0]);

  console.log('--- 3. OPERATIONAL (water_supply = Yes) ---');
  const opRes = await db.execute(sql`
    SELECT
      COUNT(DISTINCT scheme_id) as operational_schemes,
      COUNT(DISTINCT (scheme_id, LOWER(TRIM(village_name)))) as operational_villages,
      COUNT(DISTINCT (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))) as operational_esrs
    FROM (
      SELECT ws.scheme_id, ws.village_name, NULL as esr_name
      FROM water_scheme_data ws
      JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes'
    ) v;
  `);
  console.log('Operational schemes & villages:', opRes.rows[0]);

  const opEsr = await db.execute(sql`
    SELECT COUNT(DISTINCT (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))) as operational_esrs
    FROM chlorine_data c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes';
  `);
  console.log('Operational ESRs:', opEsr.rows[0]);

  process.exit(0);
}

testAllTableMetrics().catch(console.error);
