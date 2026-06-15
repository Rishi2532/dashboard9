import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const result = await pool.query(`SELECT dashboard_url FROM water_scheme_data WHERE village_name = 'Akhatwada' LIMIT 1;`);
  console.log("Village Dashboard URL in DB:", result.rows[0]);
  process.exit(0);
}
run();
