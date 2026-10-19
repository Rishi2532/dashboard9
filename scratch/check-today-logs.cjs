const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT sent_date, alert_type, COUNT(*) 
      FROM email_alert_logs 
      WHERE sent_date = '2026-10-19'
      GROUP BY sent_date, alert_type
    `);
    console.log('Today logs:', res.rows);
  } finally {
    client.release();
    pool.end();
  }
}
run();
