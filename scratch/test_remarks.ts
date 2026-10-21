import { getDB } from "../server/db";
import { sql } from "drizzle-orm";
import { getEscalationStatus } from "../server/services/escalation-service";

async function run() {
  const db = await getDB();

  const countIssues: any = await db.execute(sql`SELECT COUNT(*) as c FROM issue_reports`);
  console.log("issue_reports total rows:", countIssues.rows[0].c);

  const sampleIssues: any = await db.execute(sql`SELECT scheme_id, problem_level, status, reason FROM issue_reports LIMIT 10`);
  console.log("sample issues:", sampleIssues.rows);

  const { schemes } = await getEscalationStatus({ asOfDate: '18-Oct' });
  const schemesWithRemarks = schemes.filter(s => s.remarks && s.remarks.length > 0);
  console.log("Total schemes from getEscalationStatus:", schemes.length);
  console.log("Schemes with remarks:", schemesWithRemarks.length);
  if (schemesWithRemarks.length > 0) {
    console.log("First scheme with remarks:", schemesWithRemarks[0].scheme_id, schemesWithRemarks[0].remarks.length);
  }

  // Also test village table for 1271
  const villageFull: any = await db.execute(sql`
    SELECT COUNT(*) as c FROM village 
    WHERE TRIM(LOWER(fully_completion_village_status)) IN ('completed', 'fully completed', 'fully-completed')
  `);
  console.log("village table fully completed count:", villageFull.rows[0].c);

  // Check scheme_id in village
  const sampleVillage: any = await db.execute(sql`
    SELECT scheme_id, village_name, fully_completion_village_status FROM village LIMIT 5
  `);
  console.log("sample village rows:", sampleVillage.rows);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
