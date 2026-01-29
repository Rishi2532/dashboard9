
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function checkDuplicates() {
  try {
    const db = await getDB();
    console.log("Checking for duplicate entries (same sensor, same date)...");
    
    // Check if any sensor has > 1 record for the same date
    const result = await db.execute(sql`
      SELECT 
        scheme_id,
        village_name,
        esr_name,
        pressure_date,
        COUNT(*) as count
      FROM pressure_history 
      GROUP BY scheme_id, village_name, esr_name, pressure_date
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log(`\nFound ${result.rows.length} duplicate groups (showing top 20):`);
    console.log("Scheme | Village | ESR | Date | Count");
    console.log("-------|---------|-----|------|------");
    
    for (const row of result.rows) {
        console.log(`${String(row.scheme_id).substring(0,6)} | ${String(row.village_name).substring(0,8)} | ${String(row.esr_name).substring(0,5)} | ${row.pressure_date} | ${row.count}`);
    }

    if (result.rows.length === 0) {
        console.log("No duplicates found. Every sensor has exactly 1 record per date.");
    } else {
        console.log("\nCONCLUSION: The '14 days' issue is likely because we are counting RECORDS instead of DAYS.");
    }

  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

checkDuplicates();
