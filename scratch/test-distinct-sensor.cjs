const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const clProg = await client.query(`
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, village_name, esr_name, sent_date) 
               scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
               sent_time, created_at, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')
          AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
          AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
          AND sent_date = '2026-10-19'
        ORDER BY scheme_id, village_name, esr_name, sent_date, created_at DESC
      )
      SELECT COUNT(*) as count FROM recent_logs;
    `);
    console.log('Chlorine with (scheme_id, village_name, esr_name):', clProg.rows[0].count);

    const prProg = await client.query(`
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, village_name, esr_name, sent_date) 
               scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
               sent_time, created_at, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('Pressure', 'Low Pressure')
          AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
          AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
          AND sent_date = '2026-10-19'
        ORDER BY scheme_id, village_name, esr_name, sent_date, created_at DESC
      )
      SELECT COUNT(*) as count FROM recent_logs;
    `);
    console.log('Pressure with (scheme_id, village_name, esr_name):', prProg.rows[0].count);

    const offProg = await client.query(`
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, village_name, esr_name, sent_date) 
               scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
               sent_time, created_at, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('Offline', 'Offline Sensors', 'Sensor Offline')
          AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
          AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
          AND sent_date = '2026-10-19'
        ORDER BY scheme_id, village_name, esr_name, sent_date, created_at DESC
      )
      SELECT COUNT(*) as count FROM recent_logs;
    `);
    console.log('Offline with (scheme_id, village_name, esr_name):', offProg.rows[0].count);

    const lpcdProg = await client.query(`
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, village_name, COALESCE(esr_name, ''), sent_date) 
               scheme_id, scheme_name, region, village_name, ticket_id, alert_value, telemetry_date,
               sent_time, created_at, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('LPCD', 'Low LPCD')
          AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
          AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
          AND sent_date = '2026-10-19'
        ORDER BY scheme_id, village_name, COALESCE(esr_name, ''), sent_date, created_at DESC
      )
      SELECT COUNT(*) as count FROM recent_logs;
    `);
    console.log('LPCD with all villages (not collapsed):', lpcdProg.rows[0].count);

  } finally {
    client.release();
    pool.end();
  }
}
run().catch(console.error);
