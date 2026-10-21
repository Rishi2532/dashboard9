import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDB();

  // Test the current query:
  const curRes: any = await db.execute(sql`
    SELECT COUNT(*) as c
    FROM water_scheme_data ws
    JOIN village v ON v.scheme_id = ws.scheme_id AND LOWER(TRIM(v.village_name)) = LOWER(TRIM(ws.village_name))
    WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
  `);
  console.log("Current join count:", curRes.rows[0].c);

  // Let's test why: check type of scheme_id in water_scheme_data vs village
  const sampleWs: any = await db.execute(sql`SELECT scheme_id, village_name FROM water_scheme_data LIMIT 3`);
  console.log("sample ws:", sampleWs.rows);
  const sampleV: any = await db.execute(sql`SELECT scheme_id, village_name FROM village LIMIT 3`);
  console.log("sample v:", sampleV.rows);

  // Direct from village:
  const directV: any = await db.execute(sql`
    SELECT COUNT(*) as c
    FROM village v
    WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
  `);
  console.log("Direct village completed count:", directV.rows[0].c);

  // How many distinct villages in village table where status is Completed?
  const distinctV: any = await db.execute(sql`
    SELECT COUNT(DISTINCT (v.scheme_id, LOWER(TRIM(v.village_name)))) as c
    FROM village v
    WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
  `);
  console.log("Distinct scheme_id + village_name in village completed:", distinctV.rows[0].c);

  // And in scheme_status, what is the sum of fully_completed_villages?
  const ssSum: any = await db.execute(sql`
    SELECT SUM(fully_completed_villages) as s FROM scheme_status
  `);
  console.log("scheme_status sum fully_completed_villages:", ssSum.rows[0].s);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
