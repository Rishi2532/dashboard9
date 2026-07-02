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
       WHERE (uploaded_at >= '2026-05-01' AND uploaded_at <= '2026-06-20')
          OR (data_month >= '2026-04-30' AND data_month <= '2026-06-20')
       ORDER BY uploaded_at ASC, id ASC`
    );
    console.table(res.rows.map(r => ({
      id: r.id,
      region_name: r.region_name,
      uploaded_at: r.uploaded_at.toISOString(),
      data_month: r.data_month ? r.data_month.toISOString() : "NULL",
      schemes: r.total_schemes_integrated,
      villages: r.total_villages_integrated,
      esrs: r.total_esr_integrated,
      fm: r.flow_meter_integrated,
      rca: r.rca_integrated,
      pt: r.pressure_transmitter_integrated
    })));
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();
