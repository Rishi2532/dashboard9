const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const smsCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sms_alert_logs'
    ORDER BY ordinal_position;
  `);
  console.log("sms_alert_logs columns:", smsCols.rows);

  const emailCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'email_alert_logs'
    ORDER BY ordinal_position;
  `);
  console.log("\nemail_alert_logs columns:", emailCols.rows);

  const recentSms = await client.query(`
    SELECT * FROM sms_alert_logs ORDER BY id DESC LIMIT 3;
  `);
  console.log("\nRecent SMS alerts:", recentSms.rows);

  const recentEmail = await client.query(`
    SELECT * FROM email_alert_logs ORDER BY id DESC LIMIT 3;
  `);
  console.log("\nRecent Email alerts:", recentEmail.rows);

  await client.end();
}

main().catch(console.error);
