import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const s = await pool.query(`
    SELECT scheme_id, scheme, de_ae_civil_name, de_ae_civil_email, ee_civil_name, ee_civil_email
    FROM scheme_engineer_details
    WHERE scheme ILIKE '%Wangani%';
  `);
  console.log('=== Scheme Engineer Details ===');
  console.log(JSON.stringify(s.rows, null, 2));

  const cd = await pool.query(`
    SELECT id, dispatch_date, engineer_name, engineer_email, engineer_role, scheme_names, scheme_ids
    FROM consolidated_email_dispatches
    WHERE dispatch_date = '2026-10-17'::date AND engineer_name ILIKE '%Jagdhane%';
  `);
  console.log('=== Consolidated Dispatches today for Jagdhane ===');
  console.log(JSON.stringify(cd.rows, null, 2));

  // Let's also check what LPCD query in alerts-progress-routes returns for scheme 20027541
  const lpcdRow = await pool.query(`
    SELECT 
      scheme_id, scheme_name, de_ae_civil_name, de_ae_civil_email, ee_civil_name, ee_civil_email
    FROM email_alert_logs
    WHERE scheme_id = '20027541' AND sent_date = '2026-10-17'::date
    LIMIT 1;
  `);
  console.log('=== email_alert_logs row ===');
  console.log(JSON.stringify(lpcdRow.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
