import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const r = await db.execute(sql`
    SELECT 
      engineer_role,
      COUNT(DISTINCT sid.scheme_id) as unique_schemes,
      SUM(lpcd_alerts_count) as total_lpcd_alerts,
      SUM(chlorine_alerts_count) as total_cl_alerts,
      SUM(pressure_alerts_count) as total_pr_alerts,
      SUM(offline_alerts_count) as total_off_alerts
    FROM consolidated_email_dispatches ced
    CROSS JOIN LATERAL jsonb_array_elements_text(ced.scheme_ids) AS sid(scheme_id)
    WHERE dispatch_date = '2026-10-20'
    GROUP BY engineer_role
  `);
  console.log('Aggregates on 2026-10-20:');
  console.table(r.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
