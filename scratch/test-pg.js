const { Client } = require('pg');
const client = new Client({ connectionString: "postgres://postgres:postgres@localhost:5432/dashboard" });
async function run() {
  await client.connect();
  const res = await client.query("SELECT chlorine_status, COUNT(*) FROM communication_status GROUP BY chlorine_status;");
  console.log('Chlorine:', res.rows);
  const res2 = await client.query("SELECT pressure_status, COUNT(*) FROM communication_status GROUP BY pressure_status;");
  console.log('Pressure:', res2.rows);
  process.exit(0);
}
run();
