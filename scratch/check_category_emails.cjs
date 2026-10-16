const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== In consolidated_email_dispatches for today ===');
    const r1 = await client.query(`
      SELECT 
        COUNT(*) as total_emails_sent,
        COUNT(*) FILTER (WHERE lpcd_alerts_count > 0) as emails_with_lpcd,
        COUNT(*) FILTER (WHERE chlorine_alerts_count > 0) as emails_with_chlorine,
        COUNT(*) FILTER (WHERE pressure_alerts_count > 0) as emails_with_pressure,
        COUNT(*) FILTER (WHERE offline_alerts_count > 0) as emails_with_offline
      FROM consolidated_email_dispatches
      WHERE dispatch_date = CURRENT_DATE
    `);
    console.log(r1.rows[0]);

    console.log('\n=== In email_acknowledgements for today ===');
    const r2 = await client.query(`
      SELECT 
        COUNT(*) as total_ack_records,
        COUNT(DISTINCT engineer_email) as distinct_emails,
        COUNT(DISTINCT engineer_name) as distinct_names,
        COUNT(DISTINCT scheme_id) as distinct_schemes,
        
        COUNT(*) FILTER (WHERE alert_type ILIKE '%lpcd%') as lpcd_acks,
        COUNT(DISTINCT engineer_email) FILTER (WHERE alert_type ILIKE '%lpcd%') as lpcd_officer_emails,
        COUNT(DISTINCT engineer_name) FILTER (WHERE alert_type ILIKE '%lpcd%') as lpcd_officer_names,
        COUNT(DISTINCT scheme_id) FILTER (WHERE alert_type ILIKE '%lpcd%') as lpcd_schemes,
        
        COUNT(*) FILTER (WHERE alert_type ILIKE '%chlorine%') as chlorine_acks,
        COUNT(DISTINCT engineer_email) FILTER (WHERE alert_type ILIKE '%chlorine%') as chlorine_officer_emails,
        COUNT(DISTINCT engineer_name) FILTER (WHERE alert_type ILIKE '%chlorine%') as chlorine_officer_names,
        COUNT(DISTINCT scheme_id) FILTER (WHERE alert_type ILIKE '%chlorine%') as chlorine_schemes,

        COUNT(*) FILTER (WHERE alert_type ILIKE '%pressure%') as pressure_acks,
        COUNT(DISTINCT engineer_email) FILTER (WHERE alert_type ILIKE '%pressure%') as pressure_officer_emails,
        COUNT(DISTINCT engineer_name) FILTER (WHERE alert_type ILIKE '%pressure%') as pressure_officer_names,
        COUNT(DISTINCT scheme_id) FILTER (WHERE alert_type ILIKE '%pressure%') as pressure_schemes,

        COUNT(*) FILTER (WHERE alert_type ILIKE '%offline%') as offline_acks,
        COUNT(DISTINCT engineer_email) FILTER (WHERE alert_type ILIKE '%offline%') as offline_officer_emails,
        COUNT(DISTINCT engineer_name) FILTER (WHERE alert_type ILIKE '%offline%') as offline_officer_names,
        COUNT(DISTINCT scheme_id) FILTER (WHERE alert_type ILIKE '%offline%') as offline_schemes
      FROM email_acknowledgements
      WHERE sent_date = CURRENT_DATE
    `);
    console.log(r2.rows[0]);

    console.log('\n=== In email_alert_logs for today (Total scheme/village alerts logged) ===');
    const r3 = await client.query(`
      SELECT 
        alert_type,
        COUNT(*) as alert_count,
        COUNT(DISTINCT scheme_id) as distinct_schemes,
        COUNT(DISTINCT de_ae_civil_name) as distinct_de_names,
        COUNT(DISTINCT de_ae_civil_email) as distinct_de_emails
      FROM email_alert_logs
      WHERE sent_date = CURRENT_DATE
      GROUP BY alert_type
    `);
    console.table(r3.rows);

  } finally {
    client.release();
    pool.end();
  }
}
run();
