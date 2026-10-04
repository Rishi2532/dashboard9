const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const q1 = await pool.query(`
    SELECT COUNT(*) FROM (
      SELECT DISTINCT ON (scheme_id, mobile, sent_date) id 
      FROM sms_alert_logs 
      WHERE template_name ILIKE '%Offline%' 
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL) 
        AND sent_date = CURRENT_DATE
      ORDER BY scheme_id, mobile, sent_date, created_at DESC
    ) s
  `);
  console.log('Offline SMS deduped by mobile:', q1.rows[0].count);
  await pool.end();
}

main().catch(console.error);
