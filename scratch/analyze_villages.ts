
import { getDB } from "../server/db";
import { villages } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

async function analyzeVillages() {
  const db = await getDB();
  const counts = await db.select({
    region: villages.region,
    count: sql<number>`count(*)`
  }).from(villages).groupBy(villages.region);
  
  console.log("Villages count per region:");
  console.table(counts);
  process.exit(0);
}

analyzeVillages().catch(err => {
  console.error(err);
  process.exit(1);
});
