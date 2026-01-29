
import { getDB } from "./db";
import { waterSchemeData } from "../shared/schema";

async function verifyCounts() {
  const db = await getDB();
  console.log("Fetching all villages...");
  const villages = await db.select().from(waterSchemeData);

  console.log(`Total Villages Records: ${villages.length}`);

  let withWater = 0;
  let above55 = 0;
  let below55_strict = 0; // > 0 and < 55
  let below55_nulls = 0; // Null or 0
  
  villages.forEach(v => {
    // Only verify "All Regions" logic for simplicity (no filtering)
    // water_value_day7 is the column used.
    const water = Number(v.water_value_day7);
    const lpcd = v.lpcd_value_day7 === null ? null : Number(v.lpcd_value_day7);

    if (water > 0) {
      withWater++;
      
      if (lpcd !== null && lpcd >= 55) {
        above55++;
      } else if (lpcd !== null && lpcd > 0 && lpcd < 55) {
        below55_strict++;
      } else {
        // This bucket captures lpcd == 0 or lpcd == null
        below55_nulls++;
      }
    }
  });

  console.log("--- RESULTS ---");
  console.log(`With Water: ${withWater}`);
  console.log(`Above 55: ${above55}`);
  console.log(`Below 55 (Strict > 0): ${below55_strict}`);
  console.log(`Below 55 (Nulls/Zero): ${below55_nulls}`);
  console.log(`Sum (Above + Strict): ${above55 + below55_strict}`);
  console.log(`Gap (WithWater - SumStrict): ${withWater - (above55 + below55_strict)}`);
  console.log(`Sum (Above + Strict + Nulls): ${above55 + below55_strict + below55_nulls}`);
  
  // Checking equality
  if (withWater === (above55 + below55_strict + below55_nulls)) {
    console.log("SUCCESS: Included Nulls closes the gap.");
  } else {
    console.log("FAILURE: Gap persists despite including Nulls.");
  }

  process.exit(0);
}

verifyCounts().catch(console.error);
