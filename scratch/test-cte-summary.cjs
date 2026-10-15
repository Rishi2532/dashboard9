const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();

  const baseCte = `
    WITH combined_alerts AS (
      -- 1. SMS Alert Logs
      SELECT 
        s.id::text,
        'sms' AS channel,
        s.created_at,
        s.sent_date::date AS sent_date,
        s.scheme_id,
        s.scheme_name,
        COALESCE(s.engineer_name, 'Engineer') AS recipient_name,
        s.engineer_email AS recipient_email,
        s.mobile AS recipient_mobile,
        CASE 
          WHEN s.engineer_name ILIKE '%Principal Secretary%' OR s.dispatch_type = 'escalation_level5' THEN 'Principal Secretary (PS)'
          WHEN s.engineer_name ILIKE '%Member Secretary%' OR s.dispatch_type = 'escalation_level4' THEN 'Member Secretary (MS)'
          WHEN s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 'Chief Engineer (CE)'
          WHEN s.engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 'Superintending Engineer (SE)'
          WHEN s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' THEN 'Executive Engineer (EE Civil)'
          WHEN s.engineer_name ILIKE '%Rushikesh Salunke%' THEN 'Executive Engineer (EE Mech)'
          WHEN s.engineer_name ILIKE '%Akshay Bhojane%' THEN 'Deputy Engineer (DE Civil)'
          WHEN s.engineer_name ILIKE '%Rushikesh Salunkhe%' THEN 'Deputy Engineer (DE Mech)'
          ELSE 'Field Engineer'
        END AS recipient_role,
        CASE 
          WHEN s.engineer_name ILIKE '%Principal Secretary%' OR s.dispatch_type = 'escalation_level5' THEN 5
          WHEN s.engineer_name ILIKE '%Member Secretary%' OR s.dispatch_type = 'escalation_level4' THEN 4
          WHEN s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 3
          WHEN s.engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 3
          WHEN s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' THEN 2
          WHEN s.engineer_name ILIKE '%Rushikesh Salunke%' THEN 2
          ELSE 1
        END AS tier,
        s.template_name AS alert_title,
        s.message_text AS message_content,
        COALESCE(s.delivery_status, CASE WHEN s.is_success THEN 'DELIVERED' ELSE 'FAILED' END) AS status,
        s.dispatch_type
      FROM sms_alert_logs s

      UNION ALL

      -- 2. Email Acknowledgements (Actual Dispatched Emails to Engineers)
      SELECT 
        MIN(ea.id)::text AS id,
        'email' AS channel,
        MIN(ea.created_at) AS created_at,
        ea.sent_date::date AS sent_date,
        ea.scheme_id,
        COALESCE(
          (SELECT scheme_name FROM email_alert_logs WHERE scheme_id = ea.scheme_id AND scheme_name IS NOT NULL LIMIT 1),
          ea.scheme_id
        ) AS scheme_name,
        ea.engineer_name AS recipient_name,
        ea.engineer_email AS recipient_email,
        NULL AS recipient_mobile,
        CASE 
          WHEN ea.engineer_name ILIKE '%Principal Secretary%' OR ea.engineer_email ILIKE '%ps.%' THEN 'Principal Secretary (PS)'
          WHEN ea.engineer_name ILIKE '%Member Secretary%' OR ea.engineer_email ILIKE '%ms.%' THEN 'Member Secretary (MS)'
          WHEN ea.engineer_name ILIKE '%Deepak Ingale%' OR ea.engineer_name ILIKE '%Chief Engineer%' THEN 'Chief Engineer (CE)'
          WHEN ea.engineer_name ILIKE '%Rishikesh Salunkhe%' OR ea.engineer_email ILIKE '%rishikeshsalunke2001%' THEN 'Superintending Engineer (SE)'
          WHEN ea.engineer_name ILIKE '%Rishikesh Salunke%' OR ea.engineer_email ILIKE '%salunkerishikesh%' THEN 'Executive Engineer (EE Civil)'
          WHEN ea.engineer_name ILIKE '%Rushikesh Salunke%' OR ea.engineer_email ILIKE '%rushikeshsalunkhe33%' THEN 'Executive Engineer (EE Mech)'
          WHEN ea.engineer_name ILIKE '%Rushikesh Salunkhe%' OR ea.engineer_email ILIKE '%rishikesh.salunke@cstech.ai' THEN 'Deputy Engineer (DE Mech)'
          ELSE 'Deputy Engineer (DE Civil)'
        END AS recipient_role,
        CASE 
          WHEN ea.engineer_name ILIKE '%Principal Secretary%' OR ea.engineer_email ILIKE '%ps.%' THEN 5
          WHEN ea.engineer_name ILIKE '%Member Secretary%' OR ea.engineer_email ILIKE '%ms.%' THEN 4
          WHEN ea.engineer_name ILIKE '%Deepak Ingale%' OR ea.engineer_name ILIKE '%Chief Engineer%' THEN 3
          WHEN ea.engineer_name ILIKE '%Rishikesh Salunkhe%' OR ea.engineer_email ILIKE '%rishikeshsalunke2001%' THEN 3
          WHEN ea.engineer_name ILIKE '%Rishikesh Salunke%' OR ea.engineer_email ILIKE '%salunkerishikesh%' THEN 2
          WHEN ea.engineer_name ILIKE '%Rushikesh Salunke%' OR ea.engineer_email ILIKE '%rushikeshsalunkhe33%' THEN 2
          ELSE 1
        END AS tier,
        CONCAT('Daily Alert Digest (', GREATEST(COUNT(*)/2, 1), ' Issues)') AS alert_title,
        CONCAT('Consolidated alert digest containing ', GREATEST(COUNT(*)/2, 1), ' unresolved telemetry alerts.') AS message_content,
        'DELIVERED' AS status,
        'daily' AS dispatch_type
      FROM email_acknowledgements ea
      GROUP BY ea.sent_date, ea.scheme_id, ea.engineer_name, ea.engineer_email

      UNION ALL

      -- 3. Escalation Tier Specific Emails from email_alert_logs
      SELECT 
        e.id::text,
        'email' AS channel,
        e.created_at,
        e.sent_date::date AS sent_date,
        e.scheme_id,
        e.scheme_name,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN COALESCE(e.principal_secretary_name, 'Principal Secretary (PS)')
          WHEN e.dispatch_type = 'escalation_level4' THEN COALESCE(e.member_secretary_name, 'Member Secretary (MS)')
          WHEN e.dispatch_type = 'escalation_level3' THEN COALESCE(e.chief_engineer_name, e.se_name, 'Chief Engineer')
          WHEN e.dispatch_type = 'escalation_level2' THEN COALESCE(e.ee_civil_name, 'Executive Engineer (Civil)')
          ELSE COALESCE(e.civil_engineer_name, 'Deputy Engineer')
        END AS recipient_name,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN COALESCE(e.principal_secretary_email, 'ps.wss@maharashtra.gov.in')
          WHEN e.dispatch_type = 'escalation_level4' THEN COALESCE(e.member_secretary_email, 'ms.mjp@gov.in')
          WHEN e.dispatch_type = 'escalation_level3' THEN COALESCE(e.chief_engineer_email, e.se_email, 'ce.mjp@gov.in')
          WHEN e.dispatch_type = 'escalation_level2' THEN COALESCE(e.ee_civil_email, 'ee.mjp@gov.in')
          ELSE COALESCE(e.civil_engineer_email, 'de.mjp@gov.in')
        END AS recipient_email,
        NULL AS recipient_mobile,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN 'Principal Secretary (PS)'
          WHEN e.dispatch_type = 'escalation_level4' THEN 'Member Secretary (MS)'
          WHEN e.dispatch_type = 'escalation_level3' THEN 'Chief Engineer (CE)'
          WHEN e.dispatch_type = 'escalation_level2' THEN 'Executive Engineer (EE Civil)'
          ELSE 'Deputy Engineer (DE Civil)'
        END AS recipient_role,
        CASE 
          WHEN e.dispatch_type = 'escalation_level5' THEN 5
          WHEN e.dispatch_type = 'escalation_level4' THEN 4
          WHEN e.dispatch_type = 'escalation_level3' THEN 3
          WHEN e.dispatch_type = 'escalation_level2' THEN 2
          ELSE 1
        END AS tier,
        e.alert_type AS alert_title,
        e.alert_value AS message_content,
        'DELIVERED' AS status,
        e.dispatch_type
      FROM email_alert_logs e
      WHERE e.dispatch_type LIKE 'escalation_%'
    )
  `;

  // Test Today
  const todaySummary = await client.query(`
    ${baseCte}
    SELECT 
      COUNT(*) AS total_sent,
      COUNT(*) FILTER (WHERE channel = 'sms') AS sms_sent,
      COUNT(*) FILTER (WHERE channel = 'email') AS email_sent,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 1) AS de_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 2) AS ee_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 3 AND recipient_role ILIKE '%Superintending%') AS se_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 3 AND recipient_role ILIKE '%Chief Engineer%') AS ce_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 4) AS ms_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 5) AS ps_emails
    FROM combined_alerts
    WHERE (sent_date = CURRENT_DATE OR created_at >= CURRENT_DATE);
  `);
  console.log('--- TODAY (2026-10-15) SUMMARY ---');
  console.table(todaySummary.rows);

  // Test 2026-10-06
  const pastSummary = await client.query(`
    ${baseCte}
    SELECT 
      COUNT(*) AS total_sent,
      COUNT(*) FILTER (WHERE channel = 'sms') AS sms_sent,
      COUNT(*) FILTER (WHERE channel = 'email') AS email_sent,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 1) AS de_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 2) AS ee_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 3 AND recipient_role ILIKE '%Superintending%') AS se_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 3 AND recipient_role ILIKE '%Chief Engineer%') AS ce_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 4) AS ms_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND tier = 5) AS ps_emails
    FROM combined_alerts
    WHERE sent_date = '2026-10-06';
  `);
  console.log('--- 2026-10-06 SUMMARY ---');
  console.table(pastSummary.rows);

  await client.end();
}

run().catch(console.error);
