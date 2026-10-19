import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = await getDB();
    const cedRes = await db.execute(sql`
      SELECT id, dispatch_date, engineer_name, engineer_email, engineer_role, total_alerts,
             lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count, offline_alerts_count,
             scheme_ids, scheme_names
      FROM consolidated_email_dispatches
      WHERE engineer_role ILIKE '%EE%' OR engineer_role ILIKE '%Executive%'
      ORDER BY dispatch_date DESC
    `);
    const rows = cedRes.rows || [];
    console.log('Total EE dispatches via getDB():', rows.length);
    rows.forEach((r: any, idx: number) => {
      console.log(`${idx+1}. [${r.dispatch_date}] ${r.engineer_name} | schemes: ${JSON.stringify(r.scheme_names)} | lpcd: ${r.lpcd_alerts_count}`);
    });

  } catch (e: any) {
    console.error('Error in getDB():', e);
  }
}

run();
