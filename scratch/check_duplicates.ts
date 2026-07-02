import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query(`
      SELECT scheme_id, village_name, data_date, COUNT(*) as count
      FROM water_scheme_data_history
      WHERE data_date LIKE '%-Mar%' OR data_date LIKE '2026-03-%'
      GROUP BY scheme_id, village_name, data_date
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    console.log("Duplicate records (same scheme, village, date):", res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
