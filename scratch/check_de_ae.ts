import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      alert_type,
      telemetry_date,
      COUNT(*) as count
    FROM email_alert_logs
    WHERE sent_date = '2026-10-21'
    GROUP BY alert_type, telemetry_date
    ORDER BY alert_type, count DESC
  `);
  console.log("Telemetry dates for 2026-10-21 alerts across categories:");
  console.table(res.rows);

  process.exit(0);
}
run();
