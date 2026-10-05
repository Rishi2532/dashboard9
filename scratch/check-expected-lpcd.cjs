const pg = require('pg');
require('dotenv').config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Check water_scheme_data table values for days 1-7
    const result = await client.query(`
      WITH village_lpcd AS (
        SELECT 
          region,
          scheme_id,
          village_name,
          block,
          (
            COALESCE(lpcd_value_day1, 0) +
            COALESCE(lpcd_value_day2, 0) +
            COALESCE(lpcd_value_day3, 0) +
            COALESCE(lpcd_value_day4, 0) +
            COALESCE(lpcd_value_day5, 0) +
            COALESCE(lpcd_value_day6, 0) +
            COALESCE(lpcd_value_day7, 0)
          ) / 7.0 as avg_lpcd
        FROM water_scheme_data
      )
      SELECT 
        region,
        COUNT(CASE WHEN avg_lpcd >= 55 THEN 1 END) as above_55,
        COUNT(CASE WHEN avg_lpcd < 55 AND avg_lpcd > 0 THEN 1 END) as below_55,
        COUNT(CASE WHEN avg_lpcd = 0 THEN 1 END) as no_water,
        COUNT(*) as total
      FROM village_lpcd
      GROUP BY region
      ORDER BY region;
    `);

    console.log('Expected Village Weekly Stats based on water_scheme_data:');
    console.table(result.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
