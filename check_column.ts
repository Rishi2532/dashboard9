
import { getDB } from "./server/db";
import { sql } from "drizzle-orm";

async function checkColumn() {
    try {
        const db = await getDB();
        const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'issue_reports' AND column_name = 'sensor_type';
    `);

        if (result.rows.length > 0) {
            console.log("Column 'sensor_type' exists.");
        } else {
            console.log("Column 'sensor_type' does NOT exist.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Check failed:", error);
        process.exit(1);
    }
}

checkColumn();
