import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT region FROM scheme_lpcd_data_history GROUP BY region ORDER BY region');
    res.rows.forEach(r => console.log(r.region));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
