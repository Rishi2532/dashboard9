const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const smsStats = await client.query(`
    SELECT 
      scheme_id,
      COUNT(*) FILTER (WHERE engineer_name ILIKE '%Akshay Bhojane%') as de_sms_count,
      COUNT(*) FILTER (WHERE engineer_name ILIKE '%Rishikesh Salunke%') as ee_sms_count,
      COUNT(*) FILTER (WHERE engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Rishikesh Salunkhe%') as ce_se_sms_count,
      COUNT(*) as total_sms_count,
      MAX(created_at) as last_sms_sent
    FROM sms_alert_logs
    GROUP BY scheme_id;
  `);
  console.log("SMS notification stats by scheme:", smsStats.rows);

  const emailStats = await client.query(`
    SELECT 
      scheme_id,
      COUNT(*) as total_email_count,
      MAX(created_at) as last_email_sent
    FROM email_alert_logs
    GROUP BY scheme_id;
  `);
  console.log("Email notification stats by scheme:", emailStats.rows);

  await client.end();
}

run().catch(console.error);
