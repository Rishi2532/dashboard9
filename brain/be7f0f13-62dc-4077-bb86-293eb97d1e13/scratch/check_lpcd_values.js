
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkLpcdValues() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT lpcd_value, count(*) FROM scheme_lpcd_data_history GROUP BY lpcd_value ORDER BY count(*) DESC LIMIT 10');
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkLpcdValues();
