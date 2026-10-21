import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const q = `
      SELECT 
        s.id,
        s.scheme_id,
        COALESCE(s.scheme_name, sed.scheme, s.scheme_id, 'Water Scheme') as scheme_name,
        COALESCE(sed.region, ss.region, 'Maharashtra') as region,
        COALESCE(ss.block, sed.district, '-') as village_name,
        COALESCE(s.template_name, s.alert_type, 'SMS Alert') as alert_type,
        s.message_text,
        COALESCE(s.template_id, s.dlt_template_id) as template_id,
        COALESCE(s.mobile, s.recipient_mobile) as mobile,
        COALESCE(s.engineer_name, s.recipient_name, 'Field Engineer') as engineer_name,
        COALESCE(s.engineer_email, sed.ee_civil_email) as engineer_email,
        COALESCE(s.recipient_role, 'Field Officer') as recipient_role,
        s.gateway_status,
        s.gateway_response,
        COALESCE(s.status, CASE WHEN s.is_success THEN 'SUCCESS' ELSE 'FAILED' END) as status,
        s.sent_date,
        COALESCE(s.created_at, s.sent_at) as created_at
      FROM sms_alert_logs s
      LEFT JOIN scheme_status ss ON s.scheme_id = ss.scheme_id
      LEFT JOIN (
        SELECT DISTINCT ON (scheme_id) scheme_id, scheme, region, district, ee_civil_email
        FROM scheme_engineer_details
      ) sed ON (s.scheme_id = sed.scheme_id OR s.scheme_name ILIKE sed.scheme)
      ORDER BY COALESCE(s.created_at, s.sent_at) DESC;
    `;
    const res = await pool.query(q);
    console.log('QUERY SUCCESS! Rows returned:', res.rows.length);
    console.log('Sample row:', res.rows[0]);
  } catch (err: any) {
    console.error('QUERY FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

run();

