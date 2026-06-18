import { getDB } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function createTable() {
  try {
    const db = await getDB();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "realtime_sensor_data" (
        "id" serial PRIMARY KEY NOT NULL,
        "scheme_id" varchar(100),
        "village_name" varchar(255),
        "esr_name" varchar(255),
        "chlorine_value" numeric,
        "chlorine_timestamp" timestamp with time zone,
        "chlorine_comm_status" varchar(20),
        "pressure_value" numeric(12, 2),
        "pressure_timestamp" timestamp with time zone,
        "pressure_comm_status" varchar(20),
        "flow_rate_comm_status" varchar(20),
        "last_updated_values" timestamp with time zone DEFAULT now(),
        "last_updated_comm" timestamp with time zone DEFAULT now(),
        CONSTRAINT "realtime_sensor_data_unique_esr" UNIQUE("scheme_id","village_name","esr_name")
      );
    `);
    console.log("Table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit(0);
  }
}

createTable();
