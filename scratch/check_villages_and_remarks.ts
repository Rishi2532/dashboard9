import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDB();

  // Check village table columns and sample rows
  const vCols: any = await db.execute(sql`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'village'
  `);
  console.log("village table columns:", vCols.rows.map((r: any) => r.column_name));

  const vCount: any = await db.execute(sql`SELECT COUNT(*) as c FROM village`);
  console.log("village count:", vCount.rows[0].c);

  const vDistinctStatus: any = await db.execute(sql`
    SELECT fully_completion_village_status, COUNT(*) as c FROM village GROUP BY fully_completion_village_status
  `);
  console.log("village distinct fully_completion_village_status:", vDistinctStatus.rows);

  // Check scheme_status table for 1271
  const ss1271: any = await db.execute(sql`
    SELECT 
      SUM(COALESCE(fully_completed_villages, 0)) as sum_fcv,
      SUM(COALESCE(total_villages_integrated, 0)) as sum_tvi
    FROM scheme_status
  `);
  console.log("scheme_status sums:", ss1271.rows[0]);

  // Let's search all tables for 1271
  const search1271: any = await db.execute(sql`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND data_type IN ('integer', 'bigint', 'numeric', 'text')
  `);
  
  // Also check scheme_progress_summary
  const sps: any = await db.execute(sql`
    SELECT * FROM scheme_progress_summary LIMIT 1
  `);
  console.log("scheme_progress_summary columns:", Object.keys(sps.rows[0] || {}));

  // Check how remarks work on escalation portal
  const escLogs: any = await db.execute(sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'escalation_remarks' OR table_name LIKE '%remark%'
  `);
  console.log("Remark tables:", escLogs.rows);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
