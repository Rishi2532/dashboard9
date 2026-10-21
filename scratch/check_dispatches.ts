import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const r1 = await db.execute(sql`
    SELECT 
      dispatch_date, 
      engineer_role,
      COUNT(id) as email_dispatches,
      COUNT(DISTINCT engineer_email) as distinct_emails,
      SUM(jsonb_array_length(COALESCE(scheme_ids, '[]'::jsonb))) as total_scheme_refs
    FROM consolidated_email_dispatches 
    WHERE dispatch_date >= '2026-10-18'
    GROUP BY dispatch_date, engineer_role
    ORDER BY dispatch_date DESC, engineer_role
  `);
  console.log('Breakdown since 2026-10-18:');
  console.table(r1.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
