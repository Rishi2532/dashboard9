import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT scheme_id, village_name, block, data_date, uploaded_at, COUNT(*)
      FROM water_scheme_data_history
      WHERE village_name = 'Akhatwada' AND data_date = '06-Apr'
      GROUP BY scheme_id, village_name, block, data_date, uploaded_at
    `);
    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
