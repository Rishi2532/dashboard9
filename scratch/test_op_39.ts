import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDB();

  const schemesRes: any = await db.execute(sql`
    SELECT DISTINCT ON (scheme_id)
      scheme_id, scheme_name, region, circle, division, sub_division, block,
      water_supply as status
    FROM scheme_status
    WHERE water_supply = 'Yes'
      AND (total_villages_integrated > 0 OR total_esr_integrated > 0)
    ORDER BY scheme_id, region, scheme_name
  `);
  console.log("Operational schemes count:", schemesRes.rows.length);

  const vilRes: any = await db.execute(sql`
    SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
      ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
      ws.population, ws.lpcd_value_day7 as lpcd_value, 'Yes' as status
    FROM water_scheme_data ws
    JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id 
      AND ss.water_supply = 'Yes' 
      AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
    WHERE ws.village_name IS NOT NULL
    ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
  `);
  console.log("Operational villages count:", vilRes.rows.length);

  const esrRes: any = await db.execute(sql`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
      c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.region, c.circle, c.division, c.sub_division, c.block,
      'Yes' as status
    FROM chlorine_data c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id 
      AND ss.water_supply = 'Yes' 
      AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
    WHERE c.esr_name IS NOT NULL AND c.esr_name != '-'
    ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name))
  `);
  console.log("Operational ESR count:", esrRes.rows.length);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
