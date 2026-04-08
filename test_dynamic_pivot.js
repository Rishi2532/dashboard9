
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT total_population, water_value, lpcd_value FROM scheme_lpcd_data_history WHERE scheme_id = '2003645' AND data_date = '07-Apr'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    pool.end();
  }
}
check();
