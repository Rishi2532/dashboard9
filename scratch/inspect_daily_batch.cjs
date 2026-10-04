const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const dailyBatch = await pool.query(`
    SELECT template_name, COUNT(*), COUNT(DISTINCT mobile) as unique_mobiles
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE AND created_at <= '2026-10-04T05:20:00.000Z'
    GROUP BY template_name
    ORDER BY template_name
  `);
  console.log('Daily batch SMS at 05:15:');
  console.table(dailyBatch.rows);

  const totalDaily = await pool.query(`
    SELECT id, mobile, engineer_name, template_name, is_success, created_at
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE AND created_at <= '2026-10-04T05:20:00.000Z'
    ORDER BY id ASC
  `);
  console.log('All SMS in daily batch (count = ' + totalDaily.rows.length + '):');
  console.table(totalDaily.rows);

  await pool.end();
}

main().catch(console.error);
