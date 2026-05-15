
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function findUnnamed() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('--- scheme_lpcd unnamed ---');
    const lpcd = await client.query("SELECT * FROM scheme_lpcd WHERE scheme_name ILIKE '%unnamed%' OR scheme_id ILIKE '%unnamed%'");
    console.log(lpcd.rows);

    console.log('\n--- water_scheme_data unnamed ---');
    const water = await client.query("SELECT * FROM water_scheme_data WHERE scheme_name ILIKE '%unnamed%' OR village_name ILIKE '%unnamed%' OR scheme_id ILIKE '%unnamed%'");
    console.log(water.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

findUnnamed();
