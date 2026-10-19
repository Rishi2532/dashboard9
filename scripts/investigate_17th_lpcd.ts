import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== 1. CHECK ALL TABLES FOR 17-OCT RECORDS ===');
      
      // email_alert_logs
      try {
        const ealRes = await client.query(`
          SELECT count(*) as count, alert_type, recipient_role
          FROM email_alert_logs
          WHERE sent_date = '2026-10-17' OR (created_at AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17'
          GROUP BY alert_type, recipient_role
        `);
        console.log('email_alert_logs for 17-Oct:', ealRes.rows);
      } catch (e) {
        console.log('email_alert_logs error:', e.message);
      }

      // Check date range in email_alert_logs
      try {
        const ealDates = await client.query(`
          SELECT sent_date, count(*) as count, count(DISTINCT scheme_id) as schemes
          FROM email_alert_logs
          GROUP BY sent_date
          ORDER BY sent_date DESC
          LIMIT 10
        `);
        console.log('email_alert_logs dates:', ealDates.rows);
      } catch (e) {
        console.log('email_alert_logs dates error:', e.message);
      }

      // Check all dates in consolidated_email_dispatches
      try {
        const cedDates = await client.query(`
          SELECT dispatch_date, engineer_role, count(*) as count, sum(jsonb_array_length(scheme_ids)) as total_schemes_in_emails
          FROM consolidated_email_dispatches
          GROUP BY dispatch_date, engineer_role
          ORDER BY dispatch_date DESC
        `);
        console.log('consolidated_email_dispatches dates & roles:', cedDates.rows);
      } catch (e) {
        console.log('cedDates error:', e.message);
      }

      // Check scheme_engineer_details mapping
      console.log('\n=== 2. CHECK EE ASSIGNMENTS SCHEME-WISE ===');
      const sedRes = await client.query(`
        SELECT scheme_id, scheme, ee_civil_name, ee_civil_email, ee_civil_mobile
        FROM scheme_engineer_details
        ORDER BY scheme_id
      `);
      console.log('Total scheme_engineer_details rows:', sedRes.rows.length);

      // Check LPCD issues on schemes on 17th or current day
      console.log('\n=== 3. CHECK SCHEMES WITH LPCD ISSUES ===');
      const lpcdRes = await client.query(`
        SELECT count(*) as count
        FROM scheme_status
      `);
      console.log('scheme_status total rows:', lpcdRes.rows[0].count);

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
