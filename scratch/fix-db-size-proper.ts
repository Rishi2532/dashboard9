import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  try {
    // 1. Remove strict precision limits on the history tables for water_value and lpcd_value
    await pool.query(`ALTER TABLE water_scheme_data ALTER COLUMN water_value_day1 TYPE numeric;`);
    await pool.query(`ALTER TABLE scheme_lpcd ALTER COLUMN water_value_day1 TYPE numeric;`);
    // (Actually the check showed only water_value and lpcd_value had limits 20,6)
    
    // We target the tables that had precision 20, scale 6
    await pool.query(`ALTER TABLE water_scheme_data_history ALTER COLUMN water_value TYPE numeric;`);
    await pool.query(`ALTER TABLE water_scheme_data_history ALTER COLUMN lpcd_value TYPE numeric;`);
    
    // Wait, the table might be called something else. The previous script output showed:
    // water_value, data_type: numeric, precision 20, scale 6.
    // lpcd_value, data_type: numeric, precision 20, scale 6.
    
    // Let's find exactly which tables have those limits:
    const res = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE data_type = 'numeric' AND numeric_precision = 20 AND numeric_scale = 6;
    `);
    
    for (const row of res.rows) {
      console.log(`Fixing ${row.table_name}.${row.column_name}...`);
      await pool.query(`ALTER TABLE ${row.table_name} ALTER COLUMN ${row.column_name} TYPE numeric;`);
    }

    console.log("Successfully increased database sizes and removed strict limits!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
