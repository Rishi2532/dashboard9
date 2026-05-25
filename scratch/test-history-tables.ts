import { getDB, initializeDatabase } from "../server/db";
import { storage } from "../server/storage";
import { sql } from "drizzle-orm";

async function testHistoryTables() {
  console.log("🚀 Starting verification of history tables...");

  // Run database initialization first
  console.log("Running database initialization...");
  await initializeDatabase();

  const db = await getDB();

  // 1. Verify tables exist in the database
  try {
    const regionTableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'region_history'
      );
    `);
    console.log("Region history table exists:", regionTableCheck.rows[0].exists);

    const schemeTableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scheme_status_history'
      );
    `);
    console.log("Scheme status history table exists:", schemeTableCheck.rows[0].exists);

    if (!regionTableCheck.rows[0].exists || !schemeTableCheck.rows[0].exists) {
      console.error("❌ ERROR: Tables do not exist. Please check setup-db.ts and make sure the server has restarted.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ ERROR checking tables existence:", error);
    process.exit(1);
  }

  // 2. Test Region History
  const testRegionName = "TEST-REG-HIST-1";
  try {
    console.log(`\nTesting region history by creating region "${testRegionName}"...`);
    
    // Clean up if exists
    await db.execute(sql`DELETE FROM region WHERE region_name = ${testRegionName}`);
    await db.execute(sql`DELETE FROM region_history WHERE region_name = ${testRegionName}`);

    // Create region
    const createdRegion = await storage.createRegion({
      region_name: testRegionName,
      total_esr_integrated: 10,
      fully_completed_esr: 5,
    });
    console.log("Created region ID:", createdRegion.region_id);

    // Verify history entry was created
    const historyRows = await db.execute(sql`
      SELECT * FROM region_history WHERE region_name = ${testRegionName}
    `);
    console.log(`Found ${historyRows.rows.length} rows in region_history for this region.`);
    if (historyRows.rows.length > 0) {
      console.log("✅ Region history row details:", historyRows.rows[0]);
    } else {
      console.error("❌ ERROR: No region history row found!");
    }

    // Clean up
    await db.execute(sql`DELETE FROM region WHERE region_name = ${testRegionName}`);
    await db.execute(sql`DELETE FROM region_history WHERE region_name = ${testRegionName}`);
  } catch (error) {
    console.error("❌ ERROR during region history test:", error);
  }

  // 3. Test Scheme Status History
  const testSchemeId = "SCH-HIST-TEST";
  const testBlock = "HistBlock";
  try {
    console.log(`\nTesting scheme status history by batch upserting scheme "${testSchemeId}"...`);

    // Clean up if exists
    await db.execute(sql`DELETE FROM scheme_status WHERE scheme_id = ${testSchemeId}`);
    await db.execute(sql`DELETE FROM scheme_status_history WHERE scheme_id = ${testSchemeId}`);

    // Batch upsert scheme
    const upsertResult = await storage.batchUpsertSchemes([
      {
        scheme_id: testSchemeId,
        scheme_name: "History Verification Scheme",
        region: "TestRegion",
        block: testBlock,
        water_supply: "Yes",
        total_number_of_esr: 4
      }
    ]);
    console.log("Upsert result:", upsertResult);

    // Verify history entry was created
    const historyRows = await db.execute(sql`
      SELECT * FROM scheme_status_history WHERE scheme_id = ${testSchemeId}
    `);
    console.log(`Found ${historyRows.rows.length} rows in scheme_status_history for this scheme.`);
    if (historyRows.rows.length > 0) {
      console.log("✅ Scheme status history row details:", historyRows.rows[0]);
    } else {
      console.error("❌ ERROR: No scheme status history row found!");
    }

    // Clean up
    await db.execute(sql`DELETE FROM scheme_status WHERE scheme_id = ${testSchemeId}`);
    await db.execute(sql`DELETE FROM scheme_status_history WHERE scheme_id = ${testSchemeId}`);
  } catch (error) {
    console.error("❌ ERROR during scheme status history test:", error);
  }

  console.log("\n🏁 Verification completed!");
  process.exit(0);
}

testHistoryTables();
