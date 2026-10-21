import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const smsTiers = await db.execute(sql`
    SELECT 
      sent_date::text,
      template_name,
      dispatch_type,
      count(*) as total_sms,
      sum(case when is_success = true or gateway_status = 200 then 1 else 0 end) as success_sms,
      sum(case when is_success = false or gateway_status >= 400 then 1 else 0 end) as failed_sms
    FROM sms_alert_logs
    GROUP BY sent_date::text, template_name, dispatch_type
    ORDER BY sent_date::text DESC;
  `);
  console.log("SMS tiers and dates:", smsTiers.rows);

  process.exit(0);
}

run();
