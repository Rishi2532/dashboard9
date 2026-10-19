const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const r = await pool.query(`
      SELECT 
        'ea-' || id as id,
        engineer_name as recipient_name,
        engineer_email as recipient_email,
        engineer_role as recipient_role,
        scheme_id,
        alert_type as alert_title,
        sent_date,
        created_at
      FROM email_acknowledgements
      WHERE engineer_name ILIKE '%Dipak%' 
         OR engineer_name ILIKE '%Burde%' 
         OR engineer_email ILIKE '%cemjpnagpur%'
         OR engineer_role ILIKE '%Chief%' 
         OR engineer_role ILIKE '%Superintending%' 
         OR engineer_role ILIKE '%SE%' 
         OR engineer_role ILIKE '%CE%'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('Count in email_acknowledgements:', r.rows.length);
    console.table(r.rows);

    const rAlertLogs = await pool.query(`
      SELECT id, scheme_id, scheme_name, chief_engineer_name, chief_engineer_email, se_name, se_email, dispatch_type, sent_date, created_at
      FROM email_alert_logs
      WHERE dispatch_type ILIKE '%level3%' OR chief_engineer_name ILIKE '%Dipak%' OR se_name ILIKE '%Burde%'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('\nCount in email_alert_logs:', rAlertLogs.rows.length);
    console.table(rAlertLogs.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
