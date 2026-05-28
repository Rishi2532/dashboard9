import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const activeSchemes = await pool.query("SELECT COUNT(*) FROM scheme_status");
    console.log("Total schemes in scheme_status:", activeSchemes.rows[0].count);

    const integratedSchemes = await pool.query(
      "SELECT COUNT(*) FROM scheme_status WHERE total_esr_integrated > 0 OR total_villages_integrated > 0"
    );
    console.log("Schemes with integrated ESRs/Villages in scheme_status:", integratedSchemes.rows[0].count);

    const historySchemes = await pool.query(
      "SELECT COUNT(DISTINCT scheme_id) FROM water_scheme_data_history"
    );
    console.log("Unique scheme_ids in water_scheme_data_history:", historySchemes.rows[0].count);
    
    // Let's print unique scheme_ids in scheme_status
    const statusUniqueSchemes = await pool.query(
      "SELECT COUNT(DISTINCT scheme_id) FROM scheme_status"
    );
    console.log("Unique scheme_ids in scheme_status:", statusUniqueSchemes.rows[0].count);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
