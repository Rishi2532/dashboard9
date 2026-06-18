import { getDB } from "./server/db.ts";
import { realtimeSensorData } from "./shared/schema.ts";

async function test() {
  const db = await getDB();
  const rows = await db.select().from(realtimeSensorData).limit(5);
  console.log("Rows in realtime_sensor_data:");
  console.log(rows);
  process.exit(0);
}

test();
