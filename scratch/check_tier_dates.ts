import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const summaryByTierAndDate = await db.execute(sql`
    SELECT 
      dispatch_date::text,
      engineer_role,
      count(*) as dispatches_count,
      sum(lpcd_alerts_count) as total_lpcd,
      sum(chlorine_alerts_count) as total_chlorine,
      sum(pressure_alerts_count) as total_pressure,
      sum(offline_alerts_count) as total_offline
    FROM consolidated_email_dispatches
    GROUP BY dispatch_date::text, engineer_role
    ORDER BY dispatch_date::text DESC, engineer_role;
  `);
  console.log("Summary by tier and date:", summaryByTierAndDate.rows);

  const datesByTier = await db.execute(sql`
    SELECT 
      CASE 
        WHEN engineer_role ILIKE '%Vendor%' THEN 0
        WHEN engineer_role ILIKE '%Principal%' THEN 5
        WHEN engineer_role ILIKE '%Member%' THEN 4
        WHEN engineer_role ILIKE '%Chief%' OR engineer_role ILIKE '%Superintending%' OR engineer_role ILIKE '%SE%' THEN 3
        WHEN engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%' THEN 2
        ELSE 1
      END as tier,
      dispatch_date::text,
      count(*) as count,
      count(distinct (scheme_ids->>0)) as schemes_count
    FROM consolidated_email_dispatches
    GROUP BY 1, 2
    ORDER BY 1, 2 DESC;
  `);
  console.log("Dates by tier:", datesByTier.rows);

  process.exit(0);
}

run();
