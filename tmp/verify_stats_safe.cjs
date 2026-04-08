
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    const query = "SELECT " +
        "COUNT(DISTINCT scheme_id) as total_schemes, " +
        "COUNT(DISTINCT scheme_id) FILTER (WHERE water_supply = 'Yes') as schemes_operational, " +
        "SUM(total_villages_integrated) as total_villages, " +
        "SUM(total_villages_integrated) FILTER (WHERE water_supply = 'Yes') as villages_operational, " +
        "SUM(total_esr_integrated) as total_esr, " +
        "SUM(total_esr_integrated) FILTER (WHERE water_supply = 'Yes') as esr_operational, " +
        "SUM(flow_meters_connected) as flow, " +
        "SUM(residual_chlorine_analyzer_connected) as rca, " +
        "SUM(pressure_transmitter_connected) as pressure " +
      "FROM scheme_status " +
      "WHERE fully_completion_scheme_status = 'Fully Completed'";
      
    const res = await client.query(query);
    console.log('STATS:' + JSON.stringify(res.rows[0]));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
