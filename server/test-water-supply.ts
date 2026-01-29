
import { storage } from "./storage";
import { schemeStatuses, type InsertSchemeStatus } from "@shared/schema";

async function testSimpleInsert() {
  console.log("Starting Simple Insert Test...");

  const testSchemeId = "TEST-SIMPLE-001";
  const db = await storage.getDb();
  
  // Cleanup
  await db.delete(schemeStatuses).where({ scheme_id: testSchemeId });

  const schemeData: InsertSchemeStatus = {
    scheme_id: testSchemeId,
    scheme_name: "Test Simple Insert",
    region: "Pune",
    block: "BlockSimple",
    water_supply: "Yes" 
  };

  try {
    console.log("Inserting...");
    await db.insert(schemeStatuses).values(schemeData);
    console.log("Insert successful.");

    const fetched = await storage.getSchemeById(testSchemeId);
    console.log("Fetched water_supply:", fetched?.water_supply);

    if (fetched?.water_supply === "Yes") {
      console.log("✅ SUCCESS");
    } else {
      console.log("❌ FAILED");
    }

  } catch (error) {
    console.error("❌ Test Failed:", error);
  } finally {
    process.exit(0);
  }
}

testSimpleInsert();
