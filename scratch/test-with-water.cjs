const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Operational schemes
    const opSchemesRes = await client.query(`
      SELECT scheme_id, scheme_name FROM scheme_status WHERE water_supply = 'Yes'
    `);
    const opSchemeIds = opSchemesRes.rows.map(r => r.scheme_id);
    console.log(`Operational schemes with water_supply = 'Yes': ${opSchemeIds.length}`);

    // 2. Chlorine data out of range joined with water_consumption
    const clQuery = `
      SELECT 
        c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.chlorine_value_7,
        wc.water_value_day7
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
    `;
    const clRes = await client.query(clQuery);
    console.log(`Chlorine out-of-range WITH WATER sensors count: ${clRes.rows.length}`);
    console.log(`Unique (scheme_id, village_name, esr_name): ${new Set(clRes.rows.map(r => `${r.scheme_id}__${r.village_name}__${r.esr_name}`)).size}`);
    console.log(`Unique schemes: ${new Set(clRes.rows.map(r => r.scheme_id)).size}`);

    // 3. Pressure data out of range joined with water_consumption
    const prQuery = `
      SELECT 
        p.scheme_id, p.scheme_name, p.village_name, p.esr_name, p.pressure_value_7,
        wc.water_value_day7
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
    `;
    const prRes = await client.query(prQuery);
    console.log(`Pressure low (< 0.2 Bar) WITH WATER sensors count: ${prRes.rows.length}`);
    console.log(`Unique (scheme_id, village_name, esr_name): ${new Set(prRes.rows.map(r => `${r.scheme_id}__${r.village_name}__${r.esr_name}`)).size}`);
    console.log(`Unique schemes: ${new Set(prRes.rows.map(r => r.scheme_id)).size}`);

  } finally {
    client.release();
    pool.end();
  }
}
run().catch(console.error);
