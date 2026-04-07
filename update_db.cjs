const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL
  });

  try {
    console.log("Adding water_supply_status column...");
    await pool.query(`
      ALTER TABLE scheme_status
      ADD COLUMN IF NOT EXISTS water_supply_status TEXT;
    `);
    
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'scheme_status'
        AND column_name = 'water_supply_status';
    `);
    console.log("Verification:", result.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
