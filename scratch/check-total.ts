import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  const sedRows = await client.query('SELECT * FROM scheme_engineer_details');
  console.log('SED total rows:', sedRows.rows.length);
  if (sedRows.rows.length > 0) {
    console.log('SED sample row:', JSON.stringify(sedRows.rows[0], null, 2));
  }

  // Check email_alert_logs columns
  const emailCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'email_alert_logs'
  `);
  console.log('email_alert_logs columns:', emailCols.rows.map(r => r.column_name));

  // Check unique engineers in email_alert_logs
  const uniqueInLogs = await client.query(`
    SELECT DISTINCT ee_civil_name, ee_civil_email, se_name, chief_engineer_name 
    FROM email_alert_logs 
    LIMIT 5
  `);
  console.log('Sample in email_alert_logs:', uniqueInLogs.rows);

  client.release();
  pool.end();
}

run().catch(console.error);
