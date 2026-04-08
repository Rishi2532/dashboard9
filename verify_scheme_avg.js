
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT DISTINCT water_date_day7 FROM water_scheme_data WHERE scheme_id = '2003645'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    pool.end();
  }
}
check();
