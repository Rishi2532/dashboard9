import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchemeStatus() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT scheme_id, scheme_name, water_supply, water_supply_status
      FROM scheme_status
      WHERE scheme_id = '20027951' OR scheme_name ILIKE '%Khambora%'
    `);
    console.log("scheme_status rows:", res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchemeStatus().catch(console.error);
