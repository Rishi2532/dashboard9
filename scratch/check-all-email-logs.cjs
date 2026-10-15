const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();

  console.log('=== EMAIL ACKNOWLEDGEMENTS SUMMARY BY DATE & RECIPIENT ===');
  const acks = await client.query(`
    SELECT sent_date, engineer_name, engineer_email, COUNT(*) as alert_count, COUNT(DISTINCT scheme_id) as schemes_count
    FROM email_acknowledgements
    GROUP BY sent_date, engineer_name, engineer_email
    ORDER BY sent_date DESC, alert_count DESC
    LIMIT 25;
  `);
  console.table(acks.rows);

  console.log('\n=== EMAIL ALERT LOGS SUMMARY BY DATE & DISPATCH TYPE ===');
  const emailLogs = await client.query(`
    SELECT 
      sent_date, 
      dispatch_type,
      COUNT(*) as total_alerts,
      COUNT(DISTINCT scheme_id) as schemes,
      COUNT(DISTINCT civil_engineer_email) as de_count,
      COUNT(DISTINCT ee_civil_email) as ee_count,
      COUNT(DISTINCT se_email) as se_count,
      COUNT(DISTINCT chief_engineer_email) as ce_count
    FROM email_alert_logs
    GROUP BY sent_date, dispatch_type
    ORDER BY sent_date DESC
    LIMIT 15;
  `);
  console.table(emailLogs.rows);

  console.log('\n=== DISTINCT RECIPIENT EMAILS IN EMAIL_ALERT_LOGS TODAY (2026-10-15) ===');
  const todayLogs = await client.query(`
    SELECT 
      civil_engineer_name, civil_engineer_email,
      ee_civil_name, ee_civil_email,
      se_name, se_email,
      chief_engineer_name, chief_engineer_email,
      member_secretary_name, member_secretary_email,
      principal_secretary_name, principal_secretary_email
    FROM email_alert_logs
    WHERE sent_date = '2026-10-15'
    LIMIT 3;
  `);
  console.log(todayLogs.rows);

  console.log('\n=== DISTINCT RECIPIENTS ON 2026-10-07 (PREVIOUS DATE) ===');
  const pastLogs = await client.query(`
    SELECT DISTINCT engineer_name, engineer_email
    FROM email_acknowledgements
    WHERE sent_date = '2026-10-07'
  `);
  console.table(pastLogs.rows);

  await client.end();
}

run().catch(console.error);
