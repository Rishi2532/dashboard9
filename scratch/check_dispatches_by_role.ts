import dotenv from 'dotenv';
dotenv.config();
import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDispatchesByRole() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      engineer_role, 
      count(*) as total_emails,
      SUM(CASE WHEN lpcd_alerts_count > 0 THEN 1 ELSE 0 END) as lpcd_emails,
      SUM(CASE WHEN chlorine_alerts_count > 0 THEN 1 ELSE 0 END) as chlorine_emails,
      SUM(CASE WHEN pressure_alerts_count > 0 THEN 1 ELSE 0 END) as pressure_emails,
      SUM(CASE WHEN offline_alerts_count > 0 THEN 1 ELSE 0 END) as offline_emails,
      MAX(dispatch_date::text) as latest_date
    FROM consolidated_email_dispatches
    GROUP BY engineer_role
    ORDER BY total_emails DESC
  `);
  console.log('All-time consolidated_email_dispatches by role:');
  console.table(res.rows);

  // Also check today's
  const resToday = await db.execute(sql`
    SELECT 
      engineer_role, 
      count(*) as total_emails,
      SUM(CASE WHEN lpcd_alerts_count > 0 THEN 1 ELSE 0 END) as lpcd_emails,
      SUM(CASE WHEN chlorine_alerts_count > 0 THEN 1 ELSE 0 END) as chlorine_emails,
      SUM(CASE WHEN pressure_alerts_count > 0 THEN 1 ELSE 0 END) as pressure_emails,
      SUM(CASE WHEN offline_alerts_count > 0 THEN 1 ELSE 0 END) as offline_emails
    FROM consolidated_email_dispatches
    WHERE dispatch_date = CURRENT_DATE OR created_at >= CURRENT_DATE
    GROUP BY engineer_role
  `);
  console.log("Today's dispatches by role:");
  console.table(resToday.rows);

  process.exit(0);
}
checkDispatchesByRole().catch(console.error);
