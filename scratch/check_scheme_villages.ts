import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const totalRows = await pool.query("SELECT COUNT(*) FROM water_scheme_data_history");
    console.log("Total rows in water_scheme_data_history:", totalRows.rows[0].count);

    const sample = await pool.query(
      "SELECT scheme_id, scheme_name, village_name, data_date, lpcd_value FROM water_scheme_data_history LIMIT 10"
    );
    console.log("Sample records:");
    console.table(sample.rows);

    const schemeVillageCount = await pool.query(
      "SELECT scheme_id, COUNT(DISTINCT village_name) as village_count FROM water_scheme_data_history GROUP BY scheme_id LIMIT 10"
    );
    console.log("Scheme village counts:");
    console.table(schemeVillageCount.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
