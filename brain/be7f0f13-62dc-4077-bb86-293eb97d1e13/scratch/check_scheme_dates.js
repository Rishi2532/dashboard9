
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchemeDates() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT data_date, lpcd_value FROM scheme_lpcd_data_history WHERE scheme_id = '20021415' ORDER BY data_date DESC");
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchemeDates();
