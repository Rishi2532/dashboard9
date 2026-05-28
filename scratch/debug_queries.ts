import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const report_month = "2026-03";
    const start = new Date(`${report_month}-01T00:00:00Z`);
    const next = new Date(start);
    next.setMonth(start.getMonth() + 1);

    const startIso = start.toISOString();
    const nextIso = next.toISOString();
    const startStr = startIso.substring(0, 10);
    const nextStr = nextIso.substring(0, 10);

    const regionsToCheck = ["Amravati", "Nashik", "Pune", "Konkan", "Chhatrapati Sambhajinagar", "Nagpur"];

    for (const rn of regionsToCheck) {
      // End row: latest snapshot up to the end of the report month (i.e. < nextStr)
      let endRowRes = await pool.query(
        `SELECT id, region_name, data_month::text, uploaded_at, total_esr_integrated 
         FROM region_history WHERE region_name = $1 AND COALESCE(data_month, uploaded_at::date) < $2 
         ORDER BY COALESCE(data_month, uploaded_at::date) DESC, uploaded_at DESC LIMIT 1`,
        [rn, nextStr]
      );
      let endRow = endRowRes.rows[0] || null;

      // Start row: latest snapshot before the start of the report month (i.e. < startStr)
      let startRowRes = await pool.query(
        `SELECT id, region_name, data_month::text, uploaded_at, total_esr_integrated 
         FROM region_history WHERE region_name = $1 AND COALESCE(data_month, uploaded_at::date) < $2 
         ORDER BY COALESCE(data_month, uploaded_at::date) DESC, uploaded_at DESC LIMIT 1`,
        [rn, startStr]
      );
      let startRow = startRowRes.rows[0] || null;

      // Fallbacks
      if (!startRow && endRow) {
        const startFallback = await pool.query(
          `SELECT id, region_name, data_month::text, uploaded_at, total_esr_integrated 
           FROM region_history WHERE region_name = $1 AND COALESCE(data_month, uploaded_at::date) >= $2 AND COALESCE(data_month, uploaded_at::date) < $3 
           ORDER BY COALESCE(data_month, uploaded_at::date) ASC, uploaded_at ASC LIMIT 1`,
          [rn, startStr, nextStr]
        );
        startRow = startFallback.rows[0] || null;
      }

      console.log(`Region: ${rn}`);
      console.log(`  startRow:`, startRow);
      console.log(`  endRow:  `, endRow);
    }
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
