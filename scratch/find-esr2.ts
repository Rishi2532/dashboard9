import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const res = await pool.query("SELECT region, circle, division, sub_division, block, scheme_name FROM chlorine_data WHERE circle ILIKE '%Ahmednagar%' LIMIT 1;");
  console.log(`Found ${res.rowCount} schemes in chlorine_data for Ahmednagar`);
  if (res.rowCount > 0) {
    console.log(res.rows[0]);
  }
  process.exit(0);
}
run();
