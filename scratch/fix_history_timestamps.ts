import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Re-updating uploaded_at in water_scheme_data_history to be safely inside the months...");
    
    // Update April records to 2026-04-30 12:00:00 UTC (17:30:00 IST)
    const aprilUpdate = await pool.query(`
      UPDATE water_scheme_data_history 
      SET uploaded_at = '2026-04-30 12:00:00Z'::timestamptz + (id * interval '1 millisecond')
      WHERE (data_date LIKE '%-Apr%' OR data_date LIKE '2026-04-%')
        AND (uploaded_at > '2026-05-15 00:00:00Z' OR uploaded_at > '2026-04-30 23:00:00Z')
    `);
    console.log(`Updated ${aprilUpdate.rowCount} April records.`);

    // Update March records to 2026-03-31 12:00:00 UTC (17:30:00 IST)
    const marchUpdate = await pool.query(`
      UPDATE water_scheme_data_history 
      SET uploaded_at = '2026-03-31 12:00:00Z'::timestamptz + (id * interval '1 millisecond')
      WHERE (data_date LIKE '%-Mar%' OR data_date LIKE '2026-03-%')
        AND (uploaded_at > '2026-05-15 00:00:00Z' OR uploaded_at > '2026-03-31 23:00:00Z')
    `);
    console.log(`Updated ${marchUpdate.rowCount} March records.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
