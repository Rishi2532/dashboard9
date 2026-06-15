import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const result = await pool.query(`
    SELECT column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name IN ('scheme_lpcd', 'scheme_lpcd_data_history', 'water_scheme_data', 'water_scheme_data_history', 'water_consumption', 'water_consumption_history')
    AND data_type = 'numeric';
  `);
  console.log("Numeric Columns:");
  console.dir(result.rows, { depth: null });
  process.exit(0);
}
run();
