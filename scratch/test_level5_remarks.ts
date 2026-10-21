import { getDB } from "../server/db";
import { sql } from "drizzle-orm";
import { getEscalationStatus } from "../server/services/escalation-service";

async function run() {
  const db = await getDB();
  const escalationRes = await getEscalationStatus({ asOfDate: '18-Oct' });
  const allSchemes = escalationRes.schemes;

  console.log("allSchemes count:", allSchemes.length);
  
  // Find a scheme that has lpcd_villages with days_count >= 7
  let sampleVillagesWithRemarks: any[] = [];
  for (const s of allSchemes) {
    const qv = (s.lpcd_villages || []).filter((v: any) => (v.days_count || 1) >= 7);
    if (qv.length > 0) {
      console.log(`Scheme ${s.scheme_id} (${s.scheme_name}) has ${qv.length} LPCD villages. Remarks length: ${s.remarks?.length || 0}`);
      if (s.remarks && s.remarks.length > 0) {
        sampleVillagesWithRemarks.push({ scheme: s.scheme_id, remarksCount: s.remarks.length });
      }
    }
  }
  console.log("Schemes with qualifying LPCD villages and remarks:", sampleVillagesWithRemarks.length);

  // Also query issue_reports directly to see if remarks can be joined directly from issue_reports!
  const issuesRes: any = await db.execute(sql`
    SELECT scheme_id, COUNT(*) as c FROM issue_reports GROUP BY scheme_id
  `);
  console.log("Schemes with issue_reports in DB:", issuesRes.rows.length);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
