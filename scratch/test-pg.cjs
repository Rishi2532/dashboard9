const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();
  const allComm = (await client.query("SELECT scheme_id, esr_name FROM communication_status")).rows;
  const allCl = (await client.query("SELECT scheme_id, esr_name FROM chlorine_data")).rows;
  
  const clMap = new Set(allCl.map(r => r.scheme_id + r.esr_name));
  
  const missing = allComm.filter(r => !clMap.has(r.scheme_id + r.esr_name));
  console.log(`Missing count: ${missing.length}`);
  if (missing.length > 0) {
    console.log(missing.slice(0, 5).map(m => m.scheme_id + ' | ' + m.esr_name));
  }
  process.exit(0);
}
run().catch(console.error);
