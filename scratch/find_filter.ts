import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Check various schemes / filters
    console.log("Checking scheme_status counts...");
    const r1 = await client.query(`SELECT water_supply, count(*) FROM scheme_status GROUP BY water_supply`);
    console.table(r1.rows);

    const r2 = await client.query(`SELECT DISTINCT agency FROM scheme_status`);
    console.log("Agencies:", r2.rows.map(r => r.agency));

    const r3 = await client.query(`SELECT DISTINCT region FROM scheme_status`);
    console.log("Regions in scheme_status:", r3.rows.map(r => r.region));

    // Let's check how many villages per region or agency have data on 2026-10-19
    const r4 = await client.query(`
      SELECT s.region, 
        COUNT(DISTINCT CASE WHEN h.lpcd_value::numeric >= 55 THEN h.scheme_id || '_' || h.village_name END) as above_55,
        COUNT(DISTINCT CASE WHEN h.lpcd_value::numeric > 0 AND h.lpcd_value::numeric < 55 THEN h.scheme_id || '_' || h.village_name END) as below_55,
        COUNT(DISTINCT CASE WHEN h.lpcd_value::numeric = 0 OR h.lpcd_value IS NULL THEN h.scheme_id || '_' || h.village_name END) as no_water
      FROM water_scheme_data_history h
      JOIN scheme_status s ON s.scheme_id = h.scheme_id
      WHERE h.data_date = '2026-10-19'
      GROUP BY s.region
    `);
    console.table(r4.rows);

    // Also check for all regions with water_supply = 'Yes' on 2026-10-19
    const r5 = await client.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN h.lpcd_value::numeric >= 55 THEN h.scheme_id || '_' || h.village_name END) as above_55,
        COUNT(DISTINCT CASE WHEN h.lpcd_value::numeric > 0 AND h.lpcd_value::numeric < 55 THEN h.scheme_id || '_' || h.village_name END) as below_55,
        COUNT(DISTINCT CASE WHEN h.lpcd_value::numeric = 0 OR h.lpcd_value IS NULL THEN h.scheme_id || '_' || h.village_name END) as no_water
      FROM water_scheme_data_history h
      JOIN scheme_status s ON s.scheme_id = h.scheme_id
      WHERE h.data_date = '2026-10-19' AND s.water_supply = 'Yes'
    `);
    console.log("Operational schemes on 2026-10-19:", r5.rows[0]);

  } finally {
    client.release();
    pool.end();
  }
}

run();
