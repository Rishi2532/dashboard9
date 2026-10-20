import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testPageMetrics() {
  const db = await getDB();

  console.log('--- 1. Testing Project Scope ---');
  // Check scheme_progress_summary or regions table
  const scopeRes = await db.execute(sql`
    SELECT 
      SUM(total_schemes_in_scope) as schemes,
      SUM(total_villages_in_scope) as villages,
      SUM(total_esr_in_scope) as esrs
    FROM scheme_progress_summary
  `);
  console.log('scheme_progress_summary scope:', scopeRes.rows);

  // Check regions table
  const regRes = await db.execute(sql`
    SELECT 
      SUM(total_schemes) as schemes,
      SUM(total_villages) as villages,
      SUM(total_esr) as esrs,
      SUM(total_schemes_integrated) as integrated_schemes,
      SUM(fully_completed_schemes) as fully_schemes,
      SUM(total_villages_integrated) as integrated_villages,
      SUM(fully_completed_villages) as fully_villages,
      SUM(total_esr_integrated) as integrated_esrs,
      SUM(fully_completed_esr) as fully_esrs
    FROM region
  `);
  console.log('region table:', regRes.rows);

  console.log('--- 2. Testing Operational (water_supply = Yes) ---');
  const opRes = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT s.scheme_id) as operational_schemes,
      COUNT(DISTINCT LOWER(TRIM(v.village_name))) as operational_villages,
      COUNT(DISTINCT LOWER(TRIM(COALESCE(c.esr_name, p.esr_name)))) as operational_esrs
    FROM scheme_status s
    LEFT JOIN (
      SELECT DISTINCT scheme_id, village_name FROM water_scheme_data
    ) v ON v.scheme_id = s.scheme_id
    LEFT JOIN (
      SELECT DISTINCT scheme_id, esr_name FROM chlorine_data
    ) c ON c.scheme_id = s.scheme_id
    LEFT JOIN (
      SELECT DISTINCT scheme_id, esr_name FROM pressure_data
    ) p ON p.scheme_id = s.scheme_id
    WHERE s.water_supply = 'Yes'
  `);
  console.log('Operational count:', opRes.rows);

  // Direct check from communication_status or chlorine_data for 324 ESRs
  const esrCount = await db.execute(sql`
    SELECT count(DISTINCT (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))) as esr_cnt
    FROM chlorine_data c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
  `);
  console.log('Chlorine data ESR count:', esrCount.rows);

  process.exit(0);
}

testPageMetrics().catch(console.error);
