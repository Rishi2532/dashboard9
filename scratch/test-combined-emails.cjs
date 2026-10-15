const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();

  const testQuery = `
    WITH combined_alerts AS (
      -- 1. Actual daily emails dispatched from email_acknowledgements (grouped per recipient per day per scheme)
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

      -- 2. Escalation tier emails logged in email_alert_logs
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
    SELECT 
      sent_date,
      tier,
      recipient_role,
      recipient_name,
      recipient_email,
      scheme_id,
      scheme_name,
      alert_title
    FROM combined_alerts
    WHERE sent_date >= CURRENT_DATE - INTERVAL '10 days'
    ORDER BY sent_date DESC, tier ASC;
  `;

  const res = await client.query(testQuery);
  console.log('--- RECENT COMBINED EMAIL DISPATCHES ---');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
