import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const summary = await db.execute(sql`
    SELECT sent_date::text, dispatch_type, count(*) 
    FROM email_alert_logs 
    GROUP BY sent_date::text, dispatch_type 
    ORDER BY sent_date::text DESC;
  `);
  console.log("email_alert_logs summary:", summary.rows);

  const sample = await db.execute(sql`
    SELECT id, sent_date, dispatch_type, scheme_id, scheme_name, village_name, esr_name, alert_type, alert_value
    FROM email_alert_logs
    ORDER BY id DESC
    LIMIT 5;
  `);
  console.log("Sample email_alert_logs:", sample.rows);

  process.exit(0);
}

run();
