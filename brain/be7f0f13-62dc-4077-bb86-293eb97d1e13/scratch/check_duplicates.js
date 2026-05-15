
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkDuplicates() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT scheme_id, COUNT(DISTINCT block) FROM scheme_status GROUP BY scheme_id HAVING COUNT(DISTINCT block) > 1');
    console.log(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDuplicates();
