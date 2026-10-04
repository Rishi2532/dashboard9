const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const q1 = await pool.query(`
    SELECT count(*) as total_rows, count(distinct scheme_id) as unique_schemes, count(distinct sent_date::date) as unique_dates 
    FROM email_alert_logs 
    WHERE (alert_type NOT ILIKE '%REALTIME%' OR alert_type IS NULL)
  `);
  console.log('Non-RT email_alert_logs:', q1.rows[0]);

  const q2 = await pool.query(`
    SELECT sent_date::date as date, count(*) as alert_rows, count(distinct scheme_id) as unique_schemes
    FROM email_alert_logs
    WHERE (alert_type NOT ILIKE '%REALTIME%' OR alert_type IS NULL)
    GROUP BY sent_date::date
    ORDER BY date DESC
  `);
  console.log('Email By date:');
  console.table(q2.rows);

  const q3 = await pool.query(`
    SELECT sent_date::date as date, count(*) as sms_dispatches, count(distinct scheme_id) as unique_schemes
    FROM sms_alert_logs
    WHERE (template_name NOT ILIKE '%REALTIME%' OR template_name IS NULL)
    GROUP BY sent_date::date
    ORDER BY date DESC
  `);
  console.log('SMS By date:');
  console.table(q3.rows);

  pool.end();
}
check();
