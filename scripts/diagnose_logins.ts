import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = await getDB();
    
    // Find all users who have logins in user_login_logs
    const userLogins = await db.execute(sql`
      SELECT 
        l.user_id,
        l.username as log_username,
        l.user_name as log_user_name,
        COUNT(*) as login_count,
        MAX(l.login_time) as latest_login,
        u.id as user_table_id,
        u.username as user_username,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.role as user_role
      FROM user_login_logs l
      LEFT JOIN users u ON l.user_id = u.id
      GROUP BY l.user_id, l.username, l.user_name, u.id, u.username, u.name, u.email, u.phone, u.role
      ORDER BY latest_login DESC
    `);
    
    console.log("=== USERS WITH LOGINS IN user_login_logs ===");
    for (const row of userLogins.rows) {
      console.log(JSON.stringify(row, null, 2));
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
