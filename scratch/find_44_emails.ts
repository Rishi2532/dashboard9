import dotenv from 'dotenv';
dotenv.config();
import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkSent() {
  const db = await getDB();
  
  const resDispatches = await db.execute(sql`
    SELECT 
      id, dispatch_date::text as dispatch_date, sent_time, engineer_name, engineer_email, 
      engineer_role, total_schemes, scheme_ids, total_alerts, lpcd_alerts_count,
      chlorine_alerts_count, pressure_alerts_count, offline_alerts_count, created_at
    FROM consolidated_email_dispatches
    WHERE dispatch_date = CURRENT_DATE OR created_at >= CURRENT_DATE
    ORDER BY id ASC
  `);
  
  console.log('Today consolidated_email_dispatches count:', resDispatches.rows.length);
  console.table(resDispatches.rows.map((r: any) => ({
    id: r.id,
    name: r.engineer_name,
    email: r.engineer_email,
    role: r.engineer_role,
    schemes: r.total_schemes,
    scheme_ids: (r.scheme_ids || '').slice(0, 30),
    alerts: r.total_alerts
  })));

  // Role breakup
  const byRole: Record<string, number> = {};
  resDispatches.rows.forEach((r: any) => {
    byRole[r.engineer_role || 'Unknown'] = (byRole[r.engineer_role || 'Unknown'] || 0) + 1;
  });
  console.log('Breakup by Role:');
  console.table(byRole);

  process.exit(0);
}
checkSent().catch(console.error);
