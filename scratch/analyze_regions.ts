
import { getDB } from "../server/db";
import { regions } from "../shared/schema";

async function analyzeRegions() {
  const db = await getDB();
  const allRegions = await db.select().from(regions);
  console.log("Regions table data:");
  console.table(allRegions);
  process.exit(0);
}

analyzeRegions().catch(err => {
  console.error(err);
  process.exit(1);
});
