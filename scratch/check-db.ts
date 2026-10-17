import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const c1 = await client.query("SELECT count(*) FROM consolidated_email_dispatches WHERE dispatch_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date");
    console.log('consolidated_email_dispatches today:', c1.rows[0]);

    const c2 = await client.query("SELECT count(*) FROM email_acknowledgements WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date");
    console.log('email_acknowledgements today:', c2.rows[0]);

    const c3 = await client.query("SELECT count(*) FROM email_alert_logs WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date");
    console.log('email_alert_logs today:', c3.rows[0]);

    const roles = await client.query("SELECT engineer_role, count(*) FROM consolidated_email_dispatches WHERE dispatch_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date GROUP BY engineer_role");
    console.log('consolidated_email_dispatches roles:', roles.rows);

    const ackRoles = await client.query("SELECT engineer_name, engineer_email, count(*) FROM email_acknowledgements WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date GROUP BY engineer_name, engineer_email");
    console.log('email_acknowledgements sample:', ackRoles.rows.slice(0, 10));

    // Also check what roles are in email_acknowledgements vs scheme_engineer_details
    const sampleCed = await client.query("SELECT id, engineer_name, engineer_email, engineer_role, total_schemes, total_alerts, lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count, offline_alerts_count FROM consolidated_email_dispatches WHERE dispatch_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date LIMIT 10");
    console.log('consolidated_email_dispatches sample:', sampleCed.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
check().catch(console.error);
