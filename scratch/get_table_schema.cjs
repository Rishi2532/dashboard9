const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const r = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'consolidated_email_dispatches'
    ORDER BY ordinal_position;
  `);
  console.log("Columns of consolidated_email_dispatches:");
  console.table(r.rows);
  pool.end();
}
main();
