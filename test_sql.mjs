import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  // Summary logic
  const sumRes = await client.query(`
    SELECT count(*) as c FROM pressure_data pd 
    INNER JOIN communication_status cs ON pd.scheme_id = cs.scheme_id AND pd.village_name = cs.village_name AND pd.esr_name = cs.esr_name
    WHERE pd.region = 'Amravati' AND cs.pressure_connected = 'Connected' AND cs.pressure_status <> 'Offline'
  `);
  console.log("Summary Online Count (Amravati):", sumRes.rows[0].c);

  // Summary offline logic
  const offRes = await client.query(`
    SELECT count(*) as c FROM communication_status cs
    WHERE cs.region = 'Amravati' AND cs.pressure_connected = 'Connected' AND cs.pressure_status = 'Offline'
  `);
  console.log("Summary Offline Count (Amravati):", offRes.rows[0].c);

  // Detail all_sensors logic
  const detRes = await client.query(`
    SELECT count(*) as c FROM communication_status cs
    LEFT JOIN pressure_data pd ON cs.scheme_id = pd.scheme_id AND cs.village_name = pd.village_name AND cs.esr_name = pd.esr_name
    WHERE cs.region = 'Amravati' AND cs.pressure_connected = 'Connected'
    AND (cs.pressure_status = 'Offline' OR cs.pressure_status = 'offline' OR pd.pressure_value_7 IS NOT NULL)
  `);
  console.log("Details all_sensors Count (Amravati):", detRes.rows[0].c);

  client.release();
  pool.end();
}
run();
