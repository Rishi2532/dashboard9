
import { getDB } from "./db";
import { schemeStatuses } from "@shared/schema";
import { eq } from "drizzle-orm";


async function verifyWaterSupply() {
  console.log("Starting verification of water_supply column...");

  try {
    const db = await getDB();
    // 1. Fetch a few schemes to see if water_supply field exists in the returned objects
    // It might be null for existing records, but the key should be present in the query result structure if Drizzle is selecting it.
    // Note: Drizzle might not show the key if the value is undefined/null and not explicitly selected, 
    // but selecting * (default) should include it.
    
    const result = await db.select().from(schemeStatuses).limit(5);
    
    if (result.length === 0) {
      console.log("No schemes found to verify.");
      return;
    }

    console.log("Sample scheme keys:", Object.keys(result[0]));
    
    const hasWaterSupplyKey = "water_supply" in result[0];
    console.log(`'water_supply' key present in result object: ${hasWaterSupplyKey}`);

    if (hasWaterSupplyKey) {
        console.log("SUCCESS: water_supply column is recognized by Drizzle.");
    } else {
        console.error("FAILURE: water_supply column NOT found in result object.");
        process.exit(1);
    }
    
    // Optional: Try to set water_supply for a dummy record (or a verified existing one) if we want deeper verification
    // valid for now is just checking schema recogition.

  } catch (error) {
    console.error("Verification failed with error:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyWaterSupply();
