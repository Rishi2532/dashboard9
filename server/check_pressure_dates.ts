
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function checkDates() {
  try {
    const db = await getDB();
    console.log("Querying pressure_history dates...");
    
    const result = await db.execute(sql`
      SELECT 
        pressure_date,
        COUNT(*) as count
      FROM pressure_history 
      GROUP BY pressure_date
      ORDER BY pressure_date
    `);
    
    console.log(`\nFound ${result.rows.length} unique date strings.`);
    console.log("----------------------------------------");
    console.log("Date String | Count");
    console.log("----------------------------------------");
    
    const rows = result.rows;
    for (const row of rows) {
        console.log(`${String(row.pressure_date).padEnd(20)} | ${row.count}`);
    }
    console.log("----------------------------------------");

    // Also check total count
    const total = await db.execute(sql`SELECT COUNT(*) as total FROM pressure_history`);
    console.log(`Total rows in pressure_history: ${total.rows[0].total}`);

  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

checkDates();
