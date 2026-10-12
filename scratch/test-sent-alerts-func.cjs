const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function getSentAlerts({ timeRange = '7days', tier, channel, search, limit = 50, offset = 0 } = {}) {
  let dateFilter = '';
  if (timeRange === 'today') {
    dateFilter = "created_at >= CURRENT_DATE";
  } else if (timeRange === 'yesterday') {
    dateFilter = "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE";
  } else if (timeRange === '7days') {
    dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
  } else if (timeRange === '30days') {
    dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
  }

  const whereClauses = [];
  if (dateFilter) whereClauses.push(dateFilter);
  if (channel && channel !== 'all') whereClauses.push(`channel = '${channel}'`);
  if (tier && tier !== 'all') whereClauses.push(`tier = ${parseInt(tier, 10)}`);
  if (search && search.trim()) {
    const s = search.trim().replace(/'/g, "''");
    whereClauses.push(`(scheme_name ILIKE '%${s}%' OR scheme_id ILIKE '%${s}%' OR recipient_name ILIKE '%${s}%' OR alert_title ILIKE '%${s}%')`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const baseQuery = `
    WITH combined_alerts AS (
      SELECT 
        s.id,
        'sms' AS channel,
        s.created_at,
        s.scheme_id,
        s.scheme_name,
        COALESCE(s.engineer_name, 'Engineer') AS recipient_name,
        s.engineer_email AS recipient_email,
        s.mobile AS recipient_mobile,
        CASE 
          WHEN s.engineer_name ILIKE '%Deepak Ingale%' OR s.engineer_name ILIKE '%Chief Engineer%' OR s.template_id = 'LEVEL_3_ESCALATION_CE' THEN 'Chief Engineer'
          WHEN s.engineer_name ILIKE '%Rishikesh Salunkhe%' THEN 'Superintending Engineer'
          WHEN s.engineer_name ILIKE '%Rishikesh Salunke%' OR s.template_id = 'LEVEL_2_ESCALATION_EE' THEN 'Executive Engineer (Civil)'
          WHEN s.engineer_name ILIKE '%Akshay Bhojane%' THEN 'Deputy Engineer (Civil)'
          ELSE 'Field Engineer'
        END AS recipient_role,
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
        s.dispatch_type
      FROM sms_alert_logs s

      UNION ALL

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
          WHEN e.chief_engineer_email IS NOT NULL AND e.chief_engineer_email != '' THEN 'Chief Engineer'
          WHEN e.ee_civil_email IS NOT NULL AND e.ee_civil_email != '' THEN 'Executive Engineer (Civil)'
          ELSE 'Deputy Engineer (Civil)'
        END AS recipient_role,
        CASE 
          WHEN e.chief_engineer_email IS NOT NULL AND e.chief_engineer_email != '' THEN 3
          WHEN e.ee_civil_email IS NOT NULL AND e.ee_civil_email != '' THEN 2
          ELSE 1
        END AS tier,
        CONCAT(e.alert_type, ' - ', e.alert_value) AS alert_title,
        CONCAT('Ticket: ', e.ticket_id, ' | Village: ', e.village_name, ' | ESR: ', e.esr_name, ' | Issue: ', e.alert_type, ' (', e.alert_value, ')') AS message_content,
        'DELIVERED' AS status,
        e.dispatch_type
      FROM email_alert_logs e
    )
  `;

  // Summary query
  const summarySql = `
    ${baseQuery}
    SELECT 
      COUNT(*) AS total_sent,
      COUNT(*) FILTER (WHERE channel = 'sms') AS sms_sent,
      COUNT(*) FILTER (WHERE channel = 'email') AS email_sent,
      COUNT(*) FILTER (WHERE tier = 1) AS tier_1_sent,
      COUNT(*) FILTER (WHERE tier = 2) AS tier_2_sent,
      COUNT(*) FILTER (WHERE tier = 3) AS tier_3_sent,
      (SELECT COUNT(*) FROM combined_alerts WHERE created_at >= CURRENT_DATE) AS today_sent_count,
      MAX(created_at) AS last_dispatched_at
    FROM combined_alerts
    ${whereSql};
  `;

  const rowsSql = `
    ${baseQuery}
    SELECT * FROM combined_alerts
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  const [summaryRes, rowsRes] = await Promise.all([
    client.query(summarySql),
    client.query(rowsSql),
  ]);

  return {
    summary: summaryRes.rows[0],
    alerts: rowsRes.rows,
  };
}

async function run() {
  await client.connect();

  console.log("--- TEST 1: timeRange = today ---");
  const todayRes = await getSentAlerts({ timeRange: 'today' });
  console.log("Today summary:", todayRes.summary);
  console.log("Today alerts count:", todayRes.alerts.length);

  console.log("\n--- TEST 2: timeRange = 7days ---");
  const weekRes = await getSentAlerts({ timeRange: '7days', limit: 5 });
  console.log("7 days summary:", weekRes.summary);
  console.log("Sample 7 days alerts:", weekRes.alerts.map(a => ({
    id: a.id,
    channel: a.channel,
    tier: a.tier,
    role: a.recipient_role,
    name: a.recipient_name,
    title: a.alert_title,
    time: a.created_at
  })));

  await client.end();
}

run().catch(console.error);
