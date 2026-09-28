import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDB();
  const acks: any = await db.execute(sql`
    SELECT id, token, scheme_id, alert_type, alert_id, ticket_id, esr_name, engineer_email, engineer_name, sent_date, acknowledged_at 
    FROM email_acknowledgements 
    ORDER BY id DESC LIMIT 10
  `);
  console.log('Recent acknowledgements:', acks.rows || acks);

  const usersRes: any = await db.execute(sql`
    SELECT id, username, name, email, phone, role FROM users WHERE role = 'engineer' LIMIT 5
  `);
  console.log('Sample engineer users:', usersRes.rows || usersRes);
  process.exit(0);
}

check().catch(console.error);
