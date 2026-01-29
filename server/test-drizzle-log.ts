
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schemeStatuses } from "@shared/schema";
import * as schema from "@shared/schema";

async function testDrizzleLog() {
  console.log("Starting Drizzle Log Test...");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }

  // Setup separate connection with logging
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client, { schema, logger: true });

  try {
    console.log("Attempting Insert...");
    await db.insert(schemeStatuses).values({
        scheme_id: "TEST-LOG-001",
        scheme_name: "Test Log",
        region: "Pune",
        block: "LogBlock",
        water_supply: "Yes"
    });
    console.log("Insert Success");
  } catch (error) {
    console.error("Insert Failed");
    // console.error(error); 
    // The logger should have printed the SQL before this
  } finally {
    process.exit(0);
  }
}

testDrizzleLog();
