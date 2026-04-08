
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchemes() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const client = await pool.connect();

  const missingIds = [
    '20028573', '20017359', '20028209', '20062295', 
    '20094559', '20010215', '20017250'
  ];

  try {
    console.log('--- Checking Missing Schemes in water_scheme_data ---');
    for (const id of missingIds) {
      const res = await client.query('SELECT scheme_id, scheme_name, region, block FROM water_scheme_data WHERE scheme_id = $1 LIMIT 1', [id]);
      if (res.rows.length > 0) {
        console.log(`ID: ${id} | Name: ${res.rows[0].scheme_name} | Region: ${res.rows[0].region} | Block: ${res.rows[0].block}`);
      } else {
        console.log(`ID: ${id} NOT FOUND in water_scheme_data`);
      }
    }

    console.log('\n--- Checking distinct count in water_scheme_data with fix logic ---');
    const countRes = await client.query(`
      SELECT COUNT(*) FROM (
        SELECT DISTINCT ON (scheme_id) scheme_id 
        FROM water_scheme_data 
        WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
      ) t
    `);
    console.log('Distinct Schemes in water_scheme_data (with fix logic):', countRes.rows[0].count);

    const countResRaw = await client.query(`
      SELECT COUNT(DISTINCT scheme_id) FROM water_scheme_data
    `);
    console.log('Raw Distinct Schemes in water_scheme_data:', countResRaw.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}

checkSchemes();
