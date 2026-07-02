import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Starting clean and migrate process...");
    await pool.query("BEGIN");

    // Delete existing records for the 4 dates
    const dataMonths = [
      "2026-04-30T18:30:00.000Z",
      "2026-05-31T18:30:00.000Z",
      "2026-06-09T18:30:00.000Z",
      "2026-06-14T18:30:00.000Z"
    ];

    for (const dm of dataMonths) {
      const del = await pool.query(
        `DELETE FROM region_history WHERE data_month = $1`,
        [dm]
      );
      console.log(`Deleted ${del.rowCount} records for data_month = ${dm}`);
    }

    // May 4, 2026 Baseline data (stored as May 1st baseline)
    const may4Data = [
      { name: "Nagpur", schemes: 25, villages: 190, villages_comp: 158, esr: 280, esr_comp: 233, partial_esr: 47, fm: 280, rca: 249, pt: 252 },
      { name: "Chhatrapati Sambhajinagar", schemes: 23, villages: 517, villages_comp: 393, esr: 602, esr_comp: 448, partial_esr: 154, fm: 581, rca: 531, pt: 468 },
      { name: "Pune", schemes: 31, villages: 171, villages_comp: 114, esr: 348, esr_comp: 196, partial_esr: 152, fm: 337, rca: 265, pt: 265 },
      { name: "Konkan", schemes: 14, villages: 141, villages_comp: 50, esr: 182, esr_comp: 70, partial_esr: 112, fm: 167, rca: 163, pt: 78 },
      { name: "Amravati", schemes: 60, villages: 717, villages_comp: 243, esr: 913, esr_comp: 587, partial_esr: 326, fm: 886, rca: 757, pt: 630 },
      { name: "Nashik", schemes: 73, villages: 495, villages_comp: 181, esr: 655, esr_comp: 510, partial_esr: 145, fm: 620, rca: 608, pt: 541 }
    ];

    // June 2, 2026 Baseline data (stored as June 1st baseline)
    const june2Data = [
      { name: "Nagpur", schemes: 25, villages: 190, villages_comp: 159, esr: 280, esr_comp: 232, partial_esr: 48, fm: 280, rca: 248, pt: 252 },
      { name: "Chhatrapati Sambhajinagar", schemes: 23, villages: 526, villages_comp: 441, esr: 619, esr_comp: 509, partial_esr: 110, fm: 607, rca: 556, pt: 519 },
      { name: "Pune", schemes: 31, villages: 171, villages_comp: 111, esr: 349, esr_comp: 197, partial_esr: 152, fm: 339, rca: 265, pt: 267 },
      { name: "Konkan", schemes: 14, villages: 141, villages_comp: 51, esr: 182, esr_comp: 70, partial_esr: 112, fm: 167, rca: 163, pt: 78 },
      { name: "Amravati", schemes: 60, villages: 718, villages_comp: 263, esr: 921, esr_comp: 624, partial_esr: 297, fm: 897, rca: 765, pt: 669 },
      { name: "Nashik", schemes: 73, villages: 497, villages_comp: 181, esr: 657, esr_comp: 517, partial_esr: 140, fm: 623, rca: 609, pt: 549 }
    ];

    // June 10, 2026 data
    const june10Data = [
      { name: "Nagpur", schemes: 25, villages: 190, villages_comp: 159, esr: 280, esr_comp: 232, partial_esr: 48, fm: 280, rca: 248, pt: 252 },
      { name: "Chhatrapati Sambhajinagar", schemes: 23, villages: 526, villages_comp: 459, esr: 619, esr_comp: 527, partial_esr: 92, fm: 609, rca: 557, pt: 533 },
      { name: "Pune", schemes: 31, villages: 171, villages_comp: 111, esr: 349, esr_comp: 197, partial_esr: 152, fm: 339, rca: 265, pt: 267 },
      { name: "Konkan", schemes: 14, villages: 141, villages_comp: 51, esr: 182, esr_comp: 70, partial_esr: 112, fm: 167, rca: 163, pt: 78 },
      { name: "Amravati", schemes: 60, villages: 718, villages_comp: 265, esr: 921, esr_comp: 627, partial_esr: 294, fm: 897, rca: 765, pt: 672 },
      { name: "Nashik", schemes: 73, villages: 497, villages_comp: 183, esr: 657, esr_comp: 520, partial_esr: 137, fm: 624, rca: 610, pt: 552 }
    ];

    // June 15, 2026 data
    const june15Data = [
      { name: "Nagpur", schemes: 25, villages: 190, villages_comp: 159, esr: 280, esr_comp: 232, partial_esr: 48, fm: 280, rca: 248, pt: 252 },
      { name: "Chhatrapati Sambhajinagar", schemes: 23, villages: 526, villages_comp: 461, esr: 619, esr_comp: 529, partial_esr: 90, fm: 609, rca: 557, pt: 535 },
      { name: "Pune", schemes: 31, villages: 171, villages_comp: 111, esr: 349, esr_comp: 197, partial_esr: 152, fm: 339, rca: 265, pt: 267 },
      { name: "Konkan", schemes: 14, villages: 141, villages_comp: 51, esr: 182, esr_comp: 70, partial_esr: 112, fm: 167, rca: 163, pt: 78 },
      { name: "Amravati", schemes: 60, villages: 718, villages_comp: 265, esr: 921, esr_comp: 627, partial_esr: 294, fm: 897, rca: 765, pt: 672 },
      { name: "Nashik", schemes: 73, villages: 498, villages_comp: 184, esr: 659, esr_comp: 522, partial_esr: 137, fm: 626, rca: 610, pt: 557 }
    ];

    const insertBatch = async (batch: any[], month: string, uploadTime: string) => {
      for (const row of batch) {
        await pool.query(
          `INSERT INTO region_history (
             region_name, total_schemes_integrated, total_villages_integrated, fully_completed_villages,
             total_esr_integrated, fully_completed_esr, partial_esr,
             flow_meter_integrated, rca_integrated, pressure_transmitter_integrated,
             data_month, uploaded_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            row.name, row.schemes, row.villages, row.villages_comp,
            row.esr, row.esr_comp, row.partial_esr,
            row.fm, row.rca, row.pt,
            month, uploadTime
          ]
        );
      }
    };

    console.log("Inserting May 4 Baseline...");
    await insertBatch(may4Data, "2026-04-30T18:30:00.000Z", "2026-05-04T12:00:00.000Z");

    console.log("Inserting June 2 Baseline...");
    await insertBatch(june2Data, "2026-05-31T18:30:00.000Z", "2026-06-02T12:00:00.000Z");

    console.log("Inserting June 10 Baseline...");
    await insertBatch(june10Data, "2026-06-09T18:30:00.000Z", "2026-06-10T12:00:00.000Z");

    console.log("Inserting June 15 Baseline...");
    await insertBatch(june15Data, "2026-06-14T18:30:00.000Z", "2026-06-15T12:00:00.000Z");

    await pool.query("COMMIT");
    console.log("Cleanup and Migration completed successfully!");

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Migration failed, rolled back:", err);
  } finally {
    await pool.end();
  }
}

main();
