const pg = require('pg');
require('dotenv').config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Checking water_scheme_data total rows ===');
    const vCount = await client.query('SELECT region, COUNT(*) FROM water_scheme_data GROUP BY region');
    console.log('water_scheme_data by region:', vCount.rows);

    console.log('\n=== Checking water_scheme_data_history date sample ===');
    const hDates = await client.query(`
      SELECT data_date, COUNT(*) as total, 
             COUNT(CASE WHEN lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '' AND TRIM(lpcd_value::text) != '0' THEN 1 END) as positive_lpcd
      FROM water_scheme_data_history
      GROUP BY data_date
      ORDER BY total DESC
      LIMIT 20
    `);
    console.log('water_scheme_data_history top dates:', hDates.rows);

    console.log('\n=== Checking scheme_lpcd_data_history date sample ===');
    const sDates = await client.query(`
      SELECT data_date, COUNT(*) as total,
             COUNT(CASE WHEN lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '' AND TRIM(lpcd_value::text) != '0' THEN 1 END) as positive_lpcd
      FROM scheme_lpcd_data_history
      GROUP BY data_date
      ORDER BY total DESC
      LIMIT 20
    `);
    console.log('scheme_lpcd_data_history top dates:', sDates.rows);

    console.log('\n=== Checking Sep / Recent dates across both tables ===');
    const sepCheck = await client.query(`
      SELECT 'water_scheme_data_history' as tbl, data_date, COUNT(*) as cnt
      FROM water_scheme_data_history
      GROUP BY data_date
      ORDER BY data_date DESC
      LIMIT 15
    `);
    console.log('water_scheme_data_history dates:', sepCheck.rows);

    const sepScheme = await client.query(`
      SELECT 'scheme_lpcd_data_history' as tbl, data_date, COUNT(*) as cnt
      FROM scheme_lpcd_data_history
      GROUP BY data_date
      ORDER BY data_date DESC
      LIMIT 15
    `);
    console.log('scheme_lpcd_data_history dates:', sepScheme.rows);

    console.log('\n=== Checking sample rows in water_scheme_data_history ===');
    const sampleH = await client.query(`
      SELECT * FROM water_scheme_data_history ORDER BY id DESC LIMIT 5
    `);
    console.log('sample rows in water_scheme_data_history:', sampleH.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
