import 'dotenv/config';
import { getDB } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  
  // 1. Check email_alert_logs for scheme 20027837
  const logs = await db.execute(sql`
    SELECT id, scheme_id, village_name, esr_name, alert_type, alert_value, sent_date, created_at
    FROM email_alert_logs
    WHERE scheme_id = '20027837' AND alert_type ILIKE '%chlorine%'
    ORDER BY sent_date DESC
    LIMIT 20
  `);
  console.log('email_alert_logs for scheme 20027837:');
  console.table(logs.rows);

  // 2. Check chlorine_data for scheme 20027837
  const clData = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, 
           chlorine_value_1, chlorine_value_2, chlorine_value_3, chlorine_value_4, 
           chlorine_value_5, chlorine_value_6, chlorine_value_7
    FROM chlorine_data
    WHERE scheme_id = '20027837'
  `);
  console.log('chlorine_data for scheme 20027837:');
  console.table(clData.rows);

  // 3. Were ANY email alerts dispatched on 2026-10-18 across the entire database?
  const oct18Alerts = await db.execute(sql`
    SELECT count(1)::int as alerts_on_oct18
    FROM email_alert_logs
    WHERE sent_date = '2026-10-18'
  `);
  console.log('Alerts on 2026-10-18 in email_alert_logs:', oct18Alerts.rows);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
