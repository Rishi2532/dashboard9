import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDB();
    const datesInLogs = await db.execute(sql`
      SELECT sent_date, COUNT(*) 
      FROM email_alert_logs 
      GROUP BY sent_date 
      ORDER BY sent_date DESC 
      LIMIT 15
    `);
    console.log('--- email_alert_logs by sent_date ---');
    console.table(datesInLogs.rows);

    const datesInAcks = await db.execute(sql`
      SELECT sent_date, engineer_name, engineer_email, COUNT(*) 
      FROM email_acknowledgements 
      WHERE sent_date >= '2026-10-10'
      GROUP BY sent_date, engineer_name, engineer_email
      ORDER BY sent_date DESC
    `);
    console.log('--- email_acknowledgements >= 2026-10-10 ---');
    console.table(datesInAcks.rows);

  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
