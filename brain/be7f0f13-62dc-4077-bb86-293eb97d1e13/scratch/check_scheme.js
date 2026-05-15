
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkScheme() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('--- scheme_lpcd ---');
    const lpcd = await client.query("SELECT * FROM scheme_lpcd WHERE scheme_id = '20032963'");
    console.log(lpcd.rows);

    console.log('\n--- scheme_status ---');
    const status = await client.query("SELECT * FROM scheme_status WHERE scheme_id = '20032963'");
    console.log(status.rows);

    console.log('\n--- water_scheme_data ---');
    const water = await client.query("SELECT * FROM water_scheme_data WHERE scheme_id = '20032963'");
    console.log(water.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkScheme();
