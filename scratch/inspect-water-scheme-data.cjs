const pg = require('pg');
require('dotenv').config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const sample = await client.query(`SELECT * FROM water_scheme_data LIMIT 3`);
    console.log('Columns in water_scheme_data:', Object.keys(sample.rows[0]));
    console.log('Sample row 1:', sample.rows[0]);

    const nonZero = await client.query(`
      SELECT 
        COUNT(*) as total_villages,
        COUNT(CASE WHEN lpcd_value_day1::numeric > 0 THEN 1 END) as lpcd1_pos,
        COUNT(CASE WHEN lpcd_value_day2::numeric > 0 THEN 1 END) as lpcd2_pos,
        COUNT(CASE WHEN lpcd_value_day3::numeric > 0 THEN 1 END) as lpcd3_pos,
        COUNT(CASE WHEN lpcd_value_day4::numeric > 0 THEN 1 END) as lpcd4_pos,
        COUNT(CASE WHEN lpcd_value_day5::numeric > 0 THEN 1 END) as lpcd5_pos,
        COUNT(CASE WHEN lpcd_value_day6::numeric > 0 THEN 1 END) as lpcd6_pos,
        COUNT(CASE WHEN lpcd_value_day7::numeric > 0 THEN 1 END) as lpcd7_pos,
        COUNT(CASE WHEN water_value_day1::numeric > 0 THEN 1 END) as water1_pos,
        COUNT(CASE WHEN water_value_day7::numeric > 0 THEN 1 END) as water7_pos,
        MIN(lpcd_date_day1) as lpcd_date1,
        MAX(lpcd_date_day7) as lpcd_date7,
        MIN(water_date_day1) as water_date1,
        MAX(water_date_day7) as water_date7
      FROM water_scheme_data;
    `);
    console.log('water_scheme_data summary:', nonZero.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
