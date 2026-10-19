import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== COLUMNS OF email_alert_logs ===');
      const colsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'email_alert_logs'
      `);
      console.log('Columns:', colsRes.rows.map(r => r.column_name));

      console.log('\n=== email_alert_logs FOR 17-OCT (2026-10-16 18:30:00 UTC) ===');
      const logsRes = await client.query(`
        SELECT alert_type, count(*) as count, count(DISTINCT scheme_id) as schemes
        FROM email_alert_logs
        WHERE sent_date = '2026-10-17' OR sent_date = '2026-10-16' OR (sent_date AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17'
        GROUP BY alert_type
      `);
      console.log('Alert types in email_alert_logs:', logsRes.rows);

      // Distinct schemes for LPCD on 17-Oct
      const lpcdSchemesRes = await client.query(`
        SELECT DISTINCT eal.scheme_id, ss.scheme_name, count(*) as alert_count
        FROM email_alert_logs eal
        LEFT JOIN scheme_status ss ON eal.scheme_id = ss.scheme_id
        WHERE (eal.sent_date = '2026-10-17' OR (eal.sent_date AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17')
          AND eal.alert_type ILIKE '%lpcd%'
        GROUP BY eal.scheme_id, ss.scheme_name
        ORDER BY ss.scheme_name
      `);
      console.log(`\nLPCD Schemes in email_alert_logs on 17-Oct (${lpcdSchemesRes.rows.length} schemes):`);
      lpcdSchemesRes.rows.forEach(r => {
        console.log(`- ${r.scheme_id}: ${r.scheme_name} (${r.alert_count} alerts)`);
      });

      // Check template_id or recipient or escalation level in email_alert_logs
      const recipientRes = await client.query(`
        SELECT count(*), engineer_name, engineer_email, template_id
        FROM email_alert_logs
        WHERE (sent_date = '2026-10-17' OR (sent_date AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17')
        GROUP BY engineer_name, engineer_email, template_id
        LIMIT 20
      `);
      console.log('\nSample recipients/templates:', recipientRes.rows);

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
