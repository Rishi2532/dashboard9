const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();
  const allCl = (await client.query("SELECT * FROM chlorine_data WHERE scheme_id = '631010' AND village_name = 'Alesur' AND esr_name = 'MBR 1.75 LL'")).rows;
  console.log('Row found in Cl:', allCl);
  process.exit(0);
}
run().catch(console.error);
