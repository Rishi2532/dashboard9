const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, dispatch_date, created_at, engineer_role, scheme_ids 
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17' AND engineer_role ILIKE '%EE%'
    `);
    console.log('Count:', res.rows.length);
    console.table(res.rows.map(x => ({ id: x.id, c_at: x.created_at, d_dt: x.dispatch_date, scheme: x.scheme_ids })));
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
