const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query("SELECT * FROM scheme_engineer_details WHERE scheme_id = '20027978' OR scheme ILIKE '%Dhamangaon%'");
  console.log('COUNT:', res.rows.length);
  if (res.rows.length > 0) {
    console.log('FIRST ROW:', JSON.stringify(res.rows[0], null, 2));
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
