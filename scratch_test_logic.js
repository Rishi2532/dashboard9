import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const q2 = await client.query(`
      SELECT 
        sub.sent_date,
        sub.engineer_email,
        sub.engineer_name,
        CASE
          WHEN EXISTS (SELECT 1 FROM scheme_engineer_details sed WHERE LOWER(sed.principal_secretary_email) LIKE '%' || sub.engineer_email || '%') OR sub.engineer_name ILIKE '%Principal Secretary%' THEN 'Principal Secretary (PS)'
          WHEN EXISTS (SELECT 1 FROM scheme_engineer_details sed WHERE LOWER(sed.member_secretary_email) LIKE '%' || sub.engineer_email || '%') OR sub.engineer_name ILIKE '%Member Secretary%' THEN 'Member Secretary (MS)'
          WHEN EXISTS (SELECT 1 FROM scheme_engineer_details sed WHERE LOWER(sed.chief_engineer_email) LIKE '%' || sub.engineer_email || '%') OR sub.engineer_name ILIKE '%Chief Engineer%' OR sub.engineer_name ILIKE '%Deepak Ingale%' THEN 'Chief Engineer (CE)'
          WHEN EXISTS (SELECT 1 FROM scheme_engineer_details sed WHERE LOWER(sed.se_email) LIKE '%' || sub.engineer_email || '%') OR sub.engineer_name ILIKE '%Superintending%' OR sub.engineer_name ILIKE '%Salunkhe%' THEN 'Superintending Engineer (SE)'
          WHEN EXISTS (SELECT 1 FROM scheme_engineer_details sed WHERE LOWER(sed.ee_civil_email) LIKE '%' || sub.engineer_email || '%' OR LOWER(sed.ee_mech_email) LIKE '%' || sub.engineer_email || '%') OR sub.engineer_name ILIKE '%Executive Engineer%' OR sub.engineer_name ILIKE '%EE %' THEN 'Executive Engineer (EE Civil)'
          ELSE 'Deputy Engineer (DE Civil)'
        END AS recipient_role
      FROM (
        SELECT 
          ea.sent_date::date as sent_date,
          LOWER(TRIM(ea.engineer_email)) as engineer_email,
          MAX(ea.engineer_name) as engineer_name
        FROM email_acknowledgements ea
        WHERE (ea.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR ea.sent_date = CURRENT_DATE)
        GROUP BY ea.sent_date::date, LOWER(TRIM(ea.engineer_email))
      ) sub
    `);
    console.log('Q2 - Dispatched email recipients today:', q2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
