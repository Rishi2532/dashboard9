import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql`SELECT id, username, password, role FROM users WHERE username = 'admin'`);
  console.log('Admin password:', res.rows[0]?.password);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
