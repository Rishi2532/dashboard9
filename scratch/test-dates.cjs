const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT 
      (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date::text as ist_date_str,
      CURRENT_DATE::text as cur_date_str,
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')::date::text as ist_prev_date_str
  `);
  console.log('Query result:');
  console.table(res.rows);

  const filterCurrent = `sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date`;
  const filterPrev = `sent_date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')::date`;

  const currRes = await pool.query(`SELECT COUNT(*)::int as today_alerts FROM email_alert_logs WHERE ${filterCurrent}`);
  const prevRes = await pool.query(`SELECT COUNT(*)::int as prev_alerts FROM email_alert_logs WHERE ${filterPrev}`);

  console.log('email_alert_logs count for today (IST):', currRes.rows[0].today_alerts);
  console.log('email_alert_logs count for previous (IST):', prevRes.rows[0].prev_alerts);

  await pool.end();
}

check().catch(console.error);
