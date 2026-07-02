import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const report_month = "2026-05";
    const start = new Date(`${report_month}-01T00:00:00Z`);
    const next = new Date(start);
    next.setMonth(start.getMonth() + 1);

    const startIso = start.toISOString();
    const nextIso = next.toISOString();

    const regionsToCheck = ["Amravati", "Chhatrapati Sambhajinagar", "Konkan", "Nagpur", "Nashik", "Pune"];
    
    console.log(`Report Month: ${report_month}`);
    console.log(`startIso: ${startIso}`);
    console.log(`nextIso: ${nextIso}`);
    console.log("--------------------------------------------------------------------------------");

    for (const rn of regionsToCheck) {
      // End row: latest snapshot up to the end of the report month (i.e. < nextIso)
      let endRowRes = await pool.query(
        `SELECT region_name, data_month, uploaded_at, 
                total_schemes_integrated, total_villages_integrated, total_esr_integrated,
                flow_meter_integrated, rca_integrated, pressure_transmitter_integrated
         FROM region_history 
         WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz 
         ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
        [rn, nextIso]
      );
      let endRow = endRowRes.rows[0] || null;

      // Start row: latest snapshot before the start of the report month (i.e. < startIso)
      let startRowRes = await pool.query(
        `SELECT region_name, data_month, uploaded_at,
                total_schemes_integrated, total_villages_integrated, total_esr_integrated,
                flow_meter_integrated, rca_integrated, pressure_transmitter_integrated
         FROM region_history 
         WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz 
         ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
        [rn, startIso]
      );
      let startRow = startRowRes.rows[0] || null;

      if (!startRow && endRow) {
        const startFallback = await pool.query(
          `SELECT region_name, data_month, uploaded_at,
                  total_schemes_integrated, total_villages_integrated, total_esr_integrated,
                  flow_meter_integrated, rca_integrated, pressure_transmitter_integrated
           FROM region_history 
           WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) >= $2::timestamptz AND COALESCE(data_month, uploaded_at) < $3::timestamptz 
           ORDER BY COALESCE(data_month, uploaded_at) ASC, uploaded_at ASC LIMIT 1`,
          [rn, startIso, nextIso]
        );
        startRow = startFallback.rows[0] || null;
      }

      console.log(`Region: ${rn}`);
      if (startRow) {
        console.log(`  Start Row (data_month: ${startRow.data_month}, uploaded_at: ${startRow.uploaded_at}):`);
        console.log(`    Schemes: ${startRow.total_schemes_integrated}, Villages: ${startRow.total_villages_integrated}, ESRs: ${startRow.total_esr_integrated}`);
        console.log(`    Flow Meters: ${startRow.flow_meter_integrated}, RCA: ${startRow.rca_integrated}, PT: ${startRow.pressure_transmitter_integrated}`);
      } else {
        console.log("  Start Row: NONE");
      }
      if (endRow) {
        console.log(`  End Row (data_month: ${endRow.data_month}, uploaded_at: ${endRow.uploaded_at}):`);
        console.log(`    Schemes: ${endRow.total_schemes_integrated}, Villages: ${endRow.total_villages_integrated}, ESRs: ${endRow.total_esr_integrated}`);
        console.log(`    Flow Meters: ${endRow.flow_meter_integrated}, RCA: ${endRow.rca_integrated}, PT: ${endRow.pressure_transmitter_integrated}`);
      } else {
        console.log("  End Row: NONE");
      }

      if (startRow && endRow) {
        console.log("  Deltas (End - Start):");
        console.log(`    Schemes: ${Number(endRow.total_schemes_integrated || 0) - Number(startRow.total_schemes_integrated || 0)}`);
        console.log(`    Villages: ${Number(endRow.total_villages_integrated || 0) - Number(startRow.total_villages_integrated || 0)}`);
        console.log(`    ESRs: ${Number(endRow.total_esr_integrated || 0) - Number(startRow.total_esr_integrated || 0)}`);
        console.log(`    Flow Meters: ${Number(endRow.flow_meter_integrated || 0) - Number(startRow.flow_meter_integrated || 0)}`);
        console.log(`    RCA: ${Number(endRow.rca_integrated || 0) - Number(startRow.rca_integrated || 0)}`);
        console.log(`    PT: ${Number(endRow.pressure_transmitter_integrated || 0) - Number(startRow.pressure_transmitter_integrated || 0)}`);
      }
      console.log("--------------------------------------------------------------------------------");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
