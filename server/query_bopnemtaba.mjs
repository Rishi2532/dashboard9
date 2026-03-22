import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const result = await pool.query(`
      SELECT scheme_name, village_name, population, water_value, lpcd_value, data_date
      FROM water_scheme_data_history
      WHERE village_name ILIKE '%Bopnemtaba%'
      ORDER BY data_date DESC
      LIMIT 7;
    `);
    console.table(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
