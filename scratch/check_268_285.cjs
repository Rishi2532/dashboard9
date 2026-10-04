const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const r = await pool.query(`
    SELECT id, mobile, engineer_name, template_name, LEFT(message_text, 80) as msg, created_at
    FROM sms_alert_logs
    WHERE id BETWEEN 268 AND 285
    ORDER BY id ASC
  `);
  console.table(r.rows);
  await pool.end();
}

main().catch(console.error);
