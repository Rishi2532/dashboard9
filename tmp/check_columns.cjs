
const { Client } = require('pg');
async function checkColumns() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('water_scheme_data', 'water_scheme_data_history', 'scheme_lpcd_data_history')");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
checkColumns();
