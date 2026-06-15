import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const result = await pool.query(`SELECT dashboard_url FROM water_scheme_data WHERE dashboard_url IS NOT NULL LIMIT 2;`);
  console.log("Water Scheme Data URLs:", result.rows);
  const result2 = await pool.query(`SELECT dashboard_url FROM scheme_lpcd WHERE dashboard_url IS NOT NULL LIMIT 2;`);
  console.log("Scheme LPCD URLs:", result2.rows);
  process.exit(0);
}
run();
