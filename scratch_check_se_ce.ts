import { getDB } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  
  // 1. Check all distinct tiers and recipient names/emails in email_acknowledgements for today
  const ea = await db.execute(sql`
    SELECT 
      engineer_name, 
      engineer_email, 
      COUNT(*) as cnt,
      array_agg(DISTINCT alert_type) as alert_types
    FROM email_acknowledgements
    WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    GROUP BY engineer_name, engineer_email
    ORDER BY cnt DESC
  `);
  console.log('--- email_acknowledgements today (count: ' + ea.rows.length + ') ---');
  console.log(ea.rows);

  // 2. Check all distinct records in email_alert_logs for today
  const el = await db.execute(sql`
    SELECT 
      dispatch_type,
      chief_engineer_name, chief_engineer_email,
      se_name, se_email,
      ee_civil_name, ee_civil_email,
      de_ae_civil_name, de_ae_civil_email,
      COUNT(*) as cnt
    FROM email_alert_logs
    WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    GROUP BY dispatch_type, chief_engineer_name, chief_engineer_email, se_name, se_email, ee_civil_name, ee_civil_email, de_ae_civil_name, de_ae_civil_email
  `);
  console.log('--- email_alert_logs groups today ---');
  console.log(el.rows);

  // 3. Check scheme_engineer_details for SE and CE emails
  const se_ce = await db.execute(sql`
    SELECT DISTINCT 
      se_name, se_email, chief_engineer_name, chief_engineer_email
    FROM scheme_engineer_details
    WHERE se_email IS NOT NULL OR chief_engineer_email IS NOT NULL
  `);
  console.log('--- SE / CE in scheme_engineer_details ---');
  console.log(se_ce.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
