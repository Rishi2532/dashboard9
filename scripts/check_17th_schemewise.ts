import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== CHECKING email_alert_logs FOR 17-OCT SCHEME-WISE ===');
      const res = await client.query(`
        SELECT 
          scheme_id,
          scheme_name,
          dispatch_type,
          ee_civil_name,
          ee_civil_email,
          de_ae_civil_name,
          de_ae_civil_email,
          count(*) FILTER (WHERE alert_type ILIKE '%lpcd%') as lpcd_alerts,
          count(*) FILTER (WHERE alert_type ILIKE '%chlorine%') as chlorine_alerts,
          count(*) FILTER (WHERE alert_type ILIKE '%pressure%') as pressure_alerts,
          count(*) FILTER (WHERE alert_type ILIKE '%offline%') as offline_alerts,
          count(*) as total_alerts
        FROM email_alert_logs
        WHERE (sent_date = '2026-10-17' OR (sent_date AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17')
        GROUP BY scheme_id, scheme_name, dispatch_type, ee_civil_name, ee_civil_email, de_ae_civil_name, de_ae_civil_email
        ORDER BY scheme_name, dispatch_type
      `);
      console.log('Total rows grouped by scheme and dispatch_type:', res.rows.length);
      
      const byDispatchType = {};
      res.rows.forEach(r => {
        const dt = r.dispatch_type || 'unspecified';
        byDispatchType[dt] = (byDispatchType[dt] || 0) + 1;
      });
      console.log('Schemes per dispatch_type:', byDispatchType);

      console.log('\n--- SCHEMES AND THEIR EE IN email_alert_logs ON 17-OCT ---');
      res.rows.forEach((r, i) => {
        console.log(`${i+1}. [${r.dispatch_type}] ${r.scheme_id}: ${r.scheme_name}`);
        console.log(`   EE: ${r.ee_civil_name} <${r.ee_civil_email || 'NO EMAIL'}>`);
        console.log(`   DE: ${r.de_ae_civil_name} <${r.de_ae_civil_email || 'NO EMAIL'}>`);
        console.log(`   Alerts: LPCD=${r.lpcd_alerts}, Cl=${r.chlorine_alerts}, Pr=${r.pressure_alerts}, Off=${r.offline_alerts}, Total=${r.total_alerts}`);
      });

    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
