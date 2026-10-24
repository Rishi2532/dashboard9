import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = await getDB();
    const users = await db.execute(sql`
      SELECT id, username, name, email, phone, role
      FROM users
      ORDER BY id ASC
    `);
    console.log(`Total users: ${users.rows.length}`);
    for (const u of users.rows) {
      console.log(`id: ${u.id}, username: "${u.username}", name: "${u.name}", email: "${u.email}", phone: "${u.phone}", role: "${u.role}"`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
