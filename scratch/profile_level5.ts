import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function profileLevel5Queries() {
  const db = await getDB();
  console.time("Level5 9 queries");
  
  const [
    q1, q2, q3, q4, q5, q6, q7, q8, q9
  ] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id)
        scheme_id, scheme_name, region, circle, division, sub_division, block,
        total_villages_integrated, total_esr_integrated,
        fully_completion_scheme_status as status,
        water_supply
      FROM scheme_status
      WHERE (total_villages_integrated > 0 OR total_esr_integrated > 0)
      ORDER BY scheme_id, region, scheme_name
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id)
        scheme_id, scheme_name, region, circle, division, sub_division, block,
        fully_completed_villages, no_fully_completed_esr,
        fully_completion_scheme_status as status,
        water_supply
      FROM scheme_status
      WHERE (TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed', 'connected') OR TRIM(LOWER(mjp_fully_completed)) = 'yes')
      ORDER BY scheme_id, region, scheme_name
    `),
    db.execute(sql`
      SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
        ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
        ws.population, ws.lpcd_value_day7 as lpcd_value, ss.water_supply_status as status
      FROM water_scheme_data ws
      LEFT JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id
      WHERE ws.village_name IS NOT NULL
      ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
        ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
        ws.population, ws.lpcd_value_day7 as lpcd_value, 'Completed' as status
      FROM water_scheme_data ws
      JOIN village v ON v.scheme_id = ws.scheme_id AND LOWER(TRIM(v.village_name)) = LOWER(TRIM(ws.village_name))
      LEFT JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id
      WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
      ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))
        scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block,
        chlorine_connected, pressure_connected, flow_meter_connected,
        overall_status as status
      FROM communication_status
      WHERE esr_name IS NOT NULL AND esr_name != '-'
      ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))
        scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block,
        chlorine_connected, pressure_connected, flow_meter_connected,
        overall_status as status
      FROM communication_status
      WHERE esr_name IS NOT NULL AND esr_name != '-'
        AND LOWER(TRIM(chlorine_connected)) = 'connected'
        AND LOWER(TRIM(pressure_connected)) = 'connected'
        AND LOWER(TRIM(flow_meter_connected)) = 'connected'
      ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id)
        scheme_id, scheme_name, region, circle, division, sub_division, block,
        water_supply as status
      FROM scheme_status
      WHERE water_supply = 'Yes'
      ORDER BY scheme_id, region, scheme_name
    `),
    db.execute(sql`
      SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
        ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
        ws.population, ws.lpcd_value_day7 as lpcd_value, 'Yes' as status
      FROM water_scheme_data ws
      JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes'
      WHERE ws.village_name IS NOT NULL
      ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
        c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.region, c.circle, c.division, c.sub_division, c.block,
        'Yes' as status
      FROM chlorine_data c
      JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
      WHERE c.esr_name IS NOT NULL AND c.esr_name != '-'
      ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name))
    `),
  ]);

  console.timeEnd("Level5 9 queries");
  console.log("Q1-Q9 row counts:", [
    q1.rows.length, q2.rows.length, q3.rows.length, q4.rows.length,
    q5.rows.length, q6.rows.length, q7.rows.length, q8.rows.length, q9.rows.length
  ]);

  process.exit(0);
}

profileLevel5Queries().catch(console.error);
