import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Get total schemes in scheme_lpcd_data_history in March
    const resCount = await pool.query(`
      SELECT COUNT(DISTINCT scheme_id) as scheme_count, COUNT(*) as record_count 
      FROM scheme_lpcd_data_history 
      WHERE data_date LIKE '%-Mar%' OR data_date LIKE '2026-03-%'
    `);
    console.log("March stats in scheme_lpcd_data_history:", resCount.rows[0]);

    // 2. Print a few sample records from scheme_lpcd_data_history
    const resSample = await pool.query(`
      SELECT scheme_id, scheme_name, data_date, lpcd_value, uploaded_at
      FROM scheme_lpcd_data_history
      WHERE data_date LIKE '%-Mar%' OR data_date LIKE '2026-03-%'
      LIMIT 10
    `);
    console.log("Sample records from scheme_lpcd_data_history:", resSample.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
