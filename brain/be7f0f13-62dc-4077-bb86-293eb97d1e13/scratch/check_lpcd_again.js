
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchemeLpcd() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM scheme_lpcd WHERE scheme_id = '20032963'");
    console.log(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchemeLpcd();
