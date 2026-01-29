
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function reproduceIssue() {
  try {
    const db = await getDB();
    const villageName = "Shirajgaon"; // Target village
    
    console.log(`Checking data for village: ${villageName}`);

    // 1. Get Scheme ID and Basic Info
    const sensorInfo = await db.execute(sql`
        SELECT DISTINCT scheme_id, village_name, esr_name
        FROM pressure_history
        WHERE village_name ILIKE ${'%' + villageName + '%'}
        LIMIT 1
    `);

    if (sensorInfo.rows.length === 0) {
        console.log("No sensor found for that village.");
        process.exit(0);
    }

    const { scheme_id, esr_name } = sensorInfo.rows[0];
    console.log(`Found Sensor: Scheme=${scheme_id}, ESR=${esr_name}`);

    // 2. Show Raw History (Latest 10)
    console.log("\nRaw History (Last 10 records):");
    const rawHistory = await db.execute(sql`
        SELECT pressure_date, pressure_value, uploaded_at
        FROM pressure_history
        WHERE scheme_id = ${scheme_id} 
          AND village_name = ${sensorInfo.rows[0].village_name}
          AND esr_name = ${esr_name}
          AND pressure_value IS NOT NULL
        ORDER BY 
            CASE 
                WHEN pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(pressure_date, 'DD-Mon-YYYY')
                WHEN pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN TO_DATE(pressure_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                ELSE NULL
            END DESC
        LIMIT 10
    `);
    console.table(rawHistory.rows);

    // 3. Run the CURRENT "Bad" Logic Query
    console.log("\nCurrent SQL Logic Result:");
    const currentLogic = await db.execute(sql`
        WITH ranked_history AS (
            SELECT 
              ph.scheme_id, ph.village_name, ph.esr_name,
              TO_DATE(ph.pressure_date, 'DD-Mon-YY') as date_val,
              ROW_NUMBER() OVER (
                PARTITION BY ph.scheme_id, ph.village_name, ph.esr_name 
                ORDER BY TO_DATE(ph.pressure_date, 'DD-Mon-YY') DESC
              ) as rn,
              CASE WHEN ph.pressure_value >= 0.2 AND ph.pressure_value <= 0.7 THEN 1 ELSE 0 END as is_optimal
            FROM pressure_history ph
            WHERE ph.scheme_id = ${scheme_id}
              AND ph.village_name = ${sensorInfo.rows[0].village_name}
              AND ph.esr_name = ${esr_name}
              AND ph.pressure_value IS NOT NULL
        ),
        valid_history AS (SELECT * FROM ranked_history),
        pressure_consecutive AS (
            SELECT 
                (
                    SELECT COUNT(*)
                    FROM valid_history rh2
                    WHERE rh2.rn <= (
                        SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                        FROM valid_history rh3
                        WHERE rh3.is_optimal = 0 AND rh3.rn > 0
                    )
                    AND rh2.is_optimal = 1
                ) as consecutive_optimal
            FROM valid_history LIMIT 1
        )
        SELECT * FROM pressure_consecutive
    `);
    console.log("Consecutive Optimal (Current):", currentLogic.rows[0]);

    // 4. Run the "FIXED" Logic (Gap Detection)
    console.log("\nFixed SQL Logic Result (Prototype):");
    const fixedLogic = await db.execute(sql`
        WITH ranked_history AS (
            SELECT 
              ph.scheme_id, ph.village_name, ph.esr_name,
              TO_DATE(ph.pressure_date, 'DD-Mon-YY') as date_val,
              
              -- Calculate Previous Date (which is logically 'tomorrow' in DESC sort)
              LAG(TO_DATE(ph.pressure_date, 'DD-Mon-YY')) OVER (
                PARTITION BY ph.scheme_id, ph.village_name, ph.esr_name 
                ORDER BY TO_DATE(ph.pressure_date, 'DD-Mon-YY') DESC
              ) as prev_date_val,

              ROW_NUMBER() OVER (
                PARTITION BY ph.scheme_id, ph.village_name, ph.esr_name 
                ORDER BY TO_DATE(ph.pressure_date, 'DD-Mon-YY') DESC
              ) as rn,
              CASE WHEN ph.pressure_value >= 0.2 AND ph.pressure_value <= 0.7 THEN 1 ELSE 0 END as is_optimal
            FROM pressure_history ph
            WHERE ph.scheme_id = ${scheme_id}
              AND ph.village_name = ${sensorInfo.rows[0].village_name}
              AND ph.esr_name = ${esr_name}
              AND ph.pressure_value IS NOT NULL
        ),
        valid_history_with_gaps AS (
            SELECT *,
                -- Gap if difference between this row and previous row (which is newer) > 1 day
                -- Note: For RN=1, prev_date_val is NULL.
                CASE 
                    WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
                    ELSE 0 
                END as is_gap
            FROM ranked_history
        ),
        pressure_consecutive AS (
            SELECT 
                (
                    SELECT COUNT(*)
                    FROM valid_history_with_gaps rh2
                    WHERE rh2.rn <= (
                        SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                        FROM valid_history_with_gaps rh3
                        WHERE (rh3.is_optimal = 0 OR rh3.is_gap = 1) -- BREAK ON GAP OR BAD STATUS
                          AND rh3.rn > 0
                    )
                    AND rh2.is_optimal = 1
                ) as consecutive_optimal
            FROM valid_history_with_gaps LIMIT 1
        )
        SELECT * FROM pressure_consecutive
    `);
    console.log("Consecutive Optimal (Fixed):", fixedLogic.rows[0]);

  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

reproduceIssue();
