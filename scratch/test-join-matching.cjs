const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Check chlorine_data with water
    const q1 = await client.query(`
      SELECT COUNT(*) as exact_match
      FROM chlorine_data c
      JOIN scheme_status s ON s.scheme_id = c.scheme_id AND s.water_supply = 'Yes'
      JOIN water_consumption wc ON (
        c.scheme_id = wc.scheme_id AND
        LOWER(TRIM(c.village_name)) = LOWER(TRIM(wc.village_name)) AND
        LOWER(TRIM(c.esr_name)) = LOWER(TRIM(wc.esr_name))
      )
      WHERE c.chlorine_value_7 IS NOT NULL
        AND NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
        AND (
          (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
          OR (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) > 0.5
        )
        AND wc.water_value_day7 IS NOT NULL 
        AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
        AND wc.water_value_day7::numeric > 0
    `);
    console.log('Chlorine exact match count:', q1.rows[0].exact_match);

    // What if we join via communication_status?
    // In communication_status: cs.chlorine_connected = 'Connected' AND cs.chlorine_status = 'Online'
    const qCS = await client.query(`
      SELECT COUNT(*) as cs_match
      FROM communication_status cs
      JOIN scheme_status s ON s.scheme_id = cs.scheme_id AND s.water_supply = 'Yes'
      JOIN chlorine_data c ON (
        cs.scheme_id = c.scheme_id AND
        LOWER(TRIM(cs.village_name)) = LOWER(TRIM(c.village_name)) AND
        LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(c.esr_name))
      )
      JOIN water_consumption wc ON (
        cs.scheme_id = wc.scheme_id AND
        LOWER(TRIM(cs.village_name)) = LOWER(TRIM(wc.village_name)) AND
        LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(wc.esr_name))
      )
      WHERE c.chlorine_value_7 IS NOT NULL
        AND NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
        AND (
          (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
          OR (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) > 0.5
        )
        AND wc.water_value_day7 IS NOT NULL 
        AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
        AND wc.water_value_day7::numeric > 0
    `);
    console.log('Chlorine joined via communication_status count:', qCS.rows[0].cs_match);

    // Let's check Pressure
    const qPr = await client.query(`
      SELECT COUNT(*) as exact_match
      FROM pressure_data p
      JOIN scheme_status s ON s.scheme_id = p.scheme_id AND s.water_supply = 'Yes'
      JOIN water_consumption wc ON (
        p.scheme_id = wc.scheme_id AND
        LOWER(TRIM(p.village_name)) = LOWER(TRIM(wc.village_name)) AND
        LOWER(TRIM(p.esr_name)) = LOWER(TRIM(wc.esr_name))
      )
      WHERE p.pressure_value_7 IS NOT NULL
        AND NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
        AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
        AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) >= 0
        AND wc.water_value_day7 IS NOT NULL 
        AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
        AND wc.water_value_day7::numeric > 0
    `);
    console.log('Pressure exact match count:', qPr.rows[0].exact_match);

  } finally {
    client.release();
    pool.end();
  }
}
run().catch(console.error);
