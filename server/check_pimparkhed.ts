import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function checkPimparkhedSensor() {
  console.log("🔍 Checking Pimparkhed Sensor\n");
  console.log("Village: Pimparkhed");
  console.log("ESR: Existing 0.75 LL ESR\n");
  
  try {
    const db = await getDB();
    
    // Get chlorine history for this specific sensor
    const query = sql`
      SELECT 
        ch.chlorine_date,
        ch.chlorine_value,
        -- Robust Date Parsing
        (
          CASE 
            WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
            WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
            WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
            WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
              CASE 
                WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END
        ) as parsed_date,
        CASE WHEN ch.chlorine_value >= 0.2 AND ch.chlorine_value <= 0.5 THEN 'OPTIMAL' ELSE 'NOT OPTIMAL' END as status
      FROM chlorine_history ch
      WHERE ch.village_name = 'Pimparkhed'
        AND ch.esr_name = 'Existing 0.75 LL ESR'
      ORDER BY 
        (
          CASE 
            WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
            WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
            WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
            WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
              CASE 
                WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END
        ) DESC NULLS LAST
      LIMIT 30
    `;
    
    const result = await db.execute(query);
    const rows = result.rows as any[];
    
    console.log("Recent history (most recent first):\n");
    console.log("Date String    | Parsed Date | Value | Status");
    console.log("---------------|-------------|-------|------------");
    
    let consecutiveOptimal = 0;
    let prevDate: Date | null = null;
    
    for (const row of rows) {
      const parsedDate = row.parsed_date ? new Date(row.parsed_date) : null;
      const isOptimal = row.status === 'OPTIMAL';
      
      console.log(
        `${String(row.chlorine_date).padEnd(14)} | ` +
        `${parsedDate ? parsedDate.toISOString().split('T')[0] : 'NULL'.padEnd(10)} | ` +
        `${String(row.chlorine_value).padStart(5)} | ` +
        `${row.status}`
      );
      
      // Calculate consecutive optimal days
      if (isOptimal && parsedDate) {
        if (prevDate === null) {
          // First optimal record
          consecutiveOptimal = 1;
        } else {
          const daysDiff = Math.floor((prevDate.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            // Consecutive day
            consecutiveOptimal++;
          } else {
            // Gap detected - stop counting
            break;
          }
        }
        prevDate = parsedDate;
      } else {
        // Not optimal or null date - stop counting
        break;
      }
    }
    
    console.log(`\n📊 RESULT:`);
    console.log(`   Consecutive optimal days: ${consecutiveOptimal}`);
    console.log(`\n${consecutiveOptimal === 7 ? '✅' : '⚠️'} UI shows: 7 days`);
    console.log(`   Backend calculates: ${consecutiveOptimal} days`);
    
    if (consecutiveOptimal !== 7) {
      console.log(`\n❌ MISMATCH! The calculation differs from the UI.`);
    } else {
      console.log(`\n✅ MATCH! The calculation is correct.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkPimparkhedSensor();
