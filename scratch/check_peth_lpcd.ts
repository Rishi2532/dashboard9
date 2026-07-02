import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res1 = await pool.query(`
      SELECT scheme_id, scheme_name, village_name, data_date, lpcd_value 
      FROM water_scheme_data_history 
      WHERE scheme_id = '20022133' AND (data_date = '03-Mar' OR data_date = '03-Mar-26')
    `);
    console.log("water_scheme_data_history (village-level):", res1.rows);

    const res2 = await pool.query(`
      SELECT scheme_id, scheme_name, data_date, lpcd_value 
      FROM scheme_lpcd_data_history 
      WHERE scheme_id = '20022133' AND (data_date = '03-Mar' OR data_date = '03-Mar-26')
    `);
    console.log("scheme_lpcd_data_history (scheme-level):", res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
