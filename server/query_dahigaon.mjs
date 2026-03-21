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
      WHERE village_name ILIKE '%Dahigaon%'
      AND scheme_name ILIKE '%Takli & 4 Villages%'
      ORDER BY data_date DESC
      LIMIT 14;
    `);
    console.table(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
