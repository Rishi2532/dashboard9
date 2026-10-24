import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function test(userId: number) {
  const db = await getDB();
  const loginRes: any = await db.execute(sql`
    SELECT id, user_id, username, user_name, login_time, logout_time, session_duration, ip_address, user_agent, is_active
    FROM user_login_logs
    WHERE user_id = ${userId}
    ORDER BY login_time DESC
    LIMIT 30
  `);
  console.log(`User ${userId} logs:`, loginRes.rows.length);
}

async function run() {
  await test(136); // Rishi2542
  await test(138); // deepakingale
  await test(2);   // Rishi
  await test(4);   // Rushi
  await test(85);  // se_mjp_pune
  await test(87);  // ee_mjp_dev_pune
  process.exit(0);
}

run();
