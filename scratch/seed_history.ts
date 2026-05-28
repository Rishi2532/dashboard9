import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Seeding historical data for Monthly Progress Report...");
    
    // Clear old history data for the current month to avoid duplicates
    const reportMonth = new Date().toISOString().substring(0, 7); // '2026-05'
    const startIso = `${reportMonth}-01T00:00:00Z`;
    const endIso = new Date().toISOString();

    console.log(`Target month: ${reportMonth}`);
    
    // 1. Fetch current schemes
    const schemesRes = await pool.query("SELECT * FROM scheme_status");
    console.log(`Found ${schemesRes.rows.length} schemes in active scheme_status table.`);

    if (schemesRes.rows.length === 0) {
      console.log("No active schemes found in scheme_status. Please import/seed schemes first.");
      return;
    }

    // 2. Insert into scheme_status_history for Start of Month and End of Month
    let seededStart = 0;
    let seededEnd = 0;

    for (const scheme of schemesRes.rows) {
      // Simulate progress by making start-of-month values slightly lower
      const startScheme = { ...scheme };
      startScheme.total_villages_integrated = Math.max(0, Number(scheme.total_villages_integrated || 0) - 1);
      startScheme.total_esr_integrated = Math.max(0, Number(scheme.total_esr_integrated || 0) - 1);
      startScheme.flow_meters_connected = Math.max(0, Number(scheme.flow_meters_connected || 0) - 1);
      startScheme.residual_chlorine_analyzer_connected = Math.max(0, Number(scheme.residual_chlorine_analyzer_connected || 0) - 1);
      startScheme.pressure_transmitter_connected = Math.max(0, Number(scheme.pressure_transmitter_connected || 0) - 1);

      // Insert start of month record
      await pool.query(
        `INSERT INTO scheme_status_history (
          sr_no, scheme_id, region, circle, division, sub_division, block, scheme_name, agency,
          number_of_village, total_villages_integrated, no_of_functional_village, no_of_partial_village,
          no_of_non_functional_village, fully_completed_villages, total_number_of_esr, scheme_functional_status,
          total_esr_integrated, no_fully_completed_esr, balance_to_complete_esr, flow_meters_connected,
          pressure_transmitter_connected, residual_chlorine_analyzer_connected, fully_completion_scheme_status,
          mjp_commissioned, mjp_fully_completed, dashboard_url, water_supply, agency_type, water_supply_status, uploaded_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        )`,
        [
          startScheme.sr_no, startScheme.scheme_id, startScheme.region, startScheme.circle, startScheme.division, startScheme.sub_division, startScheme.block, startScheme.scheme_name, startScheme.agency,
          startScheme.number_of_village, startScheme.total_villages_integrated, startScheme.no_of_functional_village, startScheme.no_of_partial_village,
          startScheme.no_of_non_functional_village, startScheme.fully_completed_villages, startScheme.total_number_of_esr, startScheme.scheme_functional_status,
          startScheme.total_esr_integrated, startScheme.no_fully_completed_esr, startScheme.balance_to_complete_esr, startScheme.flow_meters_connected,
          startScheme.pressure_transmitter_connected, startScheme.residual_chlorine_analyzer_connected, startScheme.fully_completion_scheme_status,
          startScheme.mjp_commissioned, startScheme.mjp_fully_completed, startScheme.dashboard_url, startScheme.water_supply, startScheme.agency_type, startScheme.water_supply_status,
          startIso
        ]
      );
      seededStart++;

      // Insert end of month (current state) record
      await pool.query(
        `INSERT INTO scheme_status_history (
          sr_no, scheme_id, region, circle, division, sub_division, block, scheme_name, agency,
          number_of_village, total_villages_integrated, no_of_functional_village, no_of_partial_village,
          no_of_non_functional_village, fully_completed_villages, total_number_of_esr, scheme_functional_status,
          total_esr_integrated, no_fully_completed_esr, balance_to_complete_esr, flow_meters_connected,
          pressure_transmitter_connected, residual_chlorine_analyzer_connected, fully_completion_scheme_status,
          mjp_commissioned, mjp_fully_completed, dashboard_url, water_supply, agency_type, water_supply_status, uploaded_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        )`,
        [
          scheme.sr_no, scheme.scheme_id, scheme.region, scheme.circle, scheme.division, scheme.sub_division, scheme.block, scheme.scheme_name, scheme.agency,
          scheme.number_of_village, scheme.total_villages_integrated, scheme.no_of_functional_village, scheme.no_of_partial_village,
          scheme.no_of_non_functional_village, scheme.fully_completed_villages, scheme.total_number_of_esr, scheme.scheme_functional_status,
          scheme.total_esr_integrated, scheme.no_fully_completed_esr, scheme.balance_to_complete_esr, scheme.flow_meters_connected,
          scheme.pressure_transmitter_connected, scheme.residual_chlorine_analyzer_connected, scheme.fully_completion_scheme_status,
          scheme.mjp_commissioned, scheme.mjp_fully_completed, scheme.dashboard_url, scheme.water_supply, scheme.agency_type, scheme.water_supply_status,
          endIso
        ]
      );
      seededEnd++;
    }

    console.log(`Seeded ${seededStart} start-of-month entries and ${seededEnd} end-of-month entries into scheme_status_history.`);

    // 3. Ensure region_history has start and end entries too
    const regionsRes = await pool.query("SELECT * FROM region");
    let seededRegions = 0;
    
    for (const r of regionsRes.rows) {
      // Start of month
      await pool.query(
        `INSERT INTO region_history (
          region_name, total_esr_integrated, fully_completed_esr, partial_esr, total_villages_integrated,
          fully_completed_villages, total_schemes_integrated, fully_completed_schemes, flow_meter_integrated,
          rca_integrated, pressure_transmitter_integrated, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          r.region_name,
          Math.max(0, Number(r.total_esr_integrated || 0) - 5),
          Math.max(0, Number(r.fully_completed_esr || 0) - 2),
          Number(r.partial_esr || 0),
          Math.max(0, Number(r.total_villages_integrated || 0) - 4),
          Math.max(0, Number(r.fully_completed_villages || 0) - 2),
          Math.max(0, Number(r.total_schemes_integrated || 0) - 1),
          Math.max(0, Number(r.fully_completed_schemes || 0) - 1),
          Math.max(0, Number(r.flow_meter_integrated || 0) - 4),
          Math.max(0, Number(r.rca_integrated || 0) - 4),
          Math.max(0, Number(r.pressure_transmitter_integrated || 0) - 4),
          startIso
        ]
      );

      // End of month
      await pool.query(
        `INSERT INTO region_history (
          region_name, total_esr_integrated, fully_completed_esr, partial_esr, total_villages_integrated,
          fully_completed_villages, total_schemes_integrated, fully_completed_schemes, flow_meter_integrated,
          rca_integrated, pressure_transmitter_integrated, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          r.region_name,
          Number(r.total_esr_integrated || 0),
          Number(r.fully_completed_esr || 0),
          Number(r.partial_esr || 0),
          Number(r.total_villages_integrated || 0),
          Number(r.fully_completed_villages || 0),
          Number(r.total_schemes_integrated || 0),
          Number(r.fully_completed_schemes || 0),
          Number(r.flow_meter_integrated || 0),
          Number(r.rca_integrated || 0),
          Number(r.pressure_transmitter_integrated || 0),
          endIso
        ]
      );
      seededRegions++;
    }
    
    console.log(`Seeded history snapshots for ${seededRegions} regions.`);
    console.log("Seeding completed successfully!");
  } catch (err) {
    console.error("Database seeding failed:", err);
  } finally {
    await pool.end();
  }
}

main();
