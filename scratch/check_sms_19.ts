import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      COUNT(id) as total_sms,
      COUNT(CASE WHEN is_success = true OR gateway_status = 200 THEN 1 END) as delivered,
      COUNT(CASE WHEN is_success = false OR gateway_status >= 400 THEN 1 END) as failed,
      COUNT(DISTINCT scheme_id) as schemes_count,
      COUNT(CASE WHEN template_name ILIKE '%lpcd%' THEN 1 END) as lpcd_sms,
      COUNT(CASE WHEN template_name ILIKE '%pressure%' THEN 1 END) as pressure_sms,
      COUNT(CASE WHEN template_name ILIKE '%chlorine%' THEN 1 END) as chlorine_sms
    FROM sms_alert_logs
    WHERE sent_date = '2026-10-19'
  `);
  console.log('SMS on 2026-10-19:');
  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
