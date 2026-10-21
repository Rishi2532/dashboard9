import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const r = await db.execute(sql`
    SELECT 
      sent_date,
      dispatch_type,
      template_name,
      COUNT(id) as count,
      COUNT(CASE WHEN is_success = true OR gateway_status = 200 THEN 1 END) as success_count,
      COUNT(CASE WHEN is_success = false OR gateway_status >= 400 THEN 1 END) as failed_count,
      MAX(gateway_status) as sample_gw_status,
      MAX(gateway_response) as sample_gw_response
    FROM sms_alert_logs
    WHERE sent_date >= '2026-10-18'
    GROUP BY sent_date, dispatch_type, template_name
    ORDER BY sent_date DESC, count DESC
  `);
  console.log('Recent SMS Logs:');
  console.table(r.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
