const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const row271 = await pool.query(`
    SELECT *
    FROM sms_alert_logs
    WHERE id = 271
  `);
  console.log('Row 271:', row271.rows[0]);

  // Also check email_alert_logs around that time
  const emails = await pool.query(`
    SELECT id, scheme_id, alert_type, ticket_id, created_at, sent_date
    FROM email_alert_logs
    WHERE created_at BETWEEN '2026-10-04T05:15:00.000Z' AND '2026-10-04T05:20:00.000Z'
    ORDER BY id ASC
    LIMIT 10
  `);
  console.log('Emails at ~05:15:');
  console.table(emails.rows);

  await pool.end();
}

main().catch(console.error);
