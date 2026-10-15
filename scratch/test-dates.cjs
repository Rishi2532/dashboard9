const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();
  const q = await client.query(`
    SELECT sent_date, created_at, CURRENT_DATE, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date as ist_date
    FROM email_acknowledgements
    ORDER BY id DESC
    LIMIT 3;
  `);
  console.log(q.rows);
  await client.end();
}
run().catch(console.error);
