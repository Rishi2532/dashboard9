const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const users = await pool.query("SELECT id, username, email, phone, name, role FROM users WHERE role = 'engineer' OR username ILIKE '%salunke%' OR email ILIKE '%salunke%'");
    console.log("ENGINEER USERS IN USERS TABLE:");
    console.table(users.rows);

    const engDetails = await pool.query("SELECT scheme_id, scheme, civil_engineer_name, civil_engineer_email, civil_engineer_mobile, mechanical_engineer_name, mechanical_engineer_email, mechanical_engineer_mobile, site_supervisor_name, site_supervisor_email, site_supervisor_mobile FROM scheme_engineer_details WHERE civil_engineer_name IS NOT NULL OR civil_engineer_email IS NOT NULL OR civil_engineer_mobile IS NOT NULL LIMIT 10");
    console.log("\nSAMPLE SCHEME_ENGINEER_DETAILS:");
    console.table(engDetails.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
