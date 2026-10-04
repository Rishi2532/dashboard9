import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectScheme() {
  const client = await pool.connect();
  try {
    const statusRes = await client.query(`
      SELECT scheme_id, scheme_name, water_supply 
      FROM scheme_statuses 
      WHERE scheme_id = '20027951' OR scheme_name ILIKE '%Khambora%'
    `);
    console.log("scheme_statuses:", statusRes.rows);

    const engRes = await client.query(`
      SELECT scheme_id, scheme, ee_civil_name, ee_civil_mobile, ee_civil_email
      FROM scheme_engineer_details
      WHERE scheme_id = '20027951' OR scheme ILIKE '%Khambora%'
    `);
    console.log("scheme_engineer_details:", engRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

inspectScheme().catch(console.error);
