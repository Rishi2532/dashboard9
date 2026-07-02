import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT id, region_name, uploaded_at, data_month,
              total_schemes_integrated, total_villages_integrated, total_esr_integrated,
              flow_meter_integrated, rca_integrated, pressure_transmitter_integrated
       FROM region_history 
       WHERE uploaded_at >= '2026-06-18T00:00:00.000Z'
       ORDER BY uploaded_at DESC, id DESC`
    );
    console.log("Region history records uploaded today (June 18, 2026):");
    console.table(res.rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
