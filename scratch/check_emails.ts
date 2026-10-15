import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDB();
    const eng = await db.execute(sql`
      SELECT * FROM scheme_engineer_details WHERE scheme_id = '20027978'
    `);
    console.log('--- scheme_engineer_details for 20027978 ---');
    console.log(eng.rows[0]);

    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_alert_logs'
    `);
    console.log('--- email_alert_logs columns ---');
    console.table(cols.rows);

    const emailLogsToday = await db.execute(sql`
      SELECT * FROM email_alert_logs ORDER BY id DESC LIMIT 5
    `);
    console.log('--- latest email_alert_logs ---');
    console.log(emailLogsToday.rows);

  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
