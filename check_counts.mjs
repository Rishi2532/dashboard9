import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkCounts() {
  const pool = new pg.Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
  });
  const client = await pool.connect();

  try {
    console.log("Checking base counts in communication_status...");
    const baseCount = await client.query(`
      SELECT COUNT(*) FROM communication_status 
      WHERE chlorine_connected = 'Connected';
    `);
    console.log("Total Connected Sensors (base):", baseCount.rows[0].count);

    console.log("\nChecking for duplicates in communication_status (by join keys)...");
    const csDups = await client.query(`
      SELECT region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name, COUNT(*) 
      FROM communication_status 
      WHERE chlorine_connected = 'Connected'
      GROUP BY region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name 
      HAVING COUNT(*) > 1;
    `);
    console.log("Communication Status Join Key Duplicates:", csDups.rows);

    console.log("\nChecking details query count (with joins)...");
    const detailsCount = await client.query(`
      SELECT COUNT(*)
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (
        cs.region = wc.region AND
        cs.circle = wc.circle AND
        cs.division = wc.division AND
        cs.sub_division = wc.sub_division AND
        cs.block = wc.block AND
        cs.scheme_id = wc.scheme_id AND
        cs.scheme_name = wc.scheme_name AND
        cs.village_name = wc.village_name AND
        cs.esr_name = wc.esr_name
      )
      LEFT JOIN chlorine_data cd ON (
        cs.region = cd.region AND
        cs.circle = cd.circle AND
        cs.division = cd.division AND
        cs.sub_division = cd.sub_division AND
        cs.block = cd.block AND
        cs.scheme_id = cd.scheme_id AND
        cs.scheme_name = cd.scheme_name AND
        cs.village_name = cd.village_name AND
        cs.esr_name = cd.esr_name
      )
      WHERE cs.chlorine_connected = 'Connected';
    `);
    console.log("Total rows in details query (all connected):", detailsCount.rows[0].count);

  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCounts().catch(console.error);
