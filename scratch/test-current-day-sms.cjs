const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const configs = [
    { type: 'LPCD', emailFilter: "alert_type IN ('LPCD', 'Low LPCD')", smsFilter: "template_name ILIKE '%LPCD%'" },
    { type: 'Chlorine', emailFilter: "alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')", smsFilter: "(template_name ILIKE '%Chlorine%' AND template_name NOT ILIKE '%Offline%')" },
    { type: 'Pressure', emailFilter: "alert_type IN ('Pressure', 'Low Pressure')", smsFilter: "(template_name ILIKE '%Pressure%' AND template_name NOT ILIKE '%Offline%')" },
    { type: 'Offline', emailFilter: "alert_type ILIKE '%Offline%'", smsFilter: "template_name ILIKE '%Offline%'" }
  ];

  for (const c of configs) {
    const emailRes = await pool.query(`
      SELECT count(*) as email_alerts, count(distinct scheme_id) as email_schemes 
      FROM email_alert_logs 
      WHERE ${c.emailFilter} AND sent_date = CURRENT_DATE
    `);
    const smsRes = await pool.query(`
      SELECT count(*) as sms_dispatches, count(distinct scheme_id) as sms_schemes 
      FROM sms_alert_logs 
      WHERE ${c.smsFilter} AND sent_date = CURRENT_DATE
    `);
    console.log(c.type, { ...emailRes.rows[0], ...smsRes.rows[0] });
  }
  pool.end();
}
check();
