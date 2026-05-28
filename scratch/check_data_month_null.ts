import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT COUNT(*) as total_rows, COUNT(data_month) as rows_with_data_month 
       FROM region_history`
    );
    console.log("Region history stats:");
    console.table(res.rows);

    const latest = await pool.query(
      `SELECT id, region_name, uploaded_at, data_month 
       FROM region_history 
       ORDER BY id DESC 
       LIMIT 5`
    );
    console.log("Latest records:");
    console.table(latest.rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
