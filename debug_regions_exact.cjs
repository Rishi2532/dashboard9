
require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    console.log("--- PH Regions ---");
    const res = await client.query("SELECT DISTINCT region FROM pressure_history ORDER BY region");
    console.log(JSON.stringify(res.rows, null, 2));

    console.log("--- Overlap Check ---");
    const resOver = await client.query(`
      SELECT 
        count(DISTINCT cs.scheme_id) as cs_total_schemes,
        count(DISTINCT ph.scheme_id) as matching_ph_schemes
      FROM communication_status cs
      LEFT JOIN pressure_history ph ON cs.scheme_id = ph.scheme_id
      WHERE cs.region ILIKE '%Chhatrapati%'
    `);
    console.log(JSON.stringify(resOver.rows, null, 2));

    console.log("--- Sample Matched Scheme ---");
    const resSample = await client.query(`
        SELECT cs.scheme_id, cs.region as cs_reg, ph.region as ph_reg
        FROM communication_status cs
        JOIN pressure_history ph ON cs.scheme_id = ph.scheme_id
        WHERE cs.region ILIKE '%Chhatrapati%'
        LIMIT 1
    `);
    console.log(JSON.stringify(resSample.rows, null, 2));

  } catch (err) { console.error(err); } 
  finally { await client.end(); }
}
run();
