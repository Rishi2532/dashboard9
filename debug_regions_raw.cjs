
require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    console.log("\n--- CS Regions ---");
    const r1 = await client.query("SELECT DISTINCT region FROM communication_status");
    r1.rows.forEach(r => console.log(`'${r.region}'`));
    
    console.log("\n--- PH Regions ---");
    const r2 = await client.query("SELECT DISTINCT region FROM pressure_history");
    r2.rows.forEach(r => console.log(`'${r.region}'`));

    console.log("\n--- Mismatch Check (CS=Chhatrapati, PH=Aurangabad) ---");
    const res = await client.query(`
      SELECT cs.scheme_id, cs.region as cs_reg, ph.region as ph_reg, cs.village_name as cs_vill, ph.village_name as ph_vill
      FROM communication_status cs
      JOIN pressure_history ph ON cs.scheme_id = ph.scheme_id
      WHERE (cs.region ILIKE '%Chhatrapati%' OR cs.region ILIKE '%Aurangabad%')
      LIMIT 5
    `);
    console.log(res.rows);
    
    console.log("\n--- Village Names Match Check ---");
    const resMATCH = await client.query(`
      SELECT count(*) as matching_count
      FROM communication_status cs
      JOIN pressure_history ph ON cs.scheme_id = ph.scheme_id 
        AND cs.village_name = ph.village_name
        AND cs.esr_name = ph.esr_name
      WHERE cs.region ILIKE '%Chhatrapati%'
    `);
    console.log(resMATCH.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
