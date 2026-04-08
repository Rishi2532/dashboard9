
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    const res = await client.query("SELECT DISTINCT water_supply_status FROM scheme_status");
    console.log('Water Supply Status Values:', JSON.stringify(res.rows));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
