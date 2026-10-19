import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { runDailyAlertsJob } from '../server/cron/daily-alerts';

async function redispatch() {
  const db = await getDB();
  console.log('🗑️ Purging today (2026-10-19) daily alerts from email_alert_logs, consolidated_email_dispatches, email_acknowledgements...');
  
  await db.execute(sql`
    DELETE FROM email_alert_logs 
    WHERE sent_date = '2026-10-19' 
      AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
      AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
  `);

  await db.execute(sql`
    DELETE FROM consolidated_email_dispatches 
    WHERE dispatch_date = '2026-10-19'
  `);

  await db.execute(sql`
    DELETE FROM email_acknowledgements 
    WHERE sent_date = '2026-10-19'
  `);

  console.log('🚀 Running runDailyAlertsJob({ forceAllTiers: true, skipEmailSending: false })...');
  await runDailyAlertsJob({ forceAllTiers: true });

  console.log('✅ Daily alerts job finished.');
  process.exit(0);
}

redispatch().catch(err => {
  console.error('❌ Error during redispatch:', err);
  process.exit(1);
});
