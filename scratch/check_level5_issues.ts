import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDB();

  // 1. Check schemes where water_supply = 'Yes' vs common filter vs connected
  console.log("--- SCHEMES QUERIES ---");
  const wsYes: any = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) as c FROM scheme_status WHERE water_supply = 'Yes'
  `);
  console.log("water_supply = 'Yes':", wsYes.rows[0].c);

  const commonFilter: any = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) as c FROM scheme_status 
    WHERE (TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'connected', 'fully-completed') OR TRIM(LOWER(mjp_fully_completed)) = 'yes')
      AND water_supply = 'Yes'
  `);
  console.log("common filter (fully_completed + water_supply='Yes'):", commonFilter.rows[0].c);

  const connectedSchemes: any = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) as c FROM scheme_status 
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'connected', 'fully-completed') OR TRIM(LOWER(mjp_fully_completed)) = 'yes'
  `);
  console.log("fully_completed / connected schemes:", connectedSchemes.rows[0].c);

  // Let's check what query in level5-summary gave 41:
  // In escalation-routes.ts line 1475:
  const opSchemes: any = await db.execute(sql`
    SELECT DISTINCT ON (scheme_id)
      scheme_id, scheme_name, region, circle, division, sub_division, block,
      total_villages_integrated, total_esr_integrated,
      water_supply
    FROM scheme_status
    WHERE water_supply = 'Yes'
  `);
  console.log("Distinct scheme_status with water_supply = 'Yes':", opSchemes.rows?.length);

  // What query gives exactly 39 schemes?
  const q39_1: any = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) as c FROM scheme_status
    WHERE water_supply = 'Yes' AND (total_villages_integrated > 0 OR total_esr_integrated > 0)
  `);
  console.log("water_supply = 'Yes' AND (total_villages > 0 OR total_esr > 0):", q39_1.rows[0].c);

  // Let's check schemes.tsx common filter or what schemes.tsx shows
  // 2. Check fully integrated villages (1271)
  console.log("\n--- VILLAGES QUERIES ---");
  const vilSum: any = await db.execute(sql`
    SELECT 
      SUM(fully_completed_villages) as fcv_sum,
      COUNT(DISTINCT CASE WHEN fully_completed_villages > 0 THEN scheme_id END) as fcv_schemes
    FROM scheme_status
  `);
  console.log("Sum fully_completed_villages in scheme_status:", vilSum.rows[0]);

  // Check scheme_progress_summary or village tables:
  const vilTable: any = await db.execute(sql`
    SELECT COUNT(*) as c FROM information_schema.tables WHERE table_name LIKE '%village%'
  `);
  console.log("Village tables:", vilTable.rows);

  // Check what level5-summary currently returns for details.iotVillagesFully
  // 3. Check remarks
  console.log("\n--- REMARKS QUERIES ---");
  const remarksCount: any = await db.execute(sql`
    SELECT COUNT(*) as c FROM field_remarks
  `);
  console.log("field_remarks count:", remarksCount.rows[0].c);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
