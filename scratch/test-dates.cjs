const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== email_alert_logs distinct sent_date raw & in IST ===');
    const logs = await client.query(`
      SELECT 
        sent_date,
        sent_date AT TIME ZONE 'Asia/Kolkata' as sent_date_ist,
        (sent_date AT TIME ZONE 'Asia/Kolkata')::date as sent_date_ist_date,
        sent_date::text as raw_text,
        count(*) as count
      FROM email_alert_logs
      GROUP BY sent_date
      ORDER BY sent_date DESC
      LIMIT 10
    `);
    console.table(logs.rows);

    console.log('\n=== Testing the exact SQL from daily-alerts.ts line 526 ===');
    const pastRes = await client.query(`
      SELECT 
        scheme_id, 
        alert_type, 
        COALESCE(NULLIF(TRIM(village_name), ''), '-') as village_name, 
        COALESCE(NULLIF(TRIM(esr_name), ''), '-') as esr_name, 
        ARRAY_AGG(DISTINCT sent_date::text ORDER BY sent_date::text DESC) as past_dates 
      FROM email_alert_logs 
      WHERE sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days' 
        AND sent_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      GROUP BY scheme_id, alert_type, COALESCE(NULLIF(TRIM(village_name), ''), '-'), COALESCE(NULLIF(TRIM(esr_name), ''), '-')
      LIMIT 5
    `);
    console.log('Sample past_dates:', pastRes.rows[0]);

    console.log('\n=== Current Date in DB ===');
    const nowRes = await client.query(`
      SELECT 
        CURRENT_TIMESTAMP as utc_now,
        CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata' as ist_now,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date as ist_date
    `);
    console.table(nowRes.rows);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
