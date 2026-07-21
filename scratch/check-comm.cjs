const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard' });
  await client.connect();
  const res = (await client.query("SELECT * FROM communication_status WHERE scheme_id = '20027951' AND esr_name = 'Proposed 1.00 LL MBR-Outlet-1'")).rows;
  console.log(res);
  process.exit(0);
}
run();
