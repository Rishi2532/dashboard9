const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const q1 = await client.query(`
      SELECT COUNT(DISTINCT scheme_id || '__' || LOWER(TRIM(COALESCE(village_name, ''))) || '__' || LOWER(TRIM(COALESCE(esr_name, '')))) as cnt
      FROM email_alert_logs
      WHERE alert_type ILIKE '%Offline%' AND sent_date = '2026-10-19'
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
    `);
    console.log('Offline from email_alert_logs only:', q1.rows[0].cnt);
  } finally {
    client.release();
    pool.end();
  }
}
run();
