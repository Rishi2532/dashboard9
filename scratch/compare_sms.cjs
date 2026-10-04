const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  // Let's inspect the earliest SMS at ~05:15:11 (daily alerts)
  const dailySms = await pool.query(`
    SELECT id, scheme_id, mobile, engineer_name, template_name, template_id, message_text, created_at, gateway_status, is_success
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE AND created_at <= '2026-10-04T05:20:00.000Z'
    ORDER BY created_at ASC
    LIMIT 10
  `);
  console.log('Daily alert SMS (at ~05:15):');
  console.log(dailySms.rows);

  // Let's inspect realtime alert SMS (after 05:30Z)
  const realtimeSms = await pool.query(`
    SELECT id, scheme_id, mobile, engineer_name, template_name, template_id, message_text, created_at, gateway_status, is_success
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE AND created_at > '2026-10-04T06:00:00.000Z'
    ORDER BY created_at ASC
    LIMIT 5
  `);
  console.log('Realtime alert SMS:');
  console.log(realtimeSms.rows);

  // What columns exist in sms_alert_logs?
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sms_alert_logs'
  `);
  console.log('sms_alert_logs columns:');
  console.table(cols.rows);

  await pool.end();
}

main().catch(console.error);
