const { Pool } = require('pg');
require('dotenv').config();

async function checkScheme() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query("SELECT scheme_name, COUNT(DISTINCT scheme_id) FROM scheme_status GROUP BY scheme_name HAVING COUNT(DISTINCT scheme_id) > 1 LIMIT 10");
    console.log('Duplicate scheme names with multiple IDs:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkScheme();
