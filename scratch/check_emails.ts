import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const db = await getDB();
    const countRes = await db.execute(sql`SELECT count(*) FROM consolidated_email_dispatches;`);
    console.log("Total rows in consolidated_email_dispatches:", countRes.rows);

    const rolesRes = await db.execute(sql`
      SELECT engineer_role, count(*), array_agg(DISTINCT dispatch_date) as dates
      FROM consolidated_email_dispatches
      GROUP BY engineer_role;
    `);
    console.log("Roles in consolidated_email_dispatches:", rolesRes.rows);

    const sampleRes = await db.execute(sql`
      SELECT id, dispatch_date, engineer_name, engineer_role, scheme_ids, scheme_names, lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count
      FROM consolidated_email_dispatches
      LIMIT 5;
    `);
    console.log("Sample records:", sampleRes.rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
