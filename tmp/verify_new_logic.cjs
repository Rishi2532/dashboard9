
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    const statuses = "('Fully Completed', 'Completed', 'In Progress')";

    // 1. Total Schemes with water_supply = 'Yes'
    const q1 = "SELECT COUNT(DISTINCT scheme_id) FROM scheme_status WHERE water_supply = 'Yes'";
    const res1 = await client.query(q1);
    console.log('Total (water_supply=Yes):', res1.rows[0].count);

    // 2. Operational Subset (statuses + water_supply=Yes)
    const q2 = "SELECT COUNT(DISTINCT scheme_id) FROM scheme_status WHERE water_supply = 'Yes' AND fully_completion_scheme_status IN " + statuses;
    const res2 = await client.query(q2);
    console.log('Operational Subset:', res2.rows[0].count);

    // 3. Bottom "Fully Completed" (Subset + water_supply_status = 'Full')
    const q3 = "SELECT COUNT(DISTINCT scheme_id) FROM scheme_status WHERE water_supply = 'Yes' AND fully_completion_scheme_status IN " + statuses + " AND water_supply_status = 'Full'";
    const res3 = await client.query(q3);
    console.log('Bottom Fully Completed (Full):', res3.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
