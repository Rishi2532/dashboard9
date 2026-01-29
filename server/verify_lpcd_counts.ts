
import { db } from "./db";
import { sql } from "drizzle-orm";

async function verifyCounts() {
  console.log("Verifying LPCD Counts...");

  // 1. Get the latest date from water_scheme_data_history
  const latestDateResult = await db.execute(sql`
    SELECT MAX(TO_DATE(data_date, 'DD-Mon-YYYY')) as max_date 
    FROM water_scheme_data_history
    WHERE data_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
  `);
  
  const latestDate = latestDateResult.rows[0]?.max_date;
  console.log("Latest Village Date (DB):", latestDate);

  // 2. Count Villages > 55 for this date
  // We need to mirror the formatting logic if dates are stored as strings
  const villageCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM water_scheme_data_history
    WHERE TO_DATE(data_date, 'DD-Mon-YYYY') = ${latestDate}
    AND NULLIF(lpcd_value, 'NaN')::numeric > 55
  `);
  
  console.log("Villages > 55 LPCD (Raw Count):", villageCountResult.rows[0]?.count);

  // 3. Get latest date from scheme_lpcd_data_history
  const latestSchemeDateResult = await db.execute(sql`
    SELECT MAX(TO_DATE(data_date, 'DD-Mon-YYYY')) as max_date 
    FROM scheme_lpcd_data_history
    WHERE data_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
  `);
  const latestSchemeDate = latestSchemeDateResult.rows[0]?.max_date;
  console.log("Latest Scheme Date (DB):", latestSchemeDate);

  // 4. Count Schemes > 55 for this date
  const schemeCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM scheme_lpcd_data_history
    WHERE TO_DATE(data_date, 'DD-Mon-YYYY') = ${latestSchemeDate}
    AND NULLIF(lpcd_value, 'NaN')::numeric > 55
  `);
  
  console.log("Schemes > 55 LPCD (Raw Count):", schemeCountResult.rows[0]?.count);

  process.exit(0);
}

verifyCounts().catch(console.error);
