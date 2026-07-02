import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT region_name, 
              total_schemes_integrated, total_villages_integrated, total_esr_integrated,
              flow_meter_integrated, rca_integrated, pressure_transmitter_integrated
       FROM region
       ORDER BY region_name`
    );
    console.log("Current region table contents:");
    console.table(res.rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
