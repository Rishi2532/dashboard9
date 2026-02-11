
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function testQuery() {
    const db = await storage.getDb();
    const startDateParam = '2025-12-01';
    const endDateParam = '2026-01-31';
    const regionFilter = sql``;

    console.log("Testing water_consumption_history query...");
    try {
        const result = await db.execute(sql`
      SELECT COUNT(*)
      FROM water_consumption_history 
      WHERE water_value IS NOT NULL
        AND data_date IS NOT NULL
        AND data_date NOT LIKE '29-Feb%'
        AND data_date NOT LIKE '30-Feb%'
        AND data_date NOT LIKE '31-Feb%'
        AND data_date NOT LIKE '31-Apr%'
        AND data_date NOT LIKE '31-Jun%'
        AND data_date NOT LIKE '31-Sep%'
        AND data_date NOT LIKE '31-Nov%'
        AND (
          CASE 
            WHEN data_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN data_date::date
            WHEN data_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(data_date, 'DD-MM-YYYY')
            WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(data_date, 'DD-Mon-YYYY')
            WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(data_date, 'DD-Mon-YY')
            WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
              TO_DATE(data_date || '-' || 
                CASE 
                  WHEN EXTRACT(MONTH FROM TO_DATE(data_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                  THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                  ELSE EXTRACT(YEAR FROM uploaded_at)::text
                END, 
                'DD-Mon-YYYY')
            ELSE NULL
          END
        ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
        AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
    `);
        console.log("Success! Count:", result.rows[0].count);
    } catch (err) {
        console.error("Query failed:", err);
    }

    process.exit(0);
}

testQuery();
