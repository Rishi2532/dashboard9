const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        ea.engineer_name, 
        ea.engineer_email,
        COUNT(DISTINCT ea.scheme_id) as scheme_count
      FROM email_acknowledgements ea
      LEFT JOIN scheme_engineer_details s ON s.scheme_id = ea.scheme_id
      WHERE ea.sent_date = CURRENT_DATE
        AND (
          (LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(s.ee_civil_email, ''))) OR LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(COALESCE(s.ee_mech_email, ''))))
          AND (LOWER(TRIM(COALESCE(ea.engineer_name, ''))) = LOWER(TRIM(COALESCE(s.ee_civil_name, ''))) OR LOWER(TRIM(COALESCE(ea.engineer_name, ''))) = LOWER(TRIM(COALESCE(s.ee_mech_name, ''))))
        )
      GROUP BY ea.engineer_name, ea.engineer_email
    `);
    console.log('Officers categorized as Tier 2 (EE):', res.rows);

    const resAll = await client.query(`
      SELECT DISTINCT ea.engineer_name, ea.engineer_email
      FROM email_acknowledgements ea
      WHERE ea.sent_date = CURRENT_DATE
    `);
    console.log('Total distinct officers:', resAll.rows.length);

  } finally {
    client.release();
    pool.end();
  }
}
run();
