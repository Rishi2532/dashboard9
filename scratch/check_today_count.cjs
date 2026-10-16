const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const r = await pool.query("SELECT COUNT(*)::int as count FROM consolidated_email_dispatches WHERE dispatch_date = '2026-10-16'");
  console.log("Consolidated email dispatches today:", r.rows[0]);
  const officers = await pool.query("SELECT COUNT(DISTINCT engineer_name)::int as officers FROM consolidated_email_dispatches WHERE dispatch_date = '2026-10-16'");
  console.log("Unique officers today:", officers.rows[0]);
  pool.end();
}
main();
