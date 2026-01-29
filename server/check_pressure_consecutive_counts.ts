
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function checkConsecutiveCounts() {
  try {
    const db = await getDB();
    console.log("Checking Offline Days (from communication_status)...");
    
    // Check Offline Days
    const offlineResult = await db.execute(sql`
      SELECT 
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pressure_last_seen))::integer as days,
        COUNT(*) as count
      FROM communication_status 
      WHERE pressure_connected = 'Connected'
        AND pressure_status = 'Offline'
        AND pressure_last_seen IS NOT NULL
      GROUP BY days
      ORDER BY days
    `);
    
    console.log(`offlineResult.rows.length: ${offlineResult.rows.length}`); 

    console.log("\nOffline Days Distribution:");
    console.log("Days | Count");
    console.log("-----|------");
    for (const row of offlineResult.rows) {
        if (Number(row.days) <= 100) { // Limit output
            console.log(`${String(row.days).padEnd(4)} | ${row.count}`);
        }
    }

    console.log("\nChecking Pressure History Consecutive Days (Logic Validation)...");
    
    // Check max consecutive days using the robust CTE logic (simplified for check)
    // We want to see if we can perform the CTE logic here
    const historyCheck = await db.execute(sql`
        WITH ranked_history AS (
          SELECT 
            ph.scheme_id,
            ph.village_name,
            ph.esr_name,
            TO_DATE(ph.pressure_date, 'DD-Mon-YY') as date_val, -- Using the simple one for now as we know format
            ROW_NUMBER() OVER (PARTITION BY ph.scheme_id, ph.village_name, ph.esr_name ORDER BY TO_DATE(ph.pressure_date, 'DD-Mon-YY') DESC) as rn,
            CASE WHEN ph.pressure_value < 0.2 THEN 1 ELSE 0 END as is_below
          FROM pressure_history ph
          WHERE TO_DATE(ph.pressure_date, 'DD-Mon-YY') >= CURRENT_DATE - INTERVAL '30 days'
            AND ph.pressure_value IS NOT NULL
        ),
        valid_history AS (
            SELECT * FROM ranked_history
        ),
        pressure_consecutive AS (
          SELECT 
            rh1.scheme_id,
            rm1.cnt 
          FROM (SELECT DISTINCT scheme_id, village_name, esr_name FROM valid_history) rh1
          JOIN LATERAL (
              SELECT COUNT(*) as cnt
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.is_below = 1
                AND rh2.rn <= (
                    SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                    FROM valid_history rh3
                    WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND rh3.is_below = 0
                )
          ) rm1 ON true
        )
        SELECT cnt as days, COUNT(*) as count 
        FROM pressure_consecutive 
        WHERE cnt > 0
        GROUP BY cnt 
        ORDER BY cnt
    `);
    
    console.log(`historyCheck.rows.length: ${historyCheck.rows.length}`);

    console.log("\nBelow 0.2 Consecutive Days Distribution (Sample Metric):");
    console.log("Days | Count");
    console.log("-----|------");
    for (const row of historyCheck.rows) {
         console.log(`${String(row.days).padEnd(4)} | ${row.count}`);
    }

  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

checkConsecutiveCounts();
