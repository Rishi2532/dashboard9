const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkLatest() {
  const client = await pool.connect();
  try {
    console.log('=== LATEST 20 SMS ALERT LOGS ===');
    const sms = await client.query(`
      SELECT id, mobile, engineer_name, template_name, scheme_id, sent_date, dispatch_type, created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist
      FROM sms_alert_logs
      ORDER BY id DESC
      LIMIT 20;
    `);
    console.table(sms.rows);

    console.log('\n=== LATEST 20 EMAIL ALERT LOGS ===');
    const email = await client.query(`
      SELECT id, scheme_id, scheme_name, village_name, esr_name, alert_type, sent_date, sent_time, dispatch_type, created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist
      FROM email_alert_logs
      ORDER BY id DESC
      LIMIT 20;
    `);
    console.table(email.rows);

    console.log('\n=== COUNT BY SENT_DATE IN SMS_ALERT_LOGS ===');
    const smsDates = await client.query(`
      SELECT sent_date, count(*) 
      FROM sms_alert_logs 
      GROUP BY sent_date 
      ORDER BY sent_date DESC 
      LIMIT 10;
    `);
    console.table(smsDates.rows);

    console.log('\n=== COUNT BY SENT_DATE IN EMAIL_ALERT_LOGS ===');
    const emailDates = await client.query(`
      SELECT sent_date, count(*) 
      FROM email_alert_logs 
      GROUP BY sent_date 
      ORDER BY sent_date DESC 
      LIMIT 10;
    `);
    console.table(emailDates.rows);

  } finally {
    client.release();
    await pool.end();
  }
}
checkLatest();
