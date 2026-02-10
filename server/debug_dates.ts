import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const db = await getDB();

        console.log("--- Rows with '-' in date ---");
        const dashRows = await db.execute(sql`
      SELECT data_date, 
             data_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' as match_iso,
             data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' as match_dd_mon_yy,
             data_date ~ '^[0-9]+-[A-Za-z]+$' as match_dd_mon
      FROM scheme_lpcd_data_history 
      WHERE data_date LIKE '%-%'
      LIMIT 20
    `);
        console.log(JSON.stringify(dashRows.rows, null, 2));

        console.log("--- Rows that failed everything in previous logic ---");
        // The previous logic was:
        // WHEN h.data_date ~ '^\d{4}-\d{2}-\d{2}$' THEN h.data_date::date
        // WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
        // ELSE TO_DATE(h.data_date || '-' || TO_CHAR(h.uploaded_at, 'YYYY'), 'DD-Mon-YYYY')

        // We want to see what hits the ELSE but fails the TO_DATE.
        // Let's look for dates that are YYYY-MM-DD but didn't match the first regex.

        const fails = await db.execute(sql`
      SELECT data_date, uploaded_at
      FROM scheme_lpcd_data_history 
      WHERE data_date NOT ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        AND data_date NOT ~ '^[0-9]+-[A-Za-z]+-[0-9]+$'
        AND data_date LIKE '%2025%' -- specifically look for the one in error
      LIMIT 10
    `);
        console.log("Potential failures:", fails.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
