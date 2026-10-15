import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        COUNT(DISTINCT e.village_name) as distinct_villages,
        COUNT(*) as total_rows
      FROM email_alert_logs e
      LEFT JOIN scheme_status s ON s.scheme_id = e.scheme_id
      WHERE e.alert_type IN ('LPCD', 'Low LPCD')
        AND (e.ticket_id NOT LIKE 'TKT-RT-%' OR e.ticket_id IS NULL)
        AND (e.dispatch_type = 'daily' OR e.dispatch_type IS NULL)
        AND (e.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR e.sent_date = CURRENT_DATE)
        AND (s.water_supply = 'Yes' OR s.water_supply IS NULL)
    `);
    console.log('Today LPCD matching alerts-progress:', res.rows[0]);

    const resAll = await client.query(`
      SELECT 
        COUNT(DISTINCT e.village_name) as distinct_villages,
        COUNT(*) as total_rows
      FROM email_alert_logs e
      WHERE e.alert_type IN ('LPCD', 'Low LPCD')
        AND e.sent_date >= CURRENT_DATE - INTERVAL '14 days'
    `);
    console.log('14 days LPCD in email_alert_logs:', resAll.rows[0]);

    const acks = await client.query(`
      SELECT 
        COUNT(*) as total_acks,
        COUNT(DISTINCT LOWER(TRIM(engineer_email))) as distinct_emails,
        COUNT(DISTINCT (sent_date, scheme_id, LOWER(TRIM(engineer_email)))) as scheme_engineer_dispatches
      FROM email_acknowledgements
      WHERE (sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR sent_date = CURRENT_DATE)
    `);
    console.log('Today email_acknowledgements counts:', acks.rows[0]);

    const ackList = await client.query(`
      SELECT 
        ea.engineer_name,
        ea.engineer_email,
        COUNT(*) as count
      FROM email_acknowledgements ea
      WHERE (ea.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR ea.sent_date = CURRENT_DATE)
      GROUP BY ea.engineer_name, ea.engineer_email
      ORDER BY count DESC
    `);
    console.log('Today unique recipient emails and counts in ack:');
    ackList.rows.forEach(r => console.log(`  ${r.engineer_name} <${r.engineer_email}>: ${r.count}`));

    const emailLogs = await client.query(`
      SELECT 
        dispatch_type,
        COUNT(*) as count
      FROM email_alert_logs
      WHERE (sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR sent_date = CURRENT_DATE)
      GROUP BY dispatch_type
    `);
    console.log('Today email_alert_logs dispatch_type breakdown:', emailLogs.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
