import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const PuneHistory = await pool.query(
      "SELECT region_name, data_month, uploaded_at, total_villages_integrated, fully_completed_villages, rca_integrated FROM region_history WHERE region_name IN ('Pune', 'Nagpur') ORDER BY region_name, data_month ASC, uploaded_at ASC"
    );
    console.log("Region history rows for Pune and Nagpur:");
    console.table(PuneHistory.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
