import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    console.log("=== 1. email_acknowledgements rows ===");
    const acks = await client.query(`SELECT * FROM email_acknowledgements ORDER BY id DESC LIMIT 20`);
    console.log(JSON.stringify(acks.rows, null, 2));

    console.log("\n=== 2. email_alert_logs rows ===");
    const logs = await client.query(`SELECT id, scheme_id, scheme_name, esr_name, alert_type, alert_value, sent_date, created_at, civil_engineer_email, mechanical_engineer_email FROM email_alert_logs ORDER BY id DESC LIMIT 20`);
    console.log(JSON.stringify(logs.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
