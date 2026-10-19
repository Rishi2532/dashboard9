const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Check past alerts dates in email_alert_logs
    const datesRes = await client.query(`
      SELECT DISTINCT sent_date::date as dt
      FROM email_alert_logs
      ORDER BY dt DESC
      LIMIT 15
    `);
    console.log('Distinct sent_date in email_alert_logs:', datesRes.rows.map(r => r.dt.toISOString().slice(0, 10)));

    // Let's test getAlertStreak logic directly!
    // How many alerts exist in email_alert_logs on 2026-10-19?
    const todayAlerts = await client.query(`
      SELECT count(*) as cnt, count(DISTINCT scheme_id) as schemes
      FROM email_alert_logs
      WHERE sent_date = '2026-10-19'
    `);
    console.log('email_alert_logs on 2026-10-19:', todayAlerts.rows);

    // Let's check how pastAlertsMap was populated in daily-alerts.ts!
    // In daily-alerts.ts lines 510-545:
    console.log('\n--- Checking past alerts in last 35 days ---');
    const pastRes = await client.query(`
      SELECT scheme_id, alert_type, village_name, esr_name, sent_date
      FROM email_alert_logs
      WHERE sent_date >= '2026-09-01'
      ORDER BY sent_date DESC
      LIMIT 20
    `);
    console.log('Sample past alerts:', pastRes.rows.slice(0, 5));

    // Let's check consecutive days for alerts present on 2026-10-19
    const historyRes = await client.query(`
      SELECT scheme_id, alert_type, count(DISTINCT sent_date::date) as date_count, array_agg(DISTINCT sent_date::date ORDER BY sent_date::date DESC) as dates
      FROM email_alert_logs
      GROUP BY scheme_id, alert_type
      HAVING count(DISTINCT sent_date::date) >= 3
      ORDER BY date_count DESC
      LIMIT 10
    `);
    console.log('\nAlerts with >= 3 days:');
    console.table(historyRes.rows);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
