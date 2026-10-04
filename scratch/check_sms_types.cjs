const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const templates = await pool.query(`
    SELECT template_name, template_id, COUNT(*) as cnt, COUNT(DISTINCT scheme_id) as schemes
    FROM sms_alert_logs 
    WHERE sent_date = CURRENT_DATE 
    GROUP BY template_name, template_id
    ORDER BY cnt DESC
  `);
  console.log('Today templates:');
  console.log(JSON.stringify(templates.rows, null, 2));

  // Also let's check created_at timestamps and how alerts are sent
  const sampleTime = await pool.query(`
    SELECT template_name, created_at, alert_value, alert_id
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE
    ORDER BY created_at ASC
    LIMIT 10
  `);
  console.log('Sample time and alert info:');
  console.log(JSON.stringify(sampleTime.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
