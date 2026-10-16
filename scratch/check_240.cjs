const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const today = '2026-10-16';
    console.log('--- Checking email_alert_logs for today (2026-10-16) ---');
    const logsRes = await client.query('SELECT COUNT(*)::int as count FROM email_alert_logs WHERE sent_date = $1', [today]);
    console.log('email_alert_logs count today:', logsRes.rows[0].count);

    const logsByDispatchType = await client.query('SELECT dispatch_type, COUNT(*)::int as count FROM email_alert_logs WHERE sent_date = $1 GROUP BY dispatch_type', [today]);
    console.log('email_alert_logs by dispatch_type:', logsByDispatchType.rows);

    const logsByAlert = await client.query('SELECT alert_type, COUNT(*)::int as count FROM email_alert_logs WHERE sent_date = $1 GROUP BY alert_type', [today]);
    console.log('email_alert_logs by alert_type:', logsByAlert.rows);

    const distinctTickets = await client.query('SELECT COUNT(DISTINCT ticket_id)::int as count FROM email_alert_logs WHERE sent_date = $1', [today]);
    console.log('distinct ticket_ids in email_alert_logs today:', distinctTickets.rows[0].count);

    console.log('--- Checking email_acknowledgements for today ---');
    const ackRes = await client.query('SELECT COUNT(*)::int as count, COUNT(DISTINCT engineer_email)::int as emails_count, COUNT(DISTINCT token)::int as tokens_count FROM email_acknowledgements WHERE sent_date = $1', [today]);
    console.log('email_acknowledgements today:', ackRes.rows[0]);

    console.log('--- Checking consolidated_email_dispatches for today ---');
    const dispatchesRes = await client.query('SELECT * FROM consolidated_email_dispatches WHERE dispatch_date = $1', [today]);
    console.log('consolidated_email_dispatches count today:', dispatchesRes.rows.length);
    if (dispatchesRes.rows.length > 0) {
      console.log('Sample dispatches:', dispatchesRes.rows);
    }

    console.log('--- Checking total created_at today in email_alert_logs ---');
    const logsCreatedAt = await client.query("SELECT COUNT(*)::int as count FROM email_alert_logs WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date");
    console.log('email_alert_logs created_at today count:', logsCreatedAt.rows[0].count);

    console.log('--- Checking where 240 comes from in all tables ---');
    const allTables = ['email_alert_logs', 'email_acknowledgements', 'consolidated_email_dispatches', 'sms_alert_logs'];
    for (const t of allTables) {
      const r = await client.query(`SELECT COUNT(*)::int as count FROM ${t}`);
      console.log(`Total rows in ${t}:`, r.rows[0].count);
    }

    const testSentAlerts = await client.query(`
      SELECT COUNT(*) as total_alerts,
             COUNT(*) FILTER (WHERE channel = 'email') as email_count,
             COUNT(*) FILTER (WHERE channel = 'sms') as sms_count
      FROM (
        SELECT 'email' as channel FROM email_alert_logs WHERE sent_date = $1
      ) c
    `, [today]);
    console.log('test count:', testSentAlerts.rows[0]);

  } finally {
    client.release();
    pool.end();
  }
}

check().catch(console.error);
