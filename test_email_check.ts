import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  console.log("=== CHECKING EMAIL LOGS FOR TODAY (2026-10-16) ===");

  // 1. Check email_alert_logs
  const alertLogsCount = await pool.query(`
    SELECT count(*), sent_date::text, dispatch_type
    FROM email_alert_logs
    WHERE sent_date >= CURRENT_DATE - INTERVAL '1 day'
    GROUP BY sent_date, dispatch_type
    ORDER BY sent_date DESC;
  `);
  console.log("email_alert_logs breakdown:", alertLogsCount.rows);

  const sampleAlertLogs = await pool.query(`
    SELECT id, scheme_id, alert_type, sent_date, sent_time, recipient_email, recipient_role, civil_engineer_name, civil_engineer_email, dispatch_type, created_at
    FROM email_alert_logs
    WHERE sent_date >= CURRENT_DATE - INTERVAL '1 day'
    ORDER BY created_at DESC LIMIT 5;
  `);
  console.log("sample email_alert_logs:", sampleAlertLogs.rows);

  // 2. Check email_acknowledgements
  const ackCountToday = await pool.query(`
    SELECT count(*), count(distinct scheme_id) as unique_schemes, count(distinct lower(trim(engineer_name))) as unique_engineers, count(distinct lower(trim(engineer_email))) as unique_emails
    FROM email_acknowledgements
    WHERE sent_date = CURRENT_DATE OR created_at >= CURRENT_DATE;
  `);
  console.log("email_acknowledgements today:", ackCountToday.rows);

  // Group by token / master token / scheme to see how many actual emails were dispatched
  const tokensQuery = await pool.query(`
    SELECT 
      scheme_id, 
      sent_date::text,
      engineer_name, 
      engineer_email, 
      count(distinct alert_type) as alert_types_count,
      array_agg(distinct alert_type) as alert_types,
      count(*) as item_tokens_count
    FROM email_acknowledgements
    WHERE sent_date = CURRENT_DATE OR created_at >= CURRENT_DATE
    GROUP BY scheme_id, sent_date, engineer_name, engineer_email
    ORDER BY scheme_id;
  `);
  console.log("Schemes with email acknowledgements today (count=" + tokensQuery.rows.length + "):");
  console.log(tokensQuery.rows.slice(0, 10));

  // Check roles/tiers
  const tierQuery = await pool.query(`
    SELECT 
      ea.engineer_name,
      ea.engineer_email,
      count(distinct ea.scheme_id) as scheme_count,
      array_agg(distinct ea.alert_type) as alert_types
    FROM email_acknowledgements ea
    WHERE ea.sent_date = CURRENT_DATE OR ea.created_at >= CURRENT_DATE
    GROUP BY ea.engineer_name, ea.engineer_email
    ORDER BY scheme_count DESC;
  `);
  console.log("Engineers receiving emails today (count=" + tierQuery.rows.length + "):");
  console.log(tierQuery.rows);

  await pool.end();
}

check().catch(console.error);
