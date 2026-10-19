const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT COUNT(DISTINCT cs.scheme_id || '__' || LOWER(TRIM(cs.village_name)) || '__' || LOWER(TRIM(cs.esr_name))) as total
      FROM communication_status cs
      JOIN scheme_status s ON s.scheme_id = cs.scheme_id AND s.water_supply = 'Yes'
      WHERE cs.chlorine_status = 'Offline'
         OR cs.pressure_status = 'Offline'
         OR cs.flow_meter_status = 'Offline'
    `);
    console.log('Operational offline sensors count:', res.rows[0].total);
  } finally {
    client.release();
    pool.end();
  }
}
run();
