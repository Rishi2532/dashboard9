const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT engineer_name, total_schemes, scheme_names, lpcd_alerts_count, total_alerts
      FROM consolidated_email_dispatches
      WHERE dispatch_date = CURRENT_DATE
      ORDER BY total_schemes DESC, engineer_name ASC
    `);
    console.log('--- Breakdown of the 30 Engineers & their Schemes ---');
    let multiSchemeEngineers = [];
    res.rows.forEach(r => {
      if (r.total_schemes > 1) {
        multiSchemeEngineers.push(r);
      }
      console.log(`• ${r.engineer_name.padEnd(28)} : ${r.total_schemes} scheme(s) | ${r.lpcd_alerts_count} LPCD alerts | Schemes: ${JSON.stringify(r.scheme_names)}`);
    });
    console.log('\nEngineers managing MORE than 1 scheme:');
    multiSchemeEngineers.forEach(m => console.log(`  -> ${m.engineer_name}: ${m.total_schemes} schemes: ${JSON.stringify(m.scheme_names)}`));

  } finally {
    client.release();
    pool.end();
  }
}

run();
