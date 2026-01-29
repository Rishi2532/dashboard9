
import { getDB } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function debugChlorineHistory() {
  const db = await getDB();
// ... (rest of code)

  console.log("Finding schemes with most history in last 30 days...");

  const result = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, COUNT(*) as count
    FROM chlorine_history
    WHERE TO_DATE(
      CASE 
        WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN chlorine_date
        WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN chlorine_date
        ELSE NULL 
      END,
      CASE 
        WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN 'DD-Mon-YYYY'
        WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 'YYYY-MM-DD'
        ELSE 'DD-Mon-YYYY'
      END
    ) >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY scheme_id, village_name, esr_name
    ORDER BY count DESC
    LIMIT 5
  `);

  console.log("Top 5 schemes:", result.rows);

  if (result.rows.length === 0) {
    console.log("No history found.");
    return;
  }

  const target = result.rows[0] as any;

  console.log(`\nInspecting ALL history for ${target.scheme_id} (${target.village_name})...`);

  // Count total rows
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM chlorine_history 
    WHERE scheme_id = ${target.scheme_id}
  `);
  console.log(`Total rows in DB for this scheme: ${countResult.rows[0].total}`);

  const history = await db.execute(sql`
    SELECT 
      chlorine_value,
      chlorine_date,
      TO_DATE(
        CASE 
          WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN chlorine_date
          WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN chlorine_date
          WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE)
          ELSE NULL 
        END, 
        CASE 
          WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN 'DD-Mon-YYYY'
          WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 'YYYY-MM-DD'
          WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 'DD-Mon-YYYY'
          ELSE 'DD-Mon-YYYY'
        END
      ) as parsed_date
    FROM chlorine_history
    WHERE scheme_id = ${target.scheme_id}
      AND village_name = ${target.village_name}
    ORDER BY parsed_date DESC NULLS LAST
    LIMIT 50
  `);

  fs.writeFileSync('server/debug_result.json', JSON.stringify(history.rows, null, 2));
  console.log("Written to server/debug_result.json");
}

debugChlorineHistory().catch(console.error);
