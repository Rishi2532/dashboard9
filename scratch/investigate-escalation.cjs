const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== email_alert_logs count by sent_date ===');
    const logs = await client.query(`
      SELECT sent_date, count(*) as alert_count, count(DISTINCT scheme_id) as scheme_count
      FROM email_alert_logs
      GROUP BY sent_date
      ORDER BY sent_date DESC
      LIMIT 10
    `);
    console.table(logs.rows);

    console.log('\n=== consolidated_email_dispatches count by dispatch_date & role ===');
    const disps = await client.query(`
      SELECT dispatch_date, engineer_role, count(*) as email_count, sum(total_alerts) as sum_alerts
      FROM consolidated_email_dispatches
      GROUP BY dispatch_date, engineer_role
      ORDER BY dispatch_date DESC, engineer_role
      LIMIT 15
    `);
    console.table(disps.rows);

    console.log('\n=== Today (2026-10-19) distinct engineer roles dispatched ===');
    const todayDisps = await client.query(`
      SELECT *
      FROM consolidated_email_dispatches
      WHERE dispatch_date = '2026-10-19'
    `);
    console.log(`Dispatches on 2026-10-19: ${todayDisps.rows.length}`);
    if (todayDisps.rows.length > 0) {
      console.log('Roles:', todayDisps.rows.map(r => r.engineer_role).slice(0, 5));
    }

    console.log('\n=== 2026-10-17 EE dispatches ===');
    const ee17 = await client.query(`
      SELECT id, dispatch_date, engineer_name, engineer_role, scheme_ids, scheme_names, total_alerts
      FROM consolidated_email_dispatches
      WHERE dispatch_date = '2026-10-17' AND engineer_role ILIKE '%EE%'
      ORDER BY id
    `);
    console.table(ee17.rows);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
