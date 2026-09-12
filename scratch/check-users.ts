import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const users = await client.query(`SELECT id, username, name, email, phone, role FROM users`);
    console.log("=== All Users ===");
    console.log(users.rows);

    const logs = await client.query(`SELECT id, username, user_id, ip_address, status, created_at FROM login_logs ORDER BY id DESC LIMIT 10`);
    console.log("\n=== Recent Login Logs ===");
    console.log(logs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
