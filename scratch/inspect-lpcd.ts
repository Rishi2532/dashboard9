import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Checking water_scheme_data total rows ===');
    const vCount = await client.query('SELECT region, COUNT(*) FROM water_scheme_data GROUP BY region');
    console.log('water_scheme_data by region:', vCount.rows);

    console.log('\n=== Checking water_scheme_data_history date sample ===');
    const hDates = await client.query(
      SELECT data_date, COUNT(*), COUNT(lpcd_value) as non_null_lpcd, 
             COUNT(CASE WHEN NULLIF(TRIM(lpcd_value::text), '') IS NOT NULL AND NULLIF(TRIM(lpcd_value::text), '')::numeric > 0 THEN 1 END) as positive_lpcd
      FROM water_scheme_data_history
      GROUP BY data_date
      ORDER BY data_date DESC
      LIMIT 20
    );
    console.log('water_scheme_data_history recent dates:', hDates.rows);

    console.log('\n=== Checking scheme_lpcd_data_history date sample ===');
    const sDates = await client.query(
      SELECT data_date, COUNT(*), COUNT(lpcd_value) as non_null_lpcd,
             COUNT(CASE WHEN NULLIF(TRIM(lpcd_value::text), '') IS NOT NULL AND NULLIF(TRIM(lpcd_value::text), '')::numeric > 0 THEN 1 END) as positive_lpcd
      FROM scheme_lpcd_data_history
      GROUP BY data_date
      ORDER BY data_date DESC
      LIMIT 20
    );
    console.log('scheme_lpcd_data_history recent dates:', sDates.rows);

    console.log('\n=== Checking date range: 16-Sep to 22-Sep ===');
    const sepCheck = await client.query(
      SELECT 'water_scheme_data_history' as tbl, data_date, COUNT(*), 
             COUNT(CASE WHEN NULLIF(TRIM(lpcd_value::text), '') IS NOT NULL AND NULLIF(TRIM(lpcd_value::text), '')::numeric > 0 THEN 1 END) as positive_lpcd
      FROM water_scheme_data_history
      WHERE data_date ILIKE '%Sep%'
      GROUP BY data_date
      UNION ALL
      SELECT 'scheme_lpcd_data_history' as tbl, data_date, COUNT(*),
             COUNT(CASE WHEN NULLIF(TRIM(lpcd_value::text), '') IS NOT NULL AND NULLIF(TRIM(lpcd_value::text), '')::numeric > 0 THEN 1 END) as positive_lpcd
      FROM scheme_lpcd_data_history
      WHERE data_date ILIKE '%Sep%'
      GROUP BY data_date
      ORDER BY tbl, data_date
    );
    console.log('Sep dates data:', sepCheck.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
