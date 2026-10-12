const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const smsTypes = await client.query(`
    SELECT dispatch_type, COUNT(*) as cnt 
    FROM sms_alert_logs 
    GROUP BY dispatch_type;
  `);
  console.log("SMS dispatch_type counts:", smsTypes.rows);

  const emailTypes = await client.query(`
    SELECT dispatch_type, COUNT(*) as cnt 
    FROM email_alert_logs 
    GROUP BY dispatch_type;
  `);
  console.log("Email dispatch_type counts:", emailTypes.rows);

  const smsDates = await client.query(`
    SELECT DATE(created_at) as d, COUNT(*) as cnt 
    FROM sms_alert_logs 
    GROUP BY DATE(created_at) 
    ORDER BY d DESC LIMIT 10;
  `);
  console.log("Recent SMS dispatch dates:", smsDates.rows);

  const emailDates = await client.query(`
    SELECT DATE(created_at) as d, COUNT(*) as cnt 
    FROM email_alert_logs 
    GROUP BY DATE(created_at) 
    ORDER BY d DESC LIMIT 10;
  `);
  console.log("Recent Email dispatch dates:", emailDates.rows);

  await client.end();
}

main().catch(console.error);
