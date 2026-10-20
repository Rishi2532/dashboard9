import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});

async function run() {
  const res = await pool.query(`
    SELECT scheme_id, scheme_name, village_name, esr_name,
           chlorine_connected, chlorine_status, last_seen,
           pressure_connected, pressure_status, pressure_last_seen,
           flow_meter_connected, flow_meter_status
    FROM communication_status
    WHERE scheme_name ILIKE '%Dongargaon%' OR scheme_id = '7948936' OR esr_name ILIKE '%Dongargaon%'
  `);
  console.log('Dongargaon rows:', res.rows);
  await pool.end();
}

run().catch(console.error);
