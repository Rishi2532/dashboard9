import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const res = await pool.query("SELECT region, circle, division, sub_division, block, scheme_name FROM scheme_status WHERE scheme_id ILIKE '%20029079%' OR scheme_name ILIKE '%20029079%' OR scheme_name ILIKE '%Bodhegaon%';");
  console.log(`Found ${res.rowCount} schemes in scheme_status`);
  if (res.rowCount > 0) {
    console.log(res.rows[0]);
  }
  process.exit(0);
}
run();
