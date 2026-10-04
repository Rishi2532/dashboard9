const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  // Check min and max created_at for each template today, and distribution of created_at
  const timeDist = await pool.query(`
    SELECT template_name, 
           MIN(created_at) as earliest, 
           MAX(created_at) as latest, 
           COUNT(*) as cnt,
           date_trunc('hour', created_at) as hr
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE
    GROUP BY template_name, date_trunc('hour', created_at)
    ORDER BY hr ASC, template_name
  `);
  console.log('Hourly distribution of SMS today:');
  console.table(timeDist.rows);

  // Check email_alert_logs to see when daily alerts ran vs realtime alerts
  const emails = await pool.query(`
    SELECT alert_type, MIN(created_at) as earliest, MAX(created_at) as latest, COUNT(*)
    FROM email_alert_logs
    WHERE sent_date = CURRENT_DATE
    GROUP BY alert_type
  `);
  console.log('Email alert logs today:');
  console.table(emails.rows);

  await pool.end();
}

main().catch(console.error);
