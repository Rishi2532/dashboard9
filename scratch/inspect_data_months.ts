import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT id, region_name, data_month, uploaded_at 
       FROM region_history 
       WHERE data_month IS NOT NULL
       ORDER BY data_month ASC, uploaded_at ASC`
    );
    for (const r of res.rows) {
      console.log(`ID: ${r.id}, Region: ${r.region_name}, data_month: ${r.data_month.toISOString()} (type: ${typeof r.data_month}, raw: ${r.data_month}), uploaded_at: ${r.uploaded_at.toISOString()}`);
    }
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
