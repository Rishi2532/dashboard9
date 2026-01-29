
import { storage } from "./storage";
import { sql } from "drizzle-orm";

async function debugTableColumns() {
  console.log("Checking columns for scheme_status table...");
  const db = await storage.getDb();
  
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_status'
      ORDER BY ordinal_position;
    `);

    console.log("Columns found:", result.rows.map((r: any) => r.column_name).join(", "));
    console.log("Total columns:", result.rows.length);
  } catch (error) {
    console.error("Error checking columns:", error);
  } finally {
    process.exit(0);
  }
}

debugTableColumns();
