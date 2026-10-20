import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testRegionScope() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT
      COALESCE(NULLIF(TRIM(sp.region), ''), ss.region) as resolved_region,
      COUNT(DISTINCT sp.scheme_id) AS total_schemes,
      COALESCE(SUM(sp.number_of_villages), 0) AS total_villages,
      COALESCE(SUM(COALESCE(sp.number_of_esr,0) + COALESCE(sp.number_of_gsr,0) + COALESCE(sp.number_of_mbr,0)), 0) AS total_esr
    FROM scheme_progress_summary sp
    LEFT JOIN (
      SELECT DISTINCT scheme_id::text as scheme_id, region FROM scheme_status
    ) ss ON ss.scheme_id = sp.scheme_id::text
    GROUP BY COALESCE(NULLIF(TRIM(sp.region), ''), ss.region);
  `);
  console.log('Resolved region scope:');
  console.table(res.rows);

  process.exit(0);
}

testRegionScope().catch(console.error);
