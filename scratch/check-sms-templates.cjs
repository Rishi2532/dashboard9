const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const templates = await client.query(`
    SELECT template_name, COUNT(*) as cnt 
    FROM sms_alert_logs 
    GROUP BY template_name;
  `);
  console.log("Distinct templates in sms_alert_logs:", templates.rows);

  const engineers = await client.query(`
    SELECT engineer_name, COUNT(*) as cnt 
    FROM sms_alert_logs 
    GROUP BY engineer_name;
  `);
  console.log("Distinct engineers in sms_alert_logs:", engineers.rows);

  await client.end();
}

main().catch(console.error);
