import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT DATE_TRUNC('minute', uploaded_at) as minute, COUNT(*) as row_count, COUNT(DISTINCT village_name) as unique_villages, COUNT(DISTINCT scheme_id) as unique_schemes 
      FROM water_scheme_data_history 
      GROUP BY minute 
      ORDER BY minute DESC
    `);
    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
