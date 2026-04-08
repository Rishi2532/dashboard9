
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT DISTINCT fully_completion_scheme_status FROM scheme_status');
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    pool.end();
  }
}
check();
