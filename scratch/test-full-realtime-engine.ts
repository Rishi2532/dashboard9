import { runPiRealtimeAlertsJob } from '../server/cron/pi-realtime-alerts.js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testFullRealtimeEngine() {
  console.log("=== RUNNING FULL REAL-TIME ALERTS ENGINE CYCLE ===");
  await runPiRealtimeAlertsJob();

  console.log("\n=== POSTGRESQL REALTIME SNAPSHOT STATS ===");
  const client = await pool.connect();
  try {
    const statsRes = await client.query(`
      SELECT 
        COUNT(*)::int as total_esrs,
        COUNT(CASE WHEN flow_rate_comm_status = 'Offline' THEN 1 END)::int as flow_offline_count,
        COUNT(CASE WHEN chlorine_comm_status = 'Offline' THEN 1 END)::int as chlorine_offline_count,
        COUNT(CASE WHEN pressure_comm_status = 'Offline' THEN 1 END)::int as pressure_offline_count,
        COUNT(CASE WHEN flow_rate_value > 0 THEN 1 END)::int as active_flow_count,
        COUNT(CASE WHEN flow_rate_value > 0 AND (chlorine_value < 0.2 OR chlorine_value > 0.5) THEN 1 END)::int as critical_chlorine_active_flow_count,
        COUNT(CASE WHEN pressure_value < 0.2 AND pressure_value >= 0 THEN 1 END)::int as low_pressure_count
      FROM realtime_sensor_data
    `);
    console.table(statsRes.rows);

    const logsRes = await client.query(`
      SELECT scheme_id, village_name, esr_name, alert_type, alert_value, ticket_id, sent_date, sent_time
      FROM email_alert_logs
      ORDER BY id DESC
      LIMIT 10
    `);
    console.log("\nLatest Email Alert Logs:");
    console.table(logsRes.rows);

    const smsRes = await client.query(`
      SELECT mobile, scheme_id, template_name, is_success, created_at
      FROM sms_alert_logs
      ORDER BY id DESC
      LIMIT 10
    `);
    console.log("\nLatest SMS Alert Logs:");
    console.table(smsRes.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

testFullRealtimeEngine().catch(console.error);
