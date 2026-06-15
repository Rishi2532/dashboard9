import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const result = await pool.query(`SELECT scheme_id, village_name FROM water_scheme_data LIMIT 1;`);
  console.log("DB Scheme:", result.rows[0]);
  process.exit(0);
}
run();
