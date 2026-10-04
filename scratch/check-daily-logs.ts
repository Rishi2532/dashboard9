import dotenv from "dotenv";
dotenv.config();
import { setupDatabase } from "../server/setup-db";

async function run() {
  const { pool } = setupDatabase();
  const client = await pool.connect();
  try {
    console.log("=== CHECKING EMAIL ALERT LOGS (DAILY vs REALTIME) ===");
    const emailRes = await client.query(`
      SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL THEN 1 END) as daily_emails,
        COUNT(CASE WHEN ticket_id LIKE 'TKT-RT-%' THEN 1 END) as realtime_emails
      FROM email_alert_logs;
    `);
    console.table(emailRes.rows);

    const emailSample = await client.query(`
      SELECT id, scheme_id, scheme_name, village_name, esr_name, alert_type, alert_value, ticket_id, sent_date, sent_time,
             ee_civil_name, de_ae_civil_name, se_name
      FROM email_alert_logs
      WHERE ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL
      ORDER BY id DESC
      LIMIT 5;
    `);
    console.log("Daily email samples:");
    console.table(emailSample.rows);

    console.log("\n=== CHECKING SMS ALERT LOGS (DAILY vs REALTIME) ===");
    const smsRes = await client.query(`
      SELECT 
        COUNT(*) as total_sms,
        COUNT(CASE WHEN template_name NOT IN ('Residual Chlorine Sensor Offline', 'Residual Chlorine – Low', 'Flow Meter Sensor Offline', 'Pressure Sensor Offline') THEN 1 END) as daily_sms,
        COUNT(CASE WHEN template_name IN ('Residual Chlorine Sensor Offline', 'Residual Chlorine – Low', 'Flow Meter Sensor Offline', 'Pressure Sensor Offline') THEN 1 END) as realtime_sms
      FROM sms_alert_logs;
    `);
    console.table(smsRes.rows);

    const smsSample = await client.query(`
      SELECT id, mobile, engineer_name, engineer_email, scheme_id, scheme_name, template_name, message_text, is_success, created_at
      FROM sms_alert_logs
      ORDER BY id DESC
      LIMIT 5;
    `);
    console.log("SMS samples:");
    console.table(smsSample.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
