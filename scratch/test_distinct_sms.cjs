const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const query = `
    WITH deduped_sms AS (
      SELECT DISTINCT ON (scheme_id, mobile, template_name, sent_date)
             id, mobile, engineer_name, engineer_email, template_name, template_id,
             message_text, gateway_status, is_success, sent_date, created_at, scheme_id
      FROM sms_alert_logs
      WHERE (template_name ILIKE '%Chlorine%' AND template_name NOT ILIKE '%Offline%')
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND sent_date = CURRENT_DATE
      ORDER BY scheme_id, mobile, template_name, sent_date, created_at DESC
    )
    SELECT scheme_id,
           json_agg(json_build_object(
             'id', id,
             'mobile', mobile,
             'engineer_name', engineer_name,
             'engineer_email', engineer_email,
             'template_name', template_name,
             'template_id', template_id,
             'message_text', message_text,
             'gateway_status', gateway_status,
             'is_success', is_success,
             'sent_date', sent_date::text,
             'created_at', created_at
           ) ORDER BY created_at DESC) as sms_dispatches
    FROM deduped_sms
    GROUP BY scheme_id
  `;
  const res = await pool.query(query);
  console.log('Deduped Chlorine daily SMS count:');
  console.log('Count:', res.rows[0]?.sms_dispatches?.length);
  console.log(res.rows[0]?.sms_dispatches.map(s => `${s.engineer_name}: ${s.mobile} (${s.is_success ? 'Success' : 'Fail'})`));
  await pool.end();
}

main().catch(console.error);
