const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const lpcdSms = await pool.query(`
    SELECT template_name, count(*) as count, count(distinct mobile) as unique_mobiles, count(distinct scheme_id) as unique_schemes
    FROM sms_alert_logs
    WHERE sent_date = '2026-10-04'
    GROUP BY template_name;
  `);
  console.log('Today (2026-10-04) SMS by template:');
  console.table(lpcdSms.rows);

  pool.end();
}
check();
