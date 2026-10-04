import { runPiRealtimeAlertsJob } from '../server/cron/pi-realtime-alerts.js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testRealtimeEngine() {
  console.log("=== TESTING REALTIME ALERTS ENGINE EXECUTION ===");
  const testRootPath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola';
  
  console.log(`Running real-time alerts job on test sub-path: ${testRootPath}...`);
  await runPiRealtimeAlertsJob(testRootPath);

  console.log("\n=== CHECKING realtime_sensor_data IN POSTGRESQL ===");
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT scheme_id, village_name, esr_name, chlorine_value, flow_rate_value, pressure_value,
             chlorine_comm_status, flow_rate_comm_status, pressure_comm_status,
             last_updated_values, last_updated_comm
      FROM realtime_sensor_data
      ORDER BY last_updated_values DESC
      LIMIT 10
    `);

    console.log(`Found ${res.rows.length} rows in realtime_sensor_data:`);
    console.table(res.rows);

    const logsRes = await client.query(`
      SELECT scheme_id, village_name, esr_name, alert_type, alert_value, ticket_id, sent_date, sent_time
      FROM email_alert_logs
      ORDER BY id DESC
      LIMIT 5
    `);
    console.log(`\nLatest 5 email alert logs:`);
    console.table(logsRes.rows);

    const smsRes = await client.query(`
      SELECT mobile, scheme_id, template_name, message_text, is_success, created_at
      FROM sms_alert_logs
      ORDER BY id DESC
      LIMIT 5
    `);
    console.log(`\nLatest 5 SMS alert logs:`);
    console.table(smsRes.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

testRealtimeEngine().catch(console.error);
