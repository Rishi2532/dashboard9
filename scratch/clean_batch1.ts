import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanBatch1() {
  try {
    const checkBefore = await pool.query(`
      SELECT engineer_role, count(*) 
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17' 
      GROUP BY engineer_role;
    `);
    console.log('Before cleanup:', checkBefore.rows);

    const del = await pool.query(`
      DELETE FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17' 
        AND sent_time = '14:12:01' 
        AND engineer_role = 'DE/AE (Civil)';
    `);
    console.log(`Deleted ${del.rowCount} duplicate consolidated rows from 14:12:01`);

    const checkAfter = await pool.query(`
      SELECT engineer_role, count(*) 
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17' 
      GROUP BY engineer_role;
    `);
    console.log('After cleanup:', checkAfter.rows);

    await pool.end();
  } catch (err) {
    console.error(err);
  }
}
cleanBatch1();
