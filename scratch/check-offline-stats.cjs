const pg = require('pg');
require('dotenv').config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
        c.scheme_id,
        c.scheme_name,
        c.region,
        c.village_name,
        c.esr_name,
        c.chlorine_status,
        c.pressure_status,
        c.flow_meter_status
      FROM communication_status c
      WHERE c.chlorine_status = 'Offline'
         OR c.pressure_status = 'Offline'
         OR c.flow_meter_status = 'Offline'
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
    `);
    const rows = res.rows || [];
    console.log('Total Distinct Offline Sensors (ALL):', rows.length);
    let cl = 0, pr = 0, fl = 0;
    for (const r of rows) {
      if (r.chlorine_status === 'Offline') cl++;
      if (r.pressure_status === 'Offline') pr++;
      if (r.flow_meter_status === 'Offline') fl++;
    }
    console.log('Bifurcation:');
    console.log('  Chlorine Offline:', cl);
    console.log('  Pressure Offline:', pr);
    console.log('  Flow Meter Offline:', fl);

    const vendors = await client.query(`
      SELECT DISTINCT ON (region) region, employee_name, email, phone
      FROM vendor
      ORDER BY region, id
    `);
    console.log('Vendors count:', vendors.rows.length);
    console.log('Vendors:', vendors.rows);

    const q1 = await client.query(`
      SELECT count(*)
      FROM (
        SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
          c.scheme_id
        FROM communication_status c
        JOIN scheme_engineer_details sed ON (sed.scheme_id = c.scheme_id OR (c.scheme_name IS NOT NULL AND sed.scheme = c.scheme_name))
        WHERE c.chlorine_status = 'Offline'
           OR c.pressure_status = 'Offline'
           OR c.flow_meter_status = 'Offline'
      ) sub
    `);
    console.log('Offline sensors with assigned engineers:', q1.rows[0].count);

    const qWithWater = await client.query(`
      SELECT count(*)
      FROM communication_status c
      INNER JOIN scheme_status s ON c.scheme_id = s.scheme_id
      WHERE (c.chlorine_status = 'Offline' OR c.pressure_status = 'Offline' OR c.flow_meter_status = 'Offline')
        AND s.water_supply = 'Yes'
    `);
    console.log('Offline sensors in comm_status with water_supply = Yes:', qWithWater.rows[0].count);

    const qAllComm = await client.query(`
      SELECT count(*)
      FROM communication_status c
      WHERE (c.chlorine_status = 'Offline' OR c.pressure_status = 'Offline' OR c.flow_meter_status = 'Offline')
    `);
    console.log('Offline sensors in comm_status total:', qAllComm.rows[0].count);

    const rTodayLogs = await client.query(`
      SELECT count(distinct concat(scheme_id, '-', lower(trim(coalesce(village_name,''))), '-', lower(trim(coalesce(esr_name,'')))))
      FROM email_alert_logs
      WHERE alert_type ILIKE '%offline%'
        AND sent_date = '2026-10-19'
    `);
    console.log('Today offline in email_alert_logs:', rTodayLogs.rows[0].count);

    const qBif = await client.query(`
      WITH recent_logs AS (
        SELECT DISTINCT ON (scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date)
          scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
          sent_time, created_at, sent_date
        FROM email_alert_logs
        WHERE alert_type ILIKE '%Offline%'
          AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
          AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
          AND sent_date = '2026-10-19'
        ORDER BY scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date, created_at DESC
      )
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE alert_value ILIKE '%chlorine%') as chlorine_offline,
        count(*) FILTER (WHERE alert_value ILIKE '%pressure%') as pressure_offline,
        count(*) FILTER (WHERE alert_value ILIKE '%flow%') as flow_offline
      FROM recent_logs
    `);
    console.log('Bifurcation of offline logs:', qBif.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
