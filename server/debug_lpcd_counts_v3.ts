
import { getDB } from "./db";
import { waterSchemeData, schemeStatuses } from "../shared/schema";
import { sql } from "drizzle-orm";

async function verifyCounts() {
  const db = await getDB();
  console.log("Fetching Fully Completed Schemes...");
  const fullyCompletedSchemeIds = (await db
    .select({ id: schemeStatuses.scheme_id })
    .from(schemeStatuses)
    .where(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('completed', 'fully-completed', 'fully completed')`)
  ).map(r => r.id);

  const villages = await db.select().from(waterSchemeData);
  const fcSet = new Set(fullyCompletedSchemeIds);
  
  let fc_union = 0;
  let total_union = 0;
  
  villages.forEach(v => {
    const l = Number(v.lpcd_value_day7);
    const w = Number(v.water_value_day7);
    if (l > 0 || w > 0) {
      total_union++;
      if (fcSet.has(v.scheme_id)) {
        fc_union++;
      }
    }
  });

  console.log(`Total Active (W>0 OR L>0): ${total_union}`);
  console.log(`FC Active (W>0 OR L>0): ${fc_union}`);
  
  process.exit(0);
}

verifyCounts().catch(console.error);
