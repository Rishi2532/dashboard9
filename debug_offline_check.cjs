
require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    const res1 = await client.query("SELECT count(*) FROM communication_status WHERE region ILIKE '%Chhatrapati%'");
    console.log("Total Chhatrapati Sensors:", res1.rows[0].count);

    const res2 = await client.query("SELECT count(*) FROM communication_status WHERE region ILIKE '%Chhatrapati%' AND pressure_connected='Connected'");
    console.log("Pressure Connected:", res2.rows[0].count);

    const res3 = await client.query("SELECT count(*) FROM communication_status WHERE region ILIKE '%Chhatrapati%' AND pressure_connected='Connected' AND pressure_status='Offline'");
    console.log("Offline (Pressure):", res3.rows[0].count);

    const res4 = await client.query(`
      SELECT scheme_id, pressure_last_seen, EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pressure_last_seen))::int as days
      FROM communication_status 
      WHERE region ILIKE '%Chhatrapati%' 
      AND pressure_connected='Connected' 
      AND pressure_status='Offline'
      AND pressure_last_seen IS NOT NULL
      ORDER BY days ASC
      LIMIT 5
    `);
    console.log("Sample Offline:", res4.rows);

  } catch (err) { console.error(err); } 
  finally { await client.end(); }
}
run();
