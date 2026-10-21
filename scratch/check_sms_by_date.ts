import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function checkTiers() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      sent_date,
      count(*) as total_sms,
      count(*) FILTER (WHERE is_success = true) as success_count,
      count(*) FILTER (WHERE is_success = false OR gateway_status >= 400 OR delivery_status ILIKE '%FAIL%') as failed_count,
      array_agg(DISTINCT delivery_status) as statuses,
      array_agg(DISTINCT gateway_status) as gateways
    FROM sms_alert_logs
    GROUP BY sent_date
    ORDER BY sent_date DESC
    LIMIT 10;
  `);
  console.log("Recent SMS by sent_date:", res.rows);

  const sampleFailed = await db.execute(sql`
    SELECT id, scheme_id, scheme_name, engineer_name, mobile, delivery_status, gateway_status, is_success, template_name, sent_date, created_at
    FROM sms_alert_logs
    WHERE is_success = false OR gateway_status >= 400 OR delivery_status ILIKE '%FAIL%'
    ORDER BY id DESC
    LIMIT 5;
  `);
  console.log("Sample failed SMS:", sampleFailed.rows);
  process.exit(0);
}

checkTiers();
