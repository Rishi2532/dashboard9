import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT region_name, uploaded_at, data_month, 
              data_month::text as data_month_text,
              uploaded_at::date::text as uploaded_at_date_text
       FROM region_history 
       ORDER BY id DESC`
    );
    console.table(res.rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
