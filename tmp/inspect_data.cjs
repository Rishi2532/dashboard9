
const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT data_date, lpcd_value, uploaded_at FROM scheme_lpcd_data_history WHERE scheme_id = '2003645' ORDER BY id DESC LIMIT 20");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
test();
