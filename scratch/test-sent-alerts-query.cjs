const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  // Test union query of sent alerts across SMS and Email
  const sql = `
    WITH combined_alerts AS (
      -- SMS alerts
      SELECT 
        s.id,
        'sms' AS channel,
        s.created_at,
        s.scheme_id,
        s.scheme_name,
        s.engineer_name AS recipient_name,
        s.engineer_email AS recipient_email,
        s.mobile AS recipient_mobile,
        CASE 
          WHEN s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
          WHEN s.engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 3
          WHEN s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' THEN 2
          WHEN s.engineer_name ILIKE '%Akshay Bhojane%' THEN 1
          ELSE 1
        END AS tier,
        s.template_name AS alert_title,
        s.message_text AS message_content,
        COALESCE(s.delivery_status, CASE WHEN s.is_success THEN 'DELIVERED' ELSE 'FAILED' END) AS status,
        s.dispatch_type,
        s.gateway_response
      FROM sms_alert_logs s

      UNION ALL

      -- Email alerts
      SELECT 
        e.id,
        'email' AS channel,
        e.created_at,
        e.scheme_id,
        e.scheme_name,
        COALESCE(e.civil_engineer_name, e.ee_civil_name, e.chief_engineer_name, 'Engineer') AS recipient_name,
        COALESCE(e.civil_engineer_email, e.ee_civil_email, e.chief_engineer_email, 'Email') AS recipient_email,
        NULL AS recipient_mobile,
        CASE 
          WHEN e.chief_engineer_email IS NOT NULL AND e.chief_engineer_email != '' THEN 3
          WHEN e.ee_civil_email IS NOT NULL AND e.ee_civil_email != '' THEN 2
          ELSE 1
        END AS tier,
        CONCAT(e.alert_type, ' - ', e.alert_value) AS alert_title,
        CONCAT('Ticket: ', e.ticket_id, ' | Village: ', e.village_name, ' | ESR: ', e.esr_name, ' | Issue: ', e.alert_type, ' (', e.alert_value, ')') AS message_content,
        'DELIVERED' AS status,
        e.dispatch_type,
        NULL AS gateway_response
      FROM email_alert_logs e
    )
    SELECT * FROM combined_alerts
    ORDER BY created_at DESC
    LIMIT 10;
  `;

  const res = await client.query(sql);
  console.log(`Fetched ${res.rows.length} combined alerts.`);
  console.log("Sample rows:", res.rows.slice(0, 3));

  // Count by date
  const summaryRes = await client.query(`
    SELECT 
      COUNT(*) AS total_sent,
      COUNT(*) FILTER (WHERE channel = 'sms') AS sms_sent,
      COUNT(*) FILTER (WHERE channel = 'email') AS email_sent,
      COUNT(*) FILTER (WHERE tier = 1) AS tier_1_sent,
      COUNT(*) FILTER (WHERE tier = 2) AS tier_2_sent,
      COUNT(*) FILTER (WHERE tier = 3) AS tier_3_sent,
      MAX(created_at) AS last_dispatched_at
    FROM (
      SELECT 'sms' as channel, created_at,
        CASE 
          WHEN engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Chief Engineer%' OR template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
          WHEN engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 3
          WHEN engineer_name ILIKE '%Rishikesh Salunke%' OR template_id = 'LEVEL_2_ESCALATION_EE' THEN 2
          ELSE 1
        END AS tier
      FROM sms_alert_logs
      UNION ALL
      SELECT 'email' as channel, created_at,
        CASE 
          WHEN chief_engineer_email IS NOT NULL AND chief_engineer_email != '' THEN 3
          WHEN ee_civil_email IS NOT NULL AND ee_civil_email != '' THEN 2
          ELSE 1
        END AS tier
      FROM email_alert_logs
    ) sub;
  `);
  console.log("\nSummary stats:", summaryRes.rows[0]);

  await client.end();
}

main().catch(console.error);
