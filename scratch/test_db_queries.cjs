const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const dateFilter = "sent_date >= CURRENT_DATE - INTERVAL '1 day'";

    console.log("Testing LPCD query...");
    const qLpcd = `
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, village_name, sent_date) 
               scheme_id, village_name, ticket_id, alert_value, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('LPCD', 'Low LPCD') AND ${dateFilter}
        ORDER BY scheme_id, village_name, sent_date, created_at DESC
      ),
      deduped_sms AS (
        SELECT DISTINCT ON (scheme_id, mobile, sent_date)
               id, mobile, engineer_name, engineer_email, template_name, template_id,
               message_text, gateway_status, is_success, sent_date, created_at, scheme_id
        FROM sms_alert_logs
        WHERE (template_name ILIKE '%LPCD%' OR template_name IS NULL) AND ${dateFilter}
        ORDER BY scheme_id, mobile, sent_date, created_at DESC
      ),
      sms_status AS (
        SELECT scheme_id, sent_date,
               json_agg(json_build_object('mobile', mobile, 'name', engineer_name)) as sms_dispatches
        FROM deduped_sms
        GROUP BY scheme_id, sent_date
      )
      SELECT w.scheme_id, w.village_name, e.alert_value, sms.sms_dispatches
      FROM water_scheme_data w
      JOIN recent_logs e ON w.scheme_id = e.scheme_id AND w.village_name IS NOT DISTINCT FROM e.village_name
      LEFT JOIN sms_status sms ON (w.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
      LIMIT 10;
    `;
    const resLpcd = await client.query(qLpcd);
    console.log(`LPCD: Found ${resLpcd.rows.length} rows. SMS count on first row: ${resLpcd.rows[0]?.sms_dispatches?.length || 0}`);

    console.log("Testing Chlorine query...");
    const qChl = `
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, esr_name, sent_date) 
               scheme_id, esr_name, ticket_id, alert_value, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine') AND ${dateFilter}
        ORDER BY scheme_id, esr_name, sent_date, created_at DESC
      ),
      deduped_sms AS (
        SELECT DISTINCT ON (scheme_id, mobile, sent_date)
               id, mobile, engineer_name, engineer_email, template_name, template_id,
               message_text, gateway_status, is_success, sent_date, created_at, scheme_id
        FROM sms_alert_logs
        WHERE (template_name ILIKE '%Chlorine%' AND template_name NOT ILIKE '%Offline%') AND ${dateFilter}
        ORDER BY scheme_id, mobile, sent_date, created_at DESC
      ),
      sms_status AS (
        SELECT scheme_id, sent_date,
               json_agg(json_build_object('mobile', mobile, 'name', engineer_name)) as sms_dispatches
        FROM deduped_sms
        GROUP BY scheme_id, sent_date
      )
      SELECT c.scheme_id, c.esr_name, e.alert_value, sms.sms_dispatches
      FROM chlorine_data c
      JOIN recent_logs e ON c.scheme_id = e.scheme_id AND c.esr_name IS NOT DISTINCT FROM e.esr_name
      LEFT JOIN sms_status sms ON (c.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
      LIMIT 10;
    `;
    const resChl = await client.query(qChl);
    console.log(`Chlorine: Found ${resChl.rows.length} rows. SMS count on first row: ${resChl.rows[0]?.sms_dispatches?.length || 0}`);

    console.log("Testing Pressure query...");
    const qPres = `
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, esr_name, sent_date) 
               scheme_id, esr_name, ticket_id, alert_value, sent_date
        FROM email_alert_logs
        WHERE alert_type IN ('Pressure', 'Low Pressure') AND ${dateFilter}
        ORDER BY scheme_id, esr_name, sent_date, created_at DESC
      ),
      deduped_sms AS (
        SELECT DISTINCT ON (scheme_id, mobile, sent_date)
               id, mobile, engineer_name, engineer_email, template_name, template_id,
               message_text, gateway_status, is_success, sent_date, created_at, scheme_id
        FROM sms_alert_logs
        WHERE (template_name ILIKE '%Pressure%' AND template_name NOT ILIKE '%Offline%') AND ${dateFilter}
        ORDER BY scheme_id, mobile, sent_date, created_at DESC
      ),
      sms_status AS (
        SELECT scheme_id, sent_date,
               json_agg(json_build_object('mobile', mobile, 'name', engineer_name)) as sms_dispatches
        FROM deduped_sms
        GROUP BY scheme_id, sent_date
      )
      SELECT p.scheme_id, p.esr_name, e.alert_value, sms.sms_dispatches
      FROM pressure_data p
      JOIN recent_logs e ON p.scheme_id = e.scheme_id AND p.esr_name IS NOT DISTINCT FROM e.esr_name
      LEFT JOIN sms_status sms ON (p.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
      LIMIT 10;
    `;
    const resPres = await client.query(qPres);
    console.log(`Pressure: Found ${resPres.rows.length} rows. SMS count on first row: ${resPres.rows[0]?.sms_dispatches?.length || 0}`);

    console.log("Testing Offline query...");
    const qOff = `
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, sent_date)
               scheme_id, ticket_id, alert_value, created_at, sent_date
        FROM email_alert_logs
        WHERE alert_type ILIKE '%Offline%' AND ${dateFilter}
        ORDER BY scheme_id, sent_date, created_at DESC
      ),
      deduped_sms AS (
        SELECT DISTINCT ON (scheme_id, mobile, sent_date)
               id, mobile, engineer_name, engineer_email, template_name, template_id,
               message_text, gateway_status, is_success, sent_date, created_at, scheme_id
        FROM sms_alert_logs
        WHERE (template_name ILIKE '%Offline%' OR template_name IS NULL) AND ${dateFilter}
        ORDER BY scheme_id, mobile, sent_date, created_at DESC
      ),
      sms_status AS (
        SELECT scheme_id, sent_date,
               json_agg(json_build_object('mobile', mobile, 'name', engineer_name)) as sms_dispatches
        FROM deduped_sms
        GROUP BY scheme_id, sent_date
      )
      SELECT c.scheme_id, c.esr_name, sms.sms_dispatches
      FROM communication_status c
      JOIN recent_logs e ON c.scheme_id = e.scheme_id
      LEFT JOIN sms_status sms ON (c.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
      LIMIT 10;
    `;
    const resOff = await client.query(qOff);
    console.log(`Offline: Found ${resOff.rows.length} rows. SMS count on first row: ${resOff.rows[0]?.sms_dispatches?.length || 0}`);

    console.log("ALL QUERIES PASSED PERFECTLY!");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
