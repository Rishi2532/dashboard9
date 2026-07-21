const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard' });
  await client.connect();
  const res = (await client.query("SELECT * FROM communication_status WHERE scheme_id = '20027951'")).rows;
  console.log('Results for scheme 20027951:');
  console.log(res.map(r => ({ esr: r.esr_name, village: r.village_name, url: r.dashboard_url })));
  process.exit(0);
}
run();
