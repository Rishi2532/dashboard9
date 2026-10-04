const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  await pool.query(`
    ALTER TABLE sms_alert_logs 
    ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(50) DEFAULT 'daily';
  `);
  console.log('Column dispatch_type added/verified.');

  // For today, rows > 270 are realtime alerts
  const updateRes = await pool.query(`
    UPDATE sms_alert_logs 
    SET dispatch_type = 'realtime' 
    WHERE id > 270;
  `);
  console.log(`Updated ${updateRes.rowCount} rows to realtime.`);

  const updateDaily = await pool.query(`
    UPDATE sms_alert_logs 
    SET dispatch_type = 'daily' 
    WHERE id <= 270;
  `);
  console.log(`Updated ${updateDaily.rowCount} rows to daily.`);

  // Let's check counts of daily SMS today
  const dailyCounts = await pool.query(`
    SELECT template_name, COUNT(*), COUNT(DISTINCT scheme_id) as schemes
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
    GROUP BY template_name
    ORDER BY template_name
  `);
  console.log('Daily SMS counts for today:');
  console.table(dailyCounts.rows);

  const realtimeCounts = await pool.query(`
    SELECT template_name, COUNT(*)
    FROM sms_alert_logs
    WHERE sent_date = CURRENT_DATE AND dispatch_type = 'realtime'
    GROUP BY template_name
    ORDER BY template_name
  `);
  console.log('Realtime SMS counts for today:');
  console.table(realtimeCounts.rows);

  await pool.end();
}

main().catch(console.error);
