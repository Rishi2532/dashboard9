const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function q() {
  const comm = await p.query(`
    SELECT * FROM communication_status 
    WHERE scheme_id = '20028298' 
    LIMIT 10
  `);
  console.log('Communication Status for 20028298:');
  console.table(comm.rows.map(r => ({
    scheme_id: r.scheme_id,
    village_name: r.village_name,
    esr_name: r.esr_name,
    chlorine_status: r.chlorine_status,
    flow_meter_status: r.flow_meter_status,
    last_updated: r.last_updated
  })));

  const rsd = await p.query(`
    SELECT * FROM realtime_sensor_data 
    WHERE scheme_id = '20028298' 
    LIMIT 10
  `);
  console.log('Realtime Sensor Data for 20028298:');
  console.table(rsd.rows.map(r => ({
    scheme_id: r.scheme_id,
    village_name: r.village_name,
    esr_name: r.esr_name,
    chlorine_value: r.chlorine_value,
    chlorine_comm_status: r.chlorine_comm_status,
    chlorine_timestamp: r.chlorine_timestamp,
    last_updated_values: r.last_updated_values
  })));

  // Check email_alert_logs for 20028298
  const logs = await p.query(`
    SELECT id, scheme_id, village_name, esr_name, alert_type, alert_value, sent_date, created_at, ticket_id
    FROM email_alert_logs 
    WHERE scheme_id = '20028298'
    ORDER BY created_at DESC 
    LIMIT 5
  `);
  console.log('Recent Alert Logs for 20028298:');
  console.table(logs.rows);

  await p.end();
}
q().catch(console.error);
