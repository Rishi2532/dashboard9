const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, engineer_name, engineer_email, engineer_role, total_schemes, total_alerts, lpcd_alerts_count, status
      FROM consolidated_email_dispatches
      WHERE dispatch_date = CURRENT_DATE
      ORDER BY id
    `);
    console.log('Total consolidated email dispatch rows today:', res.rows.length);
    res.rows.forEach(r => {
      console.log(`#${r.id} | ${r.engineer_name} | ${r.engineer_email} | ${r.engineer_role} | Schemes: ${r.total_schemes} | LPCD: ${r.lpcd_alerts_count}`);
    });

    // Check distinct engineers
    const distinctEngs = await client.query(`
      SELECT DISTINCT engineer_name, engineer_email, engineer_role
      FROM consolidated_email_dispatches
      WHERE dispatch_date = CURRENT_DATE
    `);
    console.log('\nDistinct engineers in consolidated_email_dispatches:', distinctEngs.rows);

    // Check where else 30 appears
    // What about escalation_portal API?
    // Let's check escalation-routes.ts for Level 1, Level 2, etc.
  } finally {
    client.release();
    pool.end();
  }
}

run();
