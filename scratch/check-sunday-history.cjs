const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== Checking all activity on 2026-10-18 ===');

    // 1. email_alert_logs
    const eLogs = await client.query(`
      SELECT count(*) as cnt FROM email_alert_logs WHERE sent_date::date = '2026-10-18'
    `);
    console.log('email_alert_logs on 2026-10-18:', eLogs.rows[0].cnt);

    // 2. consolidated_email_dispatches
    const cLogs = await client.query(`
      SELECT count(*) as cnt FROM consolidated_email_dispatches WHERE dispatch_date = '2026-10-18'
    `);
    console.log('consolidated_email_dispatches on 2026-10-18:', cLogs.rows[0].cnt);

    // 3. sms_alert_logs
    const sLogs = await client.query(`
      SELECT count(*) as cnt FROM sms_alert_logs WHERE sent_date::date = '2026-10-18'
    `);
    console.log('sms_alert_logs on 2026-10-18:', sLogs.rows[0].cnt);

    // 4. Any other tables with created_at on 2026-10-18
    const tables = ['scheme_status', 'daily_regional_statistics', 'mqtt_packet_logs'];
    for (const t of tables) {
      try {
        const r = await client.query(`
          SELECT count(*) as cnt FROM ${t} 
          WHERE created_at >= '2026-10-18 00:00:00' AND created_at < '2026-10-19 00:00:00'
        `);
        console.log(`${t} created_at on 2026-10-18:`, r.rows[0].cnt);
      } catch (err) {
        console.log(`${t}: ${err.message}`);
      }
    }

    // 5. Check all distinct sent_date in email_alert_logs to see if other Sundays had dispatches
    const allDates = await client.query(`
      SELECT sent_date::date as dt, count(*) as count,
             EXTRACT(DOW FROM sent_date::date) as day_of_week
      FROM email_alert_logs
      GROUP BY sent_date::date
      ORDER BY dt DESC
      LIMIT 15
    `);
    console.log('\nPast dispatch dates & day of week (0=Sunday, 1=Monday, 6=Saturday):');
    console.table(allDates.rows);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
