const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const query = `
    SELECT scheme_id,
           json_agg(json_build_object(
             'id', id,
             'mobile', mobile,
             'engineer_name', engineer_name,
             'template_name', template_name,
             'is_success', is_success
           )) as sms_dispatches
    FROM sms_alert_logs
    WHERE (template_name ILIKE '%Chlorine%' AND template_name NOT ILIKE '%Offline%')
      AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
      AND sent_date = CURRENT_DATE
    GROUP BY scheme_id
  `;
  const res = await pool.query(query);
  console.log('Direct DB query for Chlorine daily SMS:');
  console.log('Rows count:', res.rows.length);
  if (res.rows[0]) {
    console.log('Scheme ID:', res.rows[0].scheme_id);
    console.log('SMS Dispatches:', res.rows[0].sms_dispatches);
  }
  await pool.end();
}

main().catch(console.error);
