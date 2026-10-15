const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  const res = await pool.query(`
    SELECT 
      sent_date::text,
      engineer_name,
      engineer_email,
      COUNT(DISTINCT scheme_id) as schemes,
      COUNT(*) as total_alerts_included,
      string_agg(DISTINCT alert_type, ', ') as alert_types,
      to_char(MAX(created_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH12:MI:SS AM') as dispatched_at_ist
    FROM email_acknowledgements
    GROUP BY sent_date::text, engineer_name, engineer_email
    ORDER BY sent_date DESC
  `);
  console.log('=== COMPLETE EMAIL ACKNOWLEDGEMENTS HISTORY ===');
  console.table(res.rows);

  pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
