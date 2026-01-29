
import { storage } from "./storage";
import { sql } from "drizzle-orm";

async function testRawSqlInsert() {
  console.log("Starting Raw SQL Insert Test...");
  const db = await storage.getDb();
  const testId = "TEST-RAW-001";
  const testBlock = "RawBlock";

  try {
    // 1. Clean
    await db.execute(sql`DELETE FROM scheme_status WHERE scheme_id = ${testId}`);

    // 2. Insert using Raw SQL
    console.log("Attempting Raw SQL Insert...");
    await db.execute(sql`
      INSERT INTO scheme_status (scheme_id, scheme_name, region, block, water_supply)
      VALUES (${testId}, 'Raw SQL Scheme', 'Pune', ${testBlock}, 'Yes')
    `);
    console.log("Raw Insert Successful.");

    // 3. Verify
    const result = await db.execute(sql`SELECT water_supply FROM scheme_status WHERE scheme_id = ${testId}`);
    const row = result.rows[0] as any;
    console.log("Fetched water_supply:", row?.water_supply);

    if (row?.water_supply === 'Yes') {
      console.log("✅ SUCCESS: Raw SQL works.");
    } else {
      console.log("❌ FAILURE: Data not saved.");
    }

  } catch (error) {
    console.error("❌ Test Failed:", error);
  } finally {
    process.exit(0);
  }
}

testRawSqlInsert();
