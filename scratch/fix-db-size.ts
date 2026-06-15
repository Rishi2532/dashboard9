import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});
async function run() {
  try {
    // 1. Remove strict precision limits on the history tables for water_value and lpcd_value
    await pool.query(`ALTER TABLE water_scheme_data_history ALTER COLUMN water_value TYPE numeric;`);
    await pool.query(`ALTER TABLE water_scheme_data_history ALTER COLUMN lpcd_value TYPE numeric;`);
    
    await pool.query(`ALTER TABLE scheme_lpcd_data_history ALTER COLUMN water_value TYPE numeric;`);
    await pool.query(`ALTER TABLE scheme_lpcd_data_history ALTER COLUMN lpcd_value TYPE numeric;`);

    // 2. Upgrade integer columns to BIGINT just in case PI returns insanely huge populations
    await pool.query(`ALTER TABLE scheme_lpcd ALTER COLUMN population TYPE bigint;`);
    await pool.query(`ALTER TABLE scheme_lpcd ALTER COLUMN total_villages TYPE bigint;`);
    await pool.query(`ALTER TABLE scheme_lpcd_data_history ALTER COLUMN population TYPE bigint;`);
    await pool.query(`ALTER TABLE scheme_lpcd_data_history ALTER COLUMN total_villages TYPE bigint;`);

    await pool.query(`ALTER TABLE water_scheme_data ALTER COLUMN population TYPE bigint;`);
    await pool.query(`ALTER TABLE water_scheme_data ALTER COLUMN number_of_esr TYPE bigint;`);
    await pool.query(`ALTER TABLE water_scheme_data_history ALTER COLUMN population TYPE bigint;`);
    await pool.query(`ALTER TABLE water_scheme_data_history ALTER COLUMN number_of_esr TYPE bigint;`);

    console.log("Successfully increased database sizes and removed strict limits!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
