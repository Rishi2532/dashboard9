import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const result = await pool.query(`SELECT water_date_day1, water_date_day7 FROM scheme_lpcd LIMIT 1;`);
  console.log("Scheme Dates:", result.rows[0]);
  process.exit(0);
}
run();
