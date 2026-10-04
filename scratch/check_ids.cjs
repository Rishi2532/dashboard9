const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const rows = await pool.query(`
    SELECT id, mobile, engineer_name, template_name, is_success, created_at
    FROM sms_alert_logs
    WHERE id BETWEEN 235 AND 260
    ORDER BY id ASC
  `);
  console.table(rows.rows);

  await pool.end();
}

main().catch(console.error);
