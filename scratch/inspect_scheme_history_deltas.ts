import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const report_month = "2026-05";
    
    const regionsToCheck = ["Amravati", "Chhatrapati Sambhajinagar", "Konkan", "Nagpur", "Nashik", "Pune"];
    
    console.log(`Checking scheme_status_history progress for May 2026 using date grouping...`);
    console.log(`--------------------------------------------------------------------------------`);

    for (const region of regionsToCheck) {
      // Find the earliest date in May 2026
      const startRes = await pool.query(
        `SELECT DISTINCT uploaded_at::date as upload_date
         FROM scheme_status_history 
         WHERE region = $1 AND uploaded_at >= '2026-05-01T00:00:00.000Z' AND uploaded_at < '2026-05-10T00:00:00.000Z'
         ORDER BY upload_date ASC LIMIT 1`,
        [region]
      );
      const startDate = startRes.rows[0]?.upload_date || null;

      // Find the latest date in May 2026
      const endRes = await pool.query(
        `SELECT DISTINCT uploaded_at::date as upload_date
         FROM scheme_status_history 
         WHERE region = $1 AND uploaded_at >= '2026-05-20T00:00:00.000Z' AND uploaded_at < '2026-06-01T00:00:00.000Z'
         ORDER BY upload_date DESC LIMIT 1`,
        [region]
      );
      const endDate = endRes.rows[0]?.upload_date || null;

      if (!startDate || !endDate) {
        console.log(`Region: ${region}`);
        console.log(`  Could not find start or end date in scheme_status_history for May 2026.`);
        console.log("--------------------------------------------------------------------------------");
        continue;
      }

      // Query aggregated start data
      const startDataRes = await pool.query(
        `SELECT 
           COUNT(DISTINCT scheme_id) as schemes,
           SUM(COALESCE(number_of_village, 0)) as total_villages,
           SUM(COALESCE(total_villages_integrated, 0)) as villages,
           SUM(COALESCE(total_esr_integrated, 0)) as esrs,
           SUM(COALESCE(flow_meters_connected, 0)) as flow_meters,
           SUM(COALESCE(residual_chlorine_analyzer_connected, 0)) as rca,
           SUM(COALESCE(pressure_transmitter_connected, 0)) as pt
         FROM scheme_status_history
         WHERE region = $1 AND uploaded_at::date = $2`,
        [region, startDate]
      );
      const startData = startDataRes.rows[0];

      // Query aggregated end data
      const endDataRes = await pool.query(
        `SELECT 
           COUNT(DISTINCT scheme_id) as schemes,
           SUM(COALESCE(number_of_village, 0)) as total_villages,
           SUM(COALESCE(total_villages_integrated, 0)) as villages,
           SUM(COALESCE(total_esr_integrated, 0)) as esrs,
           SUM(COALESCE(flow_meters_connected, 0)) as flow_meters,
           SUM(COALESCE(residual_chlorine_analyzer_connected, 0)) as rca,
           SUM(COALESCE(pressure_transmitter_connected, 0)) as pt
         FROM scheme_status_history
         WHERE region = $1 AND uploaded_at::date = $2`,
        [region, endDate]
      );
      const endData = endDataRes.rows[0];

      const startD = new Date(startDate).toISOString().substring(0, 10);
      const endD = new Date(endDate).toISOString().substring(0, 10);

      console.log(`Region: ${region}`);
      console.log(`  Start Date (${startD}): Schemes: ${startData.schemes}, Villages: ${startData.villages}, ESRs: ${startData.esrs}, FM: ${startData.flow_meters}, RCA: ${startData.rca}, PT: ${startData.pt}`);
      console.log(`  End Date (${endD}):   Schemes: ${endData.schemes}, Villages: ${endData.villages}, ESRs: ${endData.esrs}, FM: ${endData.flow_meters}, RCA: ${endData.rca}, PT: ${endData.pt}`);
      console.log(`  Deltas:`);
      console.log(`    Schemes:     ${endData.schemes - startData.schemes}`);
      console.log(`    Villages:    ${endData.villages - startData.villages}`);
      console.log(`    ESRs:        ${endData.esrs - startData.esrs}`);
      console.log(`    Flow Meters: ${endData.flow_meters - startData.flow_meters}`);
      console.log(`    RCA:         ${endData.rca - startData.rca}`);
      console.log(`    PT:          ${endData.pt - startData.pt}`);
      console.log("--------------------------------------------------------------------------------");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
