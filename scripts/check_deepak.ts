import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const u = await db.execute(sql`SELECT * FROM users WHERE username = 'deepakingale'`);
  console.log("deepakingale user:", u.rows);
  const l = await db.execute(sql`SELECT * FROM user_login_logs WHERE username = 'deepakingale' OR user_id = ${u.rows[0]?.id}`);
  console.log("deepakingale logs:", l.rows);
  process.exit(0);
}
run();
