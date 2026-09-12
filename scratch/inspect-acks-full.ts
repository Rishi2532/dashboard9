import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const acks = await client.query(`SELECT id, token, scheme_id, alert_type, engineer_email, engineer_name, sent_date, acknowledged_at FROM email_acknowledgements ORDER BY id DESC LIMIT 50`);
    console.log("Total acks:", acks.rows.length);
    console.log(acks.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
