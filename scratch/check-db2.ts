import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const dRes = await pool.query("SELECT COUNT(*) FROM chlorine_data;");
  console.log(`Total rows in chlorine_data: ${dRes.rows[0].count}`);
  
  const hRes = await pool.query("SELECT COUNT(*) FROM chlorine_history WHERE uploaded_at >= CURRENT_DATE;");
  console.log(`Rows in chlorine_history uploaded today: ${hRes.rows[0].count}`);
  
  process.exit(0);
}
run();
