const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const query = `
    SELECT scheme_name, agency_type, scheme_id, agency
    FROM scheme_status
    WHERE scheme_name ILIKE '%Padali%'
       OR scheme_name ILIKE '%Kurha%'
       OR scheme_name ILIKE '%Dhamangaon Deshmukh%'
       OR scheme_name ILIKE '%Pophali%'
       OR scheme_name ILIKE '%Kurum%'
    LIMIT 20;
  `;
  try {
    const res = await pool.query(query);
    console.log("Results from scheme_status:");
    console.table(res.rows);

    const query2 = `
      SELECT scheme_name, scheme_id
      FROM water_scheme_data
      WHERE scheme_name ILIKE '%Padali%'
         OR scheme_name ILIKE '%Kurha%'
         OR scheme_name ILIKE '%Dhamangaon Deshmukh%'
         OR scheme_name ILIKE '%Pophali%'
         OR scheme_name ILIKE '%Kurum%'
      LIMIT 5;
    `;
    const res2 = await pool.query(query2);
    console.log("Results from water_scheme_data:");
    console.table(res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
