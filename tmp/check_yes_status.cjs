
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    const res = await client.query("SELECT COUNT(*) FROM scheme_status WHERE water_supply_status = 'Yes'");
    console.log('Schemes with water_supply_status = Yes:', res.rows[0].count);

    const resFull = await client.query("SELECT COUNT(*) FROM scheme_status WHERE water_supply_status = 'Full'");
    console.log('Schemes with water_supply_status = Full:', resFull.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
