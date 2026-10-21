import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testOptimized() {
  const db = await getDB();
  
  console.time("Optimized Chlorine Query");
  const res = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    recent_cl AS (
      SELECT 
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
        c.uploaded_at, c.id
      FROM chlorine_history c
      JOIN op_schemes ss ON ss.scheme_id = c.scheme_id
      WHERE c.chlorine_date LIKE '%Oct%' OR c.chlorine_date LIKE '%Sep%'
    ),
    recent_wc AS (
      SELECT 
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      JOIN op_schemes ss ON ss.scheme_id = wc.scheme_id
      WHERE wc.data_date LIKE '%Oct%' OR wc.data_date LIKE '%Sep%'
    )
    SELECT 
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
      wc.water_value
    FROM recent_cl c
    LEFT JOIN recent_wc wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      c.chlorine_date = wc.data_date
    )
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.uploaded_at DESC, c.id DESC;
  `);
  console.timeEnd("Optimized Chlorine Query");
  console.log(`Returned rows: ${res.rows.length}`);

  process.exit(0);
}

testOptimized().catch(console.error);
