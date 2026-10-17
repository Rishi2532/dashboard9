import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectRuns() {
  try {
    const res = await pool.query(`
      SELECT sent_time, engineer_role, count(*), count(distinct engineer_email) as distinct_emails, sum(total_schemes) as sum_schemes
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17'
      GROUP BY sent_time, engineer_role
      ORDER BY sent_time ASC;
    `);
    console.log(res.rows);

    const run2 = await pool.query(`
      SELECT id, sent_time, engineer_name, engineer_email, engineer_role, total_schemes, scheme_ids
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17' AND sent_time = '15:49:01'
      LIMIT 10;
    `);
    console.log('Sample run 2:', run2.rows);

    await pool.end();
  } catch (e) {
    console.error(e);
  }
}
inspectRuns();
