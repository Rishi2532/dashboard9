
import { getDB } from "./db";
import { waterSchemeData } from "../shared/schema";

async function verifyCounts() {
  const db = await getDB();
  console.log("Fetching all villages from water_scheme_data...");
  const villages = await db.select().from(waterSchemeData);

  console.log(`Total Records in Table: ${villages.length}`);

  let union_gt0 = 0;
  
  villages.forEach(v => {
    const l = Number(v.lpcd_value_day7);
    const w = Number(v.water_value_day7);
    if (l > 0 || w > 0) {
      union_gt0++;
    }
  });

  console.log(`Union (Water > 0 OR LPCD > 0): ${union_gt0}`);
  
  process.exit(0);
}

verifyCounts().catch(console.error);
