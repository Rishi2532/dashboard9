import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Sum from scheme_status table
    const schemeRes = await pool.query(
      `SELECT region,
              COUNT(scheme_id) as scheme_count,
              SUM(COALESCE(number_of_village, 0)) as total_villages,
              SUM(COALESCE(total_villages_integrated, 0)) as integrated_villages,
              SUM(COALESCE(fully_completed_villages, 0)) as completed_villages,
              SUM(COALESCE(total_number_of_esr, 0)) as total_esr,
              SUM(COALESCE(total_esr_integrated, 0)) as integrated_esrs,
              SUM(COALESCE(no_fully_completed_esr, 0)) as completed_esrs,
              SUM(COALESCE(flow_meters_connected, 0)) as flow_meters,
              SUM(COALESCE(residual_chlorine_analyzer_connected, 0)) as rca,
              SUM(COALESCE(pressure_transmitter_connected, 0)) as pt
       FROM scheme_status
       GROUP BY region
       ORDER BY region`
    );

    // Current values in region table
    const regionRes = await pool.query(
      `SELECT region_name, 
              total_schemes_integrated, total_villages_integrated, total_esr_integrated,
              flow_meter_integrated, rca_integrated, pressure_transmitter_integrated
       FROM region
       ORDER BY region_name`
    );

    console.log("=== SUMS OF SCHEMES IN scheme_status ===");
    console.table(schemeRes.rows);

    console.log("\n=== VALUES IN region TABLE ===");
    console.table(regionRes.rows);

    console.log("\n=== COMPARISON ===");
    for (const rRow of regionRes.rows) {
      const sRow = schemeRes.rows.find(s => s.region === rRow.region_name);
      if (sRow) {
        console.log(`Region: ${rRow.region_name}`);
        console.log(`  Schemes:   Region Table = ${rRow.total_schemes_integrated}, Schemes Sum = ${sRow.scheme_count}`);
        console.log(`  Villages:  Region Table = ${rRow.total_villages_integrated}, Schemes Sum = ${sRow.integrated_villages}`);
        console.log(`  ESRs:      Region Table = ${rRow.total_esr_integrated}, Schemes Sum = ${sRow.integrated_esrs}`);
        console.log(`  Flow Mtr:  Region Table = ${rRow.flow_meter_integrated}, Schemes Sum = ${sRow.flow_meters}`);
        console.log(`  RCA:       Region Table = ${rRow.rca_integrated}, Schemes Sum = ${sRow.rca}`);
        console.log(`  PT:        Region Table = ${rRow.pressure_transmitter_integrated}, Schemes Sum = ${sRow.pt}`);
        console.log("--------------------------------------------------");
      } else {
        console.log(`Region ${rRow.region_name} not found in scheme_status!`);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
