import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT DISTINCT uploaded_at 
       FROM scheme_status_history 
       WHERE uploaded_at >= '2026-05-01T00:00:00.000Z' AND uploaded_at < '2026-06-01T00:00:00.000Z'
       ORDER BY uploaded_at ASC`
    );
    console.log("Unique scheme_status_history upload times in May 2026:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
