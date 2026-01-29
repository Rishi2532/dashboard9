
import { db } from "./db";
import { sql } from "drizzle-orm";
import { pgTable, varchar, decimal, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

// Inline Schema Definitions to avoid import issues
const waterSchemeDataHistory = pgTable(
  "water_scheme_data_history",
  {
    id: serial("id").primaryKey(),
    region: varchar("region", { length: 100 }),
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    data_date: varchar("data_date", { length: 15 }).notNull(),
    lpcd_value: decimal("lpcd_value"), 
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
  }
);

const schemeLpcdDataHistory = pgTable(
  "scheme_lpcd_data_history",
  {
    id: serial("id").primaryKey(),
    region: varchar("region", { length: 100 }),
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    data_date: varchar("data_date", { length: 15 }).notNull(),
    lpcd_value: decimal("lpcd_value"),
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
  }
);

async function main() {
  try {
    console.log("Checking Weekly Stats for 'Bidgaon' (Week 1: 29 Dec 2025 - 04 Jan 2026)");

    // 1. Check Village LPCD (water_scheme_data_history)
    const villageQuery = sql`
      SELECT 
        village_name, 
        scheme_id, 
        region,
        data_date,
        lpcd_value
      FROM water_scheme_data_history
      WHERE (village_name ILIKE '%Bidgaon%' OR village_name ILIKE '%Bifgaon%')
        AND TO_DATE(data_date, 'DD-MM-YYYY') >= TO_DATE('29-12-2025', 'DD-MM-YYYY')
        AND TO_DATE(data_date, 'DD-MM-YYYY') <= TO_DATE('04-01-2026', 'DD-MM-YYYY')
      ORDER BY data_date ASC
    `;
    
    const villageResult = await db.execute(villageQuery);
    console.log("\n--- Village Data (water_scheme_data_history) ---");
    if (villageResult.rows.length === 0) {
        console.log("No village data found.");
    } else {
        console.table(villageResult.rows);
        const totalLPCD = villageResult.rows.reduce((sum: number, row: any) => sum + Number(row.lpcd_value || 0), 0);
        const count = villageResult.rows.length;
        const avg = count > 0 ? totalLPCD / count : 0;
        console.log(`\nVillage Average LPCD: ${avg.toFixed(2)}`);
        
        if (avg > 55) console.log("Category: Week 1 > 55 Average lpcd");
        else if (avg > 0) console.log("Category: Week 1 < 55 Average lpcd");
        else console.log("Category: Week 1 No Water");
    }

    // 2. Check Scheme LPCD (scheme_lpcd_data_history)
    const schemeQuery = sql`
      SELECT 
        scheme_name, 
        scheme_id, 
        region,
        data_date,
        lpcd_value
      FROM scheme_lpcd_data_history
      WHERE scheme_name ILIKE '%Bidgaon%'
        AND TO_DATE(data_date, 'DD-MM-YYYY') >= TO_DATE('29-12-2025', 'DD-MM-YYYY')
        AND TO_DATE(data_date, 'DD-MM-YYYY') <= TO_DATE('04-01-2026', 'DD-MM-YYYY')
      ORDER BY data_date ASC
    `;
    
    const schemeResult = await db.execute(schemeQuery);
    console.log("\n--- Scheme Data (scheme_lpcd_data_history) ---");
    if (schemeResult.rows.length === 0) {
        console.log("No scheme data found.");
    } else {
        console.table(schemeResult.rows);
        const totalLPCD = schemeResult.rows.reduce((sum: number, row: any) => sum + Number(row.lpcd_value || 0), 0);
        const count = schemeResult.rows.length;
        const avg = count > 0 ? totalLPCD / count : 0;
        console.log(`\nScheme Average LPCD: ${avg.toFixed(2)}`);
        
        if (avg > 55) console.log("Category: Week 1 > 55 Average lpcd");
        else if (avg > 0) console.log("Category: Week 1 < 55 Average lpcd");
        else console.log("Category: Week 1 No Water");
    }

    process.exit(0);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
