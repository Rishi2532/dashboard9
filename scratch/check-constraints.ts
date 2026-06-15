import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  const tables = ['scheme_lpcd', 'scheme_lpcd_data_history', 'water_scheme_data', 'water_scheme_data_history', 'water_consumption', 'water_consumption_history'];
  for (const t of tables) {
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = '${t}'::regclass;
    `);
    console.log(`\nConstraints for ${t}:`);
    console.dir(result.rows, { depth: null });
  }
  process.exit(0);
}
run();
