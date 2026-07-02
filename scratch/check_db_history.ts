import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT DISTINCT data_month, uploaded_at 
       FROM region_history 
       ORDER BY data_month NULLS FIRST, uploaded_at DESC`
    );
    console.log("Distinct history timestamps:");
    console.table(res.rows.map(r => ({
      data_month: r.data_month ? r.data_month.toISOString() : "NULL",
      uploaded_at: r.uploaded_at ? r.uploaded_at.toISOString() : "NULL"
    })));
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
