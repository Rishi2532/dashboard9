const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT DISTINCT sent_date::text 
    FROM sms_alert_logs 
    ORDER BY sent_date::text DESC;
  `);
  console.log('sms_alert_logs sent_date strings:');
  console.table(res.rows);

  const res2 = await pool.query(`
    SELECT DISTINCT sent_date::text 
    FROM email_alert_logs 
    ORDER BY sent_date::text DESC;
  `);
  console.log('email_alert_logs sent_date strings:');
  console.table(res2.rows);

  pool.end();
}
check();
