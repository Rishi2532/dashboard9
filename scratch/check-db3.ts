import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const t1 = await pool.query("SELECT COUNT(*) FROM scheme_lpcd;");
  console.log(`Rows in scheme_lpcd (Scheme): ${t1.rows[0].count}`);
  
  const t2 = await pool.query("SELECT COUNT(*) FROM water_scheme_data;");
  console.log(`Rows in water_scheme_data (Village): ${t2.rows[0].count}`);
  
  const t3 = await pool.query("SELECT COUNT(*) FROM water_consumption;");
  console.log(`Rows in water_consumption (ESR): ${t3.rows[0].count}`);
  
  process.exit(0);
}
run();
