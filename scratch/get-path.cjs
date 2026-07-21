const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard' });
async function run() {
  await client.connect();
  const res = (await client.query("SELECT scheme_id, village_name, esr_name FROM communication_status WHERE esr_name LIKE '%1.75%'")).rows;
  console.log(res);
  process.exit(0);
}
run();
