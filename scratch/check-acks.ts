import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const ids = ['20027978', '20021406', '20028065', '20030815', '20017217', '7890965', '456654', '20030798', '20054877', '7937337', '7948936', '7942125', '7940233'];
    for (const id of ids) {
      const a = await client.query("SELECT DISTINCT engineer_name, engineer_email, alert_type FROM email_acknowledgements WHERE scheme_id = $1 AND sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date", [id]);
      console.log(`Scheme ${id} acks:`, a.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
check().catch(console.error);
