import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const result = await pool.query(`SELECT dashboard_url FROM water_consumption WHERE dashboard_url IS NOT NULL LIMIT 2;`);
  console.log("Water Consumption URLs:", result.rows);
  process.exit(0);
}
run();
