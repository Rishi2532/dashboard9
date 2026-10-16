const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const today = '2026-10-16';

    // 1. Keep only the latest single dispatch run (sent_time = '19:34:40') in consolidated_email_dispatches
    const delDispatches = await client.query(`
      DELETE FROM consolidated_email_dispatches 
      WHERE dispatch_date = $1 
        AND sent_time != '19:34:40'
    `, [today]);
    console.log('Removed duplicate consolidated_email_dispatches:', delDispatches.rowCount);

    const remainingDispatches = await client.query(`
      SELECT COUNT(*)::int as count, COUNT(DISTINCT engineer_name)::int as officers 
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = $1
    `, [today]);
    console.log('Remaining dispatches today:', remainingDispatches.rows[0]);

    // 2. In email_acknowledgements, keep only tokens belonging to the remaining dispatches
    const delAcks = await client.query(`
      DELETE FROM email_acknowledgements
      WHERE sent_date = $1
        AND token NOT IN (
          SELECT master_token FROM consolidated_email_dispatches WHERE dispatch_date = $1
        )
        -- Also keep item tokens associated with schemes in the remaining run
    `, [today]);
    console.log('Cleaned up redundant acknowledgements:', delAcks.rowCount);

    // 3. In email_alert_logs, keep only the latest batch of alerts created around 19:34
    // Check how many alerts were created at the latest run
    const latestCreatedRes = await client.query(`
      SELECT MAX(created_at) as max_created FROM email_alert_logs WHERE sent_date = $1
    `, [today]);
    const maxCreated = latestCreatedRes.rows[0].max_created;
    console.log('Max created_at in email_alert_logs:', maxCreated);

    const delLogs = await client.query(`
      DELETE FROM email_alert_logs
      WHERE sent_date = $1
        AND created_at < ($2::timestamptz - INTERVAL '3 minutes')
    `, [today, maxCreated]);
    console.log('Removed duplicate alert logs:', delLogs.rowCount);

    const remainingLogs = await client.query(`
      SELECT COUNT(*)::int as count FROM email_alert_logs WHERE sent_date = $1
    `, [today]);
    console.log('Remaining alert logs today:', remainingLogs.rows[0]);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
