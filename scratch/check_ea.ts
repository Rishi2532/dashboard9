import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkEa() {
  try {
    const res = await pool.query(`
      SELECT sent_date, engineer_role, count(*), count(distinct scheme_id) as schemes
      FROM email_acknowledgements 
      WHERE sent_date = '2026-10-17' 
      GROUP BY sent_date, engineer_role;
    `);
    console.log('email_acknowledgements today:', res.rows);
    await pool.end();
  } catch (err) {
    console.error(err);
  }
}
checkEa();
