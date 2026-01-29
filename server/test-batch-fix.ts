
import { storage } from "./storage";
import { type InsertSchemeStatus } from "@shared/schema";

async function testBatchUpsertImplementation() {
  console.log("Testing batchUpsertSchemes Implementation...");

  const testSchemeId = "TEST-BATCH-RAW";
  const db = await storage.getDb();
  
  // Cleanup
  await storage.deleteScheme(testSchemeId).catch(() => {}); 
  // storage.deleteScheme might not exist or work if ID not found, proceed.
  // Using direct delete to be safe
  try {
     const { sql } = await import("drizzle-orm");
     await db.execute(sql`DELETE FROM scheme_status WHERE scheme_id = ${testSchemeId}`);
  } catch(e) {}

  const schemeData: InsertSchemeStatus = {
    scheme_id: testSchemeId,
    scheme_name: "Test Batch Raw Scheme",
    region: "Pune",
    block: "BatchBlock",
    water_supply: "Yes" 
  };

  try {
    console.log("Calling batchUpsertSchemes...");
    const result = await storage.batchUpsertSchemes([schemeData]);
    console.log("Result:", result);

    if (result.inserted > 0 || result.updated > 0) {
       console.log("Upsert reported success.");
    } else {
       console.error("Upsert reported 0 inserted/updated.");
    }

    const fetched = await storage.getSchemeById(testSchemeId);
    console.log("Fetched water_supply:", fetched?.water_supply);

    if (fetched?.water_supply === "Yes") {
      console.log("✅ SUCCESS: batchUpsertSchemes works.");
    } else {
      console.log("❌ FAILED: Field not saved.");
    }

  } catch (error) {
    console.error("❌ Test Failed with Error:", error);
  } finally {
    process.exit(0);
  }
}

testBatchUpsertImplementation();
