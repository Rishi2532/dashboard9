import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function checkSchemes() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      sent_date,
      count(DISTINCT scheme_id) as distinct_schemes,
      count(*) as total_sms
    FROM sms_alert_logs
    GROUP BY sent_date
    ORDER BY sent_date DESC
    LIMIT 5;
  `);
  console.log("Distinct schemes with SMS:", res.rows);
  process.exit(0);
}

checkSchemes();
