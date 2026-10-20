import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function findExactIotNumbers() {
  const db = await getDB();

  // Let's check water_scheme_data distinct villages:
  const wsdVillages = await db.execute(sql`
    SELECT COUNT(DISTINCT (scheme_id, LOWER(TRIM(village_name)))) as cnt
    FROM water_scheme_data;
  `);
  console.log('water_scheme_data distinct (scheme_id, village):', wsdVillages.rows[0]);

  // Let's check communication_status distinct ESRs:
  const csEsrs = await db.execute(sql`
    SELECT COUNT(DISTINCT (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))) as cnt
    FROM communication_status;
  `);
  console.log('communication_status distinct ESRs:', csEsrs.rows[0]);

  // Let's check water_consumption distinct ESRs:
  const wcEsrs = await db.execute(sql`
    SELECT COUNT(DISTINCT (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))) as cnt
    FROM water_consumption;
  `);
  console.log('water_consumption distinct ESRs:', wcEsrs.rows[0]);

  // Check scheme_status with various filters:
  const s1 = await db.execute(sql`
    SELECT 
      SUM(total_villages_integrated) as v_int,
      SUM(fully_completed_villages) as v_fc,
      SUM(total_esr_integrated) as esr_int,
      SUM(no_fully_completed_esr) as esr_fc
    FROM scheme_status
    WHERE active = true OR active IS NULL;
  `);
  console.log('Active scheme_status:', s1.rows[0]);

  // Check consolidated schemes view in database-storage:
  // Storage getConsolidatedSchemesByRegion:
  const s2 = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT scheme_id) as total_schemes,
      COUNT(DISTINCT CASE WHEN TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') THEN scheme_id END) as fully_completed_schemes,
      COUNT(DISTINCT CASE WHEN total_villages_integrated > 0 OR total_esr_integrated > 0 THEN scheme_id END) as integrated_schemes
    FROM (
      SELECT DISTINCT ON (scheme_id) * FROM scheme_status
      ORDER BY scheme_id, sr_no
    ) sub;
  `);
  console.log('Consolidated scheme_status:', s2.rows[0]);

  process.exit(0);
}

findExactIotNumbers().catch(console.error);
