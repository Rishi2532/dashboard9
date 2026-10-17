import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const r = await pool.query(`
    SELECT scheme_id, alert_type, alert_value, village_name, esr_name, sent_date, created_at
    FROM email_alert_logs
    WHERE scheme_id = '417239'
    ORDER BY sent_date DESC
    LIMIT 20
  `);
  console.log('alert logs for 417239:');
  console.table(r.rows);

  await pool.end();
}
run();
