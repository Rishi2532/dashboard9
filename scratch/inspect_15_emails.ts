import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT id, dispatch_date, engineer_role, engineer_name, created_at
    FROM consolidated_email_dispatches
    WHERE dispatch_date = '2026-10-21' OR id >= 335
    ORDER BY id DESC;
  `);
  console.log("Records >= 335:", res.rows);

  const logs = await db.execute(sql`
    SELECT id, dispatch_type, sent_date, recipient_name, recipient_email, created_at, status
    FROM email_alert_logs
    ORDER BY id DESC
    LIMIT 10;
  `);
  console.log("Latest email_alert_logs:", logs.rows);

  process.exit(0);
}

run();
