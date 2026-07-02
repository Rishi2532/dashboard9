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
       ORDER BY uploaded_at ASC, region_name ASC`
    );
    
    // Group by uploaded_at
    const groups = new Map<string, any[]>();
    for (const row of res.rows) {
      const timeStr = new Date(row.uploaded_at).toISOString();
      if (!groups.has(timeStr)) {
        groups.set(timeStr, []);
      }
      groups.get(timeStr)!.push(row);
    }

    console.log(`Found ${groups.size} upload batches today.`);
    for (const [time, rows] of groups.entries()) {
      console.log(`\n================================================================================`);
      console.log(`Upload Batch Time: ${time}`);
      console.log(`data_month: ${rows[0].data_month}`);
      console.log(`--------------------------------------------------------------------------------`);
      for (const row of rows) {
        console.log(`${row.region_name.padEnd(25)} | Schemes: ${String(row.total_schemes_integrated).padEnd(4)} | Villages: ${String(row.total_villages_integrated).padEnd(4)} | ESRs: ${String(row.total_esr_integrated).padEnd(4)} | FM: ${String(row.flow_meter_integrated).padEnd(4)} | RCA: ${String(row.rca_integrated).padEnd(4)} | PT: ${String(row.pressure_transmitter_integrated).padEnd(4)}`);
      }
    }
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
