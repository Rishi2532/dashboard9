import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Self-healing migration to ensure newer columns exist on both local and cloud databases
(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        ALTER TABLE email_alert_logs 
          ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(50) DEFAULT 'daily',
          ADD COLUMN IF NOT EXISTS telemetry_date VARCHAR(50),
          ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(100);

        ALTER TABLE sms_alert_logs 
          ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(50) DEFAULT 'daily',
          ADD COLUMN IF NOT EXISTS telemetry_date VARCHAR(50),
          ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
          ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'PENDING',
          ADD COLUMN IF NOT EXISTS delivery_description TEXT,
          ADD COLUMN IF NOT EXISTS delivered_date VARCHAR(50),
          ADD COLUMN IF NOT EXISTS delivery_checked_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS gateway_response TEXT,
          ADD COLUMN IF NOT EXISTS scheme_id VARCHAR(100),
          ADD COLUMN IF NOT EXISTS scheme_name VARCHAR(255);
      `);
      console.log('✅ Alert logs tables schema verified (telemetry_date & dispatch_type ready)');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('ℹ️ Self-healing column check for alert logs:', err.message);
  }
})();

// Allow authenticated users (both engineers and administrators)
router.use((req: any, res: any, next: any) => {
  if (
    req.session?.userId ||
    req.session?.engineerId ||
    req.session?.isAdmin ||
    req.session?.email ||
    !process.env.NODE_ENV ||
    process.env.NODE_ENV !== 'production'
  ) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
});

/**
 * Helper to build strict single-date SQL filter for alert queries
 * - requestedDate: strictly queries that exact date
 * - subTab === 'previous': strictly queries yesterday's date in IST
 * - subTab === 'current' (or default): strictly queries today's date in IST (shows 0 if no alerts sent today)
 */
function getAlertDateFilter(requestedDate?: string, subTab: string = 'current') {
  const cleanDate = (requestedDate && requestedDate !== 'undefined' && requestedDate !== 'null' && requestedDate.trim() !== '') 
    ? requestedDate.trim() 
    : undefined;

  if (cleanDate) {
    return {
      dateFilter: `sent_date = $1::date`,
      queryParams: [cleanDate],
    };
  }
  if (subTab === 'previous') {
    return {
      dateFilter: `sent_date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')::date`,
      queryParams: [],
    };
  }
  // 'current' or default: today's alerts in IST or server current date
  return {
    dateFilter: `(sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR sent_date = CURRENT_DATE)`,
    queryParams: [],
  };
}

/**
 * GET /api/alerts-progress/total-engineers
 * Returns the total count of unique engineers assigned in scheme_engineer_details
 */
router.get('/total-engineers', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const q = `
        SELECT COUNT(DISTINCT LOWER(TRIM(name)))::int as total
        FROM (
          SELECT chief_engineer_name as name FROM scheme_engineer_details 
          WHERE chief_engineer_name IS NOT NULL 
            AND TRIM(chief_engineer_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') 
            AND LOWER(TRIM(chief_engineer_name)) NOT LIKE '%vendor%'
            AND LOWER(TRIM(chief_engineer_name)) NOT LIKE '%no engineer%'
          UNION
          SELECT se_name as name FROM scheme_engineer_details 
          WHERE se_name IS NOT NULL 
            AND TRIM(se_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') 
            AND LOWER(TRIM(se_name)) NOT LIKE '%vendor%'
            AND LOWER(TRIM(se_name)) NOT LIKE '%no engineer%'
          UNION
          SELECT ee_civil_name as name FROM scheme_engineer_details 
          WHERE ee_civil_name IS NOT NULL 
            AND TRIM(ee_civil_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') 
            AND LOWER(TRIM(ee_civil_name)) NOT LIKE '%vendor%'
            AND LOWER(TRIM(ee_civil_name)) NOT LIKE '%no engineer%'
          UNION
          SELECT ee_mech_name as name FROM scheme_engineer_details 
          WHERE ee_mech_name IS NOT NULL 
            AND TRIM(ee_mech_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') 
            AND LOWER(TRIM(ee_mech_name)) NOT LIKE '%vendor%'
            AND LOWER(TRIM(ee_mech_name)) NOT LIKE '%no engineer%'
          UNION
          SELECT de_ae_civil_name as name FROM scheme_engineer_details 
          WHERE de_ae_civil_name IS NOT NULL 
            AND TRIM(de_ae_civil_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') 
            AND LOWER(TRIM(de_ae_civil_name)) NOT LIKE '%vendor%'
            AND LOWER(TRIM(de_ae_civil_name)) NOT LIKE '%no engineer%'
          UNION
          SELECT de_ae_mech_name as name FROM scheme_engineer_details 
          WHERE de_ae_mech_name IS NOT NULL 
            AND TRIM(de_ae_mech_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') 
            AND LOWER(TRIM(de_ae_mech_name)) NOT LIKE '%vendor%'
            AND LOWER(TRIM(de_ae_mech_name)) NOT LIKE '%no engineer%'
        ) sub
      `;
      const result = await client.query(q);
      res.json({ totalEngineers: result.rows[0]?.total || 0 });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Error fetching total engineers count:', err);
    res.status(500).json({ error: 'Failed to fetch total engineers' });
  }
});

router.get('/lpcd', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    const { dateFilter, queryParams } = getAlertDateFilter(requestedDate, subTab);

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'LPCD' OR sensor_type IS NULL OR status_value LIKE '%LPCD%' OR reason LIKE '%LPCD%'
          GROUP BY scheme_id
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, village_name, sent_date) 
                 scheme_id, scheme_name, region, village_name, ticket_id, alert_value, telemetry_date,
                 sent_time,
                 ee_civil_name, ee_civil_email,
                 ee_mech_name, ee_mech_email,
                 de_ae_civil_name, de_ae_civil_email,
                 de_ae_mech_name, de_ae_mech_email,
                 se_name, se_email,
                 chief_engineer_name, chief_engineer_email,
                 civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email,
                 created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type IN ('LPCD', 'Low LPCD')
            AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
            AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
            AND ${dateFilter}
          ORDER BY scheme_id, village_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 sent_date,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'sent_date', sent_date::text,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   sent_date,
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type IN ('LPCD', 'Low LPCD')
              AND ${dateFilter}
            GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id, sent_date
        ),
        deduped_sms AS (
          SELECT DISTINCT ON (id)
                 id, mobile, engineer_name, engineer_email, template_name, template_id,
                 message_text, gateway_status, is_success, sent_date, created_at, scheme_id
          FROM sms_alert_logs
          WHERE (template_name ILIKE '%LPCD%' OR template_name IS NULL)
            AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
            AND ${dateFilter}
          ORDER BY id, created_at DESC
        ),
        sms_status AS (
          SELECT scheme_id,
                 sent_date,
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
          GROUP BY scheme_id, sent_date
        )
        SELECT 
          COALESCE(e.scheme_id, w.scheme_id) as scheme_id, 
          COALESCE(e.scheme_name, w.scheme_name) as scheme_name, 
          COALESCE(e.region, w.region) as region,
          COALESCE(e.village_name, w.village_name) as village_name,
          COALESCE(e.alert_value, w.lpcd_value_day7::text, '0') as current_value,
          COALESCE(e.alert_value, w.lpcd_value_day7::text, '0') as alert_value,
          w.lpcd_value_day6 as previous_value,
          COALESCE(e.telemetry_date, w.lpcd_date_day7, TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
          COALESCE(e.alert_value, w.lpcd_value_day7::text, '0') as historical_value,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          sed.ee_civil_mobile,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          sed.ee_mech_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          sed.de_ae_civil_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          sed.de_ae_mech_mobile,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          sed.se_mobile,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          sed.chief_engineer_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as civil_engineer_email,
          sed.de_ae_civil_mobile as civil_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          sed.de_ae_mech_mobile as mechanical_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
          COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
        FROM recent_logs e
        LEFT JOIN LATERAL (
          SELECT w.lpcd_value_day7, w.lpcd_value_day6, w.lpcd_date_day7, w.village_name, w.scheme_name, w.scheme_id, w.region
          FROM water_scheme_data w 
          WHERE w.scheme_id = e.scheme_id 
            AND (e.village_name IS NULL OR LOWER(TRIM(w.village_name)) = LOWER(TRIM(e.village_name)))
          ORDER BY (CASE WHEN e.village_name IS NOT NULL AND LOWER(TRIM(w.village_name)) = LOWER(TRIM(e.village_name)) THEN 0 ELSE 1 END)
          LIMIT 1
        ) w ON true
        LEFT JOIN LATERAL (
          SELECT s.water_supply 
          FROM scheme_status s 
          WHERE s.scheme_id = e.scheme_id 
          LIMIT 1
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
                 sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
                 sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
                 sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
                 sed.se_name, sed.se_email, sed.se_mobile,
                 sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
          FROM scheme_engineer_details sed 
          WHERE sed.scheme_id = e.scheme_id OR (e.scheme_name IS NOT NULL AND sed.scheme = e.scheme_name)
          LIMIT 1
        ) sed ON true
        LEFT JOIN issues i ON e.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON (e.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
        LEFT JOIN sms_status sms ON (e.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
        WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
      `;
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching LPCD alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch LPCD alerts progress' });
  }
});

router.get('/chlorine', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    const { dateFilter, queryParams } = getAlertDateFilter(requestedDate, subTab);

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'RCA' OR status_value LIKE '%Chlorine%' OR reason LIKE '%Chlorine%' OR reason LIKE '%RCA%'
          GROUP BY scheme_id
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, esr_name, sent_date) 
                 scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
                 sent_time,
                 ee_civil_name, ee_civil_email,
                 ee_mech_name, ee_mech_email,
                 de_ae_civil_name, de_ae_civil_email,
                 de_ae_mech_name, de_ae_mech_email,
                 se_name, se_email,
                 chief_engineer_name, chief_engineer_email,
                 civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email,
                 created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')
            AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
            AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
            AND ${dateFilter}
          ORDER BY scheme_id, esr_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 sent_date,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'sent_date', sent_date::text,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   sent_date,
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')
              AND ${dateFilter}
            GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id, sent_date
        ),
        deduped_sms AS (
          SELECT DISTINCT ON (id)
                 id, mobile, engineer_name, engineer_email, template_name, template_id,
                 message_text, gateway_status, is_success, sent_date, created_at, scheme_id
          FROM sms_alert_logs
          WHERE (template_name ILIKE '%Chlorine%' AND template_name NOT ILIKE '%Offline%')
            AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
            AND ${dateFilter}
          ORDER BY id, created_at DESC
        ),
        sms_status AS (
          SELECT scheme_id,
                 sent_date,
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
          GROUP BY scheme_id, sent_date
        )
        SELECT 
          COALESCE(e.scheme_id, c.scheme_id) as scheme_id, 
          COALESCE(e.scheme_name, c.scheme_name) as scheme_name, 
          COALESCE(e.region, c.region) as region,
          COALESCE(e.village_name, c.village_name) as village_name,
          COALESCE(e.esr_name, c.esr_name) as esr_name,
          COALESCE(e.alert_value, c.chlorine_value_7::text, '0') as current_value,
          COALESCE(e.alert_value, c.chlorine_value_7::text, '0') as alert_value,
          c.chlorine_value_6 as previous_value,
          COALESCE(e.telemetry_date, c.chlorine_date_day_7, TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
          COALESCE(e.alert_value, c.chlorine_value_7::text, '0') as historical_value,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          sed.ee_civil_mobile,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          sed.ee_mech_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          sed.de_ae_civil_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          sed.de_ae_mech_mobile,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          sed.se_mobile,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          sed.chief_engineer_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as civil_engineer_email,
          sed.de_ae_civil_mobile as civil_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          sed.de_ae_mech_mobile as mechanical_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
          COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
        FROM recent_logs e
        LEFT JOIN LATERAL (
          SELECT c.chlorine_value_7, c.chlorine_value_6, c.chlorine_date_day_7, c.esr_name, c.village_name, c.scheme_name, c.scheme_id, c.region
          FROM chlorine_data c
          WHERE c.scheme_id = e.scheme_id 
            AND (e.esr_name IS NULL OR LOWER(TRIM(c.esr_name)) = LOWER(TRIM(e.esr_name)))
          ORDER BY (CASE WHEN e.esr_name IS NOT NULL AND LOWER(TRIM(c.esr_name)) = LOWER(TRIM(e.esr_name)) THEN 0 ELSE 1 END)
          LIMIT 1
        ) c ON true
        LEFT JOIN LATERAL (
          SELECT s.water_supply 
          FROM scheme_status s 
          WHERE s.scheme_id = e.scheme_id 
          LIMIT 1
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
                 sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
                 sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
                 sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
                 sed.se_name, sed.se_email, sed.se_mobile,
                 sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
          FROM scheme_engineer_details sed 
          WHERE sed.scheme_id = e.scheme_id OR (e.scheme_name IS NOT NULL AND sed.scheme = e.scheme_name)
          LIMIT 1
        ) sed ON true
        LEFT JOIN issues i ON e.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON (e.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
        LEFT JOIN sms_status sms ON (e.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
        WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
      `;
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Chlorine alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Chlorine alerts progress' });
  }
});

router.get('/pressure', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    const { dateFilter, queryParams } = getAlertDateFilter(requestedDate, subTab);

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'PT' OR status_value LIKE '%Pressure%' OR reason LIKE '%Pressure%' OR reason LIKE '%PT%'
          GROUP BY scheme_id
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, esr_name, sent_date) 
                 scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
                 sent_time,
                 ee_civil_name, ee_civil_email,
                 ee_mech_name, ee_mech_email,
                 de_ae_civil_name, de_ae_civil_email,
                 de_ae_mech_name, de_ae_mech_email,
                 se_name, se_email,
                 chief_engineer_name, chief_engineer_email,
                 civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email,
                 created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type IN ('Pressure', 'Low Pressure')
            AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
            AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
            AND ${dateFilter}
          ORDER BY scheme_id, esr_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 sent_date,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'sent_date', sent_date::text,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   sent_date,
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type IN ('Pressure', 'Low Pressure')
              AND ${dateFilter}
            GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id, sent_date
        ),
        deduped_sms AS (
          SELECT DISTINCT ON (id)
                 id, mobile, engineer_name, engineer_email, template_name, template_id,
                 message_text, gateway_status, is_success, sent_date, created_at, scheme_id
          FROM sms_alert_logs
          WHERE (template_name ILIKE '%Pressure%' AND template_name NOT ILIKE '%Offline%')
            AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
            AND ${dateFilter}
          ORDER BY id, created_at DESC
        ),
        sms_status AS (
          SELECT scheme_id,
                 sent_date,
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
          GROUP BY scheme_id, sent_date
        )
        SELECT 
          COALESCE(e.scheme_id, p.scheme_id) as scheme_id, 
          COALESCE(e.scheme_name, p.scheme_name) as scheme_name, 
          COALESCE(e.region, p.region) as region,
          COALESCE(e.village_name, p.village_name) as village_name,
          COALESCE(e.esr_name, p.esr_name) as esr_name,
          COALESCE(e.alert_value, p.pressure_value_7::text, '0') as current_value,
          COALESCE(e.alert_value, p.pressure_value_7::text, '0') as alert_value,
          p.pressure_value_6 as previous_value,
          COALESCE(e.telemetry_date, p.pressure_date_day_7, TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
          COALESCE(e.alert_value, p.pressure_value_7::text, '0') as historical_value,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          sed.ee_civil_mobile,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          sed.ee_mech_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          sed.de_ae_civil_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          sed.de_ae_mech_mobile,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          sed.se_mobile,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          sed.chief_engineer_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as civil_engineer_email,
          sed.de_ae_civil_mobile as civil_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          sed.de_ae_mech_mobile as mechanical_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
          COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
        FROM recent_logs e
        LEFT JOIN LATERAL (
          SELECT p.pressure_value_7, p.pressure_value_6, p.pressure_date_day_7, p.esr_name, p.village_name, p.scheme_name, p.scheme_id, p.region
          FROM pressure_data p
          WHERE p.scheme_id = e.scheme_id 
            AND (e.esr_name IS NULL OR LOWER(TRIM(p.esr_name)) = LOWER(TRIM(e.esr_name)))
          ORDER BY (CASE WHEN e.esr_name IS NOT NULL AND LOWER(TRIM(p.esr_name)) = LOWER(TRIM(e.esr_name)) THEN 0 ELSE 1 END)
          LIMIT 1
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT s.water_supply 
          FROM scheme_status s 
          WHERE s.scheme_id = e.scheme_id 
          LIMIT 1
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
                 sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
                 sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
                 sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
                 sed.se_name, sed.se_email, sed.se_mobile,
                 sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
          FROM scheme_engineer_details sed 
          WHERE sed.scheme_id = e.scheme_id OR (e.scheme_name IS NOT NULL AND sed.scheme = e.scheme_name)
          LIMIT 1
        ) sed ON true
        LEFT JOIN issues i ON e.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON (e.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
        LEFT JOIN sms_status sms ON (e.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
        WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
      `;
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Pressure alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Pressure alerts progress' });
  }
});

router.get('/offline', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    const { dateFilter, queryParams } = getAlertDateFilter(requestedDate, subTab);

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'Offline' OR status_value LIKE '%Offline%' OR reason LIKE '%Offline%'
          GROUP BY scheme_id
        ),
        ack_status AS (
          SELECT scheme_id,
                 sent_date,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'sent_date', sent_date::text,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   sent_date,
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type = 'Offline'
              AND ${dateFilter}
            GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id, sent_date
        ),
        all_offline_logs AS (
          SELECT 
            scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
            sent_time, ee_civil_name, ee_civil_email, ee_mech_name, ee_mech_email,
            de_ae_civil_name, de_ae_civil_email, de_ae_mech_name, de_ae_mech_email,
            se_name, se_email, chief_engineer_name, chief_engineer_email,
            civil_engineer_name, civil_engineer_email, mechanical_engineer_name, mechanical_engineer_email,
            site_supervisor_name, site_supervisor_email, created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type ILIKE '%Offline%' AND ${dateFilter}
          UNION ALL
          SELECT 
            scheme_id, scheme_name, NULL as region, NULL as village_name, NULL as esr_name, NULL as ticket_id, 'Offline' as alert_value, telemetry_date,
            NULL as sent_time, NULL as ee_civil_name, NULL as ee_civil_email, NULL as ee_mech_name, NULL as ee_mech_email,
            NULL as de_ae_civil_name, NULL as de_ae_civil_email, NULL as de_ae_mech_name, NULL as de_ae_mech_email,
            NULL as se_name, NULL as se_email, NULL as chief_engineer_name, NULL as chief_engineer_email,
            NULL as civil_engineer_name, NULL as civil_engineer_email, NULL as mechanical_engineer_name, NULL as mechanical_engineer_email,
            NULL as site_supervisor_name, NULL as site_supervisor_email, created_at, sent_date
          FROM sms_alert_logs
          WHERE (template_name ILIKE '%Offline%') AND ${dateFilter}
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(esr_name, ''), COALESCE(village_name, ''), sent_date)
            *
          FROM all_offline_logs
          ORDER BY scheme_id, COALESCE(esr_name, ''), COALESCE(village_name, ''), sent_date, created_at DESC
        ),
        deduped_sms AS (
          SELECT DISTINCT ON (id)
                 id, mobile, engineer_name, engineer_email, template_name, template_id,
                 message_text, gateway_status, is_success, sent_date, created_at, scheme_id,
                 dispatch_type, telemetry_date
          FROM sms_alert_logs
          WHERE (template_name ILIKE '%Offline%' OR template_name IS NULL)
            AND ${dateFilter}
          ORDER BY id, created_at DESC
        ),
        sms_status AS (
          SELECT scheme_id,
                 sent_date,
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
          GROUP BY scheme_id, sent_date
        )
        SELECT 
          COALESCE(e.scheme_id, c.scheme_id) as scheme_id,
          COALESCE(e.scheme_name, c.scheme_name) as scheme_name,
          COALESCE(e.region, c.region) as region,
          COALESCE(e.village_name, c.village_name) as village_name,
          COALESCE(e.esr_name, c.esr_name) as esr_name,
          COALESCE(e.alert_value, 'Offline') as current_value,
          COALESCE(e.alert_value, 'Offline') as alert_value,
          COALESCE(e.telemetry_date, TO_CHAR(c.last_seen, 'YYYY-MM-DD HH24:MI'), TO_CHAR(c.pressure_last_seen, 'YYYY-MM-DD HH24:MI'), TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
          c.chlorine_status,
          c.pressure_status,
          c.flow_meter_status,
          c.chlorine_connected,
          c.pressure_connected,
          c.flow_meter_connected,
          c.last_seen,
          c.pressure_last_seen,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          sed.ee_civil_mobile,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          sed.ee_mech_mobile,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          sed.de_ae_civil_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          sed.de_ae_mech_mobile,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          sed.se_mobile,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          sed.chief_engineer_mobile,
          v.employee_name as vendor_name,
          v.email as vendor_email,
          v.phone as vendor_phone,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name, v.employee_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email, v.email) as civil_engineer_email,
          COALESCE(sed.de_ae_civil_mobile, v.phone) as civil_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          sed.de_ae_mech_mobile as mechanical_engineer_mobile,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
          COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
        FROM recent_logs e
        LEFT JOIN LATERAL (
          SELECT c.scheme_id, c.chlorine_status, c.pressure_status, c.flow_meter_status,
                 c.chlorine_connected, c.pressure_connected, c.flow_meter_connected,
                 c.last_seen, c.pressure_last_seen, c.esr_name, c.village_name, c.scheme_name, c.region
          FROM communication_status c
          WHERE c.scheme_id = e.scheme_id 
            AND (e.esr_name IS NULL OR LOWER(TRIM(c.esr_name)) = LOWER(TRIM(e.esr_name)))
          ORDER BY (CASE WHEN e.esr_name IS NOT NULL AND LOWER(TRIM(c.esr_name)) = LOWER(TRIM(e.esr_name)) THEN 0 ELSE 1 END)
          LIMIT 1
        ) c ON true
        LEFT JOIN LATERAL (
          SELECT s.water_supply, s.region, s.scheme_name
          FROM scheme_status s 
          WHERE s.scheme_id = e.scheme_id 
          LIMIT 1
        ) s ON true
        LEFT JOIN sms_status sms ON (e.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
        LEFT JOIN LATERAL (
          SELECT sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
                 sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
                 sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
                 sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
                 sed.se_name, sed.se_email, sed.se_mobile,
                 sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
          FROM scheme_engineer_details sed 
          WHERE sed.scheme_id = e.scheme_id OR (e.scheme_name IS NOT NULL AND sed.scheme = e.scheme_name)
          LIMIT 1
        ) sed ON true
        LEFT JOIN LATERAL (
          SELECT employee_name, email, phone
          FROM vendor v
          WHERE v.region = e.region OR v.region = c.region OR v.region = s.region
          LIMIT 1
        ) v ON true
        LEFT JOIN issues i ON e.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON (e.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
        WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
        ORDER BY COALESCE(e.region, c.region, s.region), COALESCE(e.scheme_name, c.scheme_name, s.scheme_name), e.village_name;
      `;
      const result = await client.query(query, queryParams);
      
      const mappedRows = result.rows.map((row: any) => {
        const offlineList: string[] = [];
        if (row.chlorine_status === 'Offline') offlineList.push('Chlorine');
        if (row.pressure_status === 'Offline') offlineList.push('Pressure');
        if (row.flow_meter_status === 'Offline') offlineList.push('Flow Meter');
        const val = offlineList.length > 0 ? offlineList.join(', ') : (row.current_value || 'Offline');
        
        return {
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          region: row.region,
          village_name: row.village_name,
          esr_name: row.esr_name,
          current_value: val,
          previous_value: null,
          current_value_date: row.current_value_date || null,
          historical_value: null,
          ticket_id: row.ticket_id || null,
          ee_civil_name: row.ee_civil_name || null,
          ee_civil_email: row.ee_civil_email || null,
          ee_civil_mobile: row.ee_civil_mobile || null,
          ee_mech_name: row.ee_mech_name || null,
          ee_mech_email: row.ee_mech_email || null,
          ee_mech_mobile: row.ee_mech_mobile || null,
          de_ae_civil_name: row.de_ae_civil_name || null,
          de_ae_civil_email: row.de_ae_civil_email || null,
          de_ae_civil_mobile: row.de_ae_civil_mobile || null,
          de_ae_mech_name: row.de_ae_mech_name || null,
          de_ae_mech_email: row.de_ae_mech_email || null,
          de_ae_mech_mobile: row.de_ae_mech_mobile || null,
          se_name: row.se_name || null,
          se_email: row.se_email || null,
          se_mobile: row.se_mobile || null,
          chief_engineer_name: row.chief_engineer_name || null,
          chief_engineer_email: row.chief_engineer_email || null,
          chief_engineer_mobile: row.chief_engineer_mobile || null,
          vendor_name: row.vendor_name || null,
          vendor_email: row.vendor_email || null,
          civil_engineer_name: row.civil_engineer_name || 'No Engineer/Vendor Assigned',
          civil_engineer_email: row.civil_engineer_email || null,
          civil_engineer_mobile: row.civil_engineer_mobile || null,
          mechanical_engineer_name: row.mechanical_engineer_name || null,
          mechanical_engineer_email: row.mechanical_engineer_email || null,
          site_supervisor_name: row.site_supervisor_name || null,
          site_supervisor_email: row.site_supervisor_email || null,
          created_at: row.created_at || null,
          sent_date: row.sent_date ? String(row.sent_date).slice(0, 10) : null,
          sent_time: row.sent_time || null,
          telemetry_date: row.telemetry_date || null,
          remarks: row.remarks || [],
          acknowledgements: row.acknowledgements || [],
          sms_dispatches: row.sms_dispatches || []
        };
      });
      
      res.json(mappedRows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Offline alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Offline alerts progress' });
  }
});

// Helper functions for Excel generation
function getAckDetails(acknowledgements: any) {
  if (!Array.isArray(acknowledgements) || acknowledgements.length === 0) {
    return { isAck: false, ackStatus: 'Pending', ackBy: '-', ackAt: '-' };
  }
  const ackItem = acknowledgements.find((a: any) => a.acknowledged_at);
  if (ackItem) {
    const ackDate = new Date(ackItem.acknowledged_at);
    const formattedDate = isNaN(ackDate.getTime())
      ? String(ackItem.acknowledged_at)
      : ackDate.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
    return {
      isAck: true,
      ackStatus: 'Acknowledged',
      ackBy: ackItem.engineer_name || ackItem.engineer_email || 'Engineer',
      ackAt: formattedDate,
    };
  }
  return { isAck: false, ackStatus: 'Pending', ackBy: '-', ackAt: '-' };
}

function getRemarkText(remarks: any) {
  if (!Array.isArray(remarks) || remarks.length === 0) return '-';
  const r = remarks[0];
  if (!r) return '-';
  return r.resolution_remark || r.reason || r.status || '-';
}

function formatContact(name?: string | null, email?: string | null, mobile?: string | null) {
  const parts: string[] = [];
  if (name && name.trim()) parts.push(name.trim());
  if (email && email.trim()) parts.push(`<${email.trim()}>`);
  if (mobile && mobile.trim()) parts.push(`(${mobile.trim()})`);
  return parts.length > 0 ? parts.join(' ') : '-';
}

function isValidEng(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const t = name.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  return !(
    t === '-' || t === '--' || t === '---' ||
    lower === 'n/a' || lower === 'na' || lower === 'none' || lower === 'null' ||
    lower.includes('vendor') || lower.includes('no engineer') || lower.includes('unassigned')
  );
}

function getSchemeOwnerDetails(row: any) {
  if (isValidEng(row.ee_civil_name)) {
    return { role: 'EE (Civil)', name: row.ee_civil_name.trim(), mobile: row.ee_civil_mobile?.trim() || '-' };
  }
  if (isValidEng(row.ee_mech_name)) {
    return { role: 'EE (Mech)', name: row.ee_mech_name.trim(), mobile: row.ee_mech_mobile?.trim() || '-' };
  }
  if (isValidEng(row.de_ae_civil_name)) {
    return { role: 'DE/AE (Civil)', name: row.de_ae_civil_name.trim(), mobile: row.de_ae_civil_mobile?.trim() || '-' };
  }
  if (isValidEng(row.de_ae_mech_name)) {
    return { role: 'DE/AE (Mech)', name: row.de_ae_mech_name.trim(), mobile: row.de_ae_mech_mobile?.trim() || '-' };
  }
  if (isValidEng(row.se_name)) {
    return { role: 'SE', name: row.se_name.trim(), mobile: row.se_mobile?.trim() || '-' };
  }
  if (isValidEng(row.chief_engineer_name)) {
    return { role: 'CE', name: row.chief_engineer_name.trim(), mobile: row.chief_engineer_mobile?.trim() || '-' };
  }
  return { role: 'Unassigned', name: '-', mobile: '-' };
}

function getSmsDetails(smsDispatches: any) {
  if (!Array.isArray(smsDispatches) || smsDispatches.length === 0) {
    return { status: 'Not Dispatched', time: '-' };
  }
  const total = smsDispatches.length;
  const successCount = smsDispatches.filter((s: any) => s.is_success).length;
  const latest = smsDispatches[0];
  const d = latest.created_at ? new Date(latest.created_at) : null;
  const timeStr = d && !isNaN(d.getTime())
    ? d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : latest.sent_date || '-';

  const statusStr = successCount === total
    ? `Dispatched (${successCount}/${total})`
    : successCount > 0
      ? `Partial (${successCount}/${total})`
      : `Failed (${total})`;

  return { status: statusStr, time: timeStr };
}

function getEmailDetails(row: any) {
  if (!row.created_at && !row.sent_date && !row.sent_time) {
    return { status: 'Not Sent', time: '-' };
  }
  let timeStr = '-';
  if (row.sent_time) {
    const parts = String(row.sent_time).split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      const datePart = row.sent_date ? String(row.sent_date).slice(0, 10) : '';
      timeStr = datePart ? `${datePart} ${String(h).padStart(2, '0')}:${m} ${ampm}` : `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    } else {
      timeStr = row.sent_time;
    }
  } else if (row.created_at) {
    const d = new Date(row.created_at);
    timeStr = !isNaN(d.getTime())
      ? d.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : (row.sent_date ? String(row.sent_date).slice(0, 10) : '-');
  } else if (row.sent_date) {
    timeStr = String(row.sent_date).slice(0, 10);
  }

  return { status: 'Sent', time: timeStr };
}

function styleSheet(sheet: any, titleText: string, columns: { header: string; key: string; width: number }[]) {
  // Title Row at row 1
  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = titleText;
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  // Header Row at row 2
  sheet.getRow(2).values = columns.map((c) => c.header);
  sheet.getRow(2).height = 24;
  sheet.getRow(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  sheet.getRow(2).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Set widths
  columns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width;
  });
}

function addSheetRow(sheet: any, values: any[], ackStatus: string, rowIdx: number, ackColIndex: number) {
  const row = sheet.addRow(values);
  row.height = 20;
  row.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
  const isEven = rowIdx % 2 === 0;
  const bgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

  row.eachCell((cell: any, colNumber: number) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    cell.alignment = { vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

    if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === ackColIndex) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  const ackCell = row.getCell(ackColIndex);
  if (ackStatus === 'Acknowledged') {
    ackCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    ackCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
  } else {
    ackCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    ackCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
  }
}

// Simple, comprehensive Excel report containing all necessary alert data
router.get(['/export-excel', '/download-14-day-report'], async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    const activeTab = ((req.query.tab as string) || 'lpcd').toLowerCase();

    const { dateFilter, queryParams } = getAlertDateFilter(requestedDate, subTab);

    const titleSuffix = requestedDate 
      ? `Date: ${requestedDate}` 
      : (subTab === 'previous' ? 'Previous Day (Yesterday)' : `Current (${new Date().toLocaleDateString('en-IN')})`);

    const client = await pool.connect();
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.default.Workbook();
      workbook.creator = 'MJP Alerts System';
      workbook.created = new Date();

      // Determine sheet build order (put activeTab first if specified)
      const tabKeys = ['lpcd', 'chlorine', 'pressure', 'offline'];
      const orderedTabs = tabKeys.includes(activeTab)
        ? [activeTab, ...tabKeys.filter(t => t !== activeTab)]
        : tabKeys;

      for (const tabKey of orderedTabs) {
        if (tabKey === 'lpcd') {
          const lpcdQuery = `
            WITH issues AS (
              SELECT scheme_id, 
                     json_agg(json_build_object(
                       'problem_level', problem_level,
                       'village_name', village_name,
                       'esr_name', esr_name,
                       'reason', reason,
                       'status', status,
                       'status_value', status_value,
                       'resolution_remark', resolution_remark,
                       'created_at', created_at,
                       'resolved_at', resolved_at,
                       'creator_name', creator_name
                     )) as remarks
              FROM issue_reports
              WHERE sensor_type = 'LPCD' OR sensor_type IS NULL OR status_value LIKE '%LPCD%' OR reason LIKE '%LPCD%'
              GROUP BY scheme_id
            ),
            recent_logs AS (
              SELECT DISTINCT ON (scheme_id, village_name, sent_date) 
                     scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
                     sent_time,
                     ee_civil_name, ee_civil_email,
                     ee_mech_name, ee_mech_email,
                     de_ae_civil_name, de_ae_civil_email,
                     de_ae_mech_name, de_ae_mech_email,
                     se_name, se_email,
                     chief_engineer_name, chief_engineer_email,
                     civil_engineer_name, civil_engineer_email,
                     mechanical_engineer_name, mechanical_engineer_email,
                     site_supervisor_name, site_supervisor_email,
                     created_at, sent_date
              FROM email_alert_logs
              WHERE alert_type IN ('LPCD', 'Low LPCD')
                AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY scheme_id, village_name, sent_date, created_at DESC
            ),
            ack_status AS (
              SELECT scheme_id,
                     sent_date,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'sent_date', sent_date::text,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       sent_date,
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type IN ('LPCD', 'Low LPCD')
                  AND ${dateFilter}
                GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id, sent_date
            ),
            deduped_sms AS (
              SELECT DISTINCT ON (id)
                     id, mobile, engineer_name, engineer_email, template_name, template_id,
                     message_text, gateway_status, is_success, sent_date, created_at, scheme_id,
                     dispatch_type, telemetry_date
              FROM sms_alert_logs
              WHERE (template_name ILIKE '%LPCD%' OR template_name IS NULL)
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY id, created_at DESC
            ),
            sms_status AS (
              SELECT scheme_id,
                     sent_date,
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
              GROUP BY scheme_id, sent_date
            )
            SELECT 
              COALESCE(e.scheme_id, w.scheme_id) as scheme_id, 
              COALESCE(e.scheme_name, w.scheme_name) as scheme_name, 
              COALESCE(e.region, w.region) as region,
              COALESCE(e.village_name, w.village_name) as village_name,
              COALESCE(e.alert_value, w.lpcd_value_day7::text, '0') as current_value,
              w.lpcd_value_day6 as previous_value,
              COALESCE(e.telemetry_date, w.lpcd_date_day7, TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
              COALESCE(e.alert_value, w.lpcd_value_day7::text, '0') as historical_value,
              COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
              COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
              sed.ee_civil_mobile,
              COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
              COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
              sed.ee_mech_mobile,
              COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
              COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
              sed.de_ae_civil_mobile,
              COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
              COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
              sed.de_ae_mech_mobile,
              COALESCE(e.se_name, sed.se_name) as se_name,
              COALESCE(e.se_email, sed.se_email) as se_email,
              sed.se_mobile,
              COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
              COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
              sed.chief_engineer_mobile,
              e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
              COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
            FROM recent_logs e
            LEFT JOIN water_scheme_data w ON (w.scheme_id = e.scheme_id AND (w.village_name = e.village_name OR (w.village_name IS NULL AND e.village_name IS NULL)))
            LEFT JOIN scheme_status s ON e.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (e.scheme_id = sed.scheme_id OR e.scheme_name ILIKE sed.scheme)
            LEFT JOIN issues i ON e.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON (e.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
            LEFT JOIN sms_status sms ON (e.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
            WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
            ORDER BY e.region, e.scheme_name, e.village_name
          `;
          const { rows } = await client.query(lpcdQuery, queryParams);
          const sheet = workbook.addWorksheet('Village LPCD Alerts');
          const cols = [
            { header: 'Sr No.', key: 'sr_no', width: 8 },
            { header: 'Scheme ID', key: 'scheme_id', width: 14 },
            { header: 'Scheme Name', key: 'scheme_name', width: 28 },
            { header: 'Region', key: 'region', width: 16 },
            { header: 'Village Name', key: 'village_name', width: 22 },
            { header: 'Current LPCD', key: 'current_value', width: 16 },
            { header: 'Previous Day LPCD', key: 'previous_value', width: 18 },
            { header: 'Scheme Owner', key: 'scheme_owner', width: 26 },
            { header: 'Owner Mobile', key: 'owner_mobile', width: 18 },
            { header: 'Email Sent', key: 'email_status', width: 18 },
            { header: 'Email Sent Time', key: 'email_time', width: 22 },
            { header: 'SMS Dispatched', key: 'sms_status', width: 22 },
            { header: 'SMS Sent Time', key: 'sms_time', width: 20 },
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
          ];
          styleSheet(sheet, `Village LPCD Alerts Summary (Villages < 55 LPCD) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const owner = getSchemeOwnerDetails(row);
            const email = getEmailDetails(row);
            const sms = getSmsDetails(row.sms_dispatches);
            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.current_value !== null ? row.current_value : '-',
              row.previous_value !== null ? row.previous_value : '-',
              owner.name !== '-' ? `${owner.name} (${owner.role})` : '-',
              owner.mobile || '-',
              email.status,
              email.time,
              sms.status,
              sms.time,
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.current_value_date || (row.sent_date ? String(row.sent_date).slice(0, 10) : '-'),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 14);
          });
        } else if (tabKey === 'chlorine') {
          const chlorineQuery = `
            WITH issues AS (
              SELECT scheme_id, 
                     json_agg(json_build_object(
                       'problem_level', problem_level,
                       'village_name', village_name,
                       'esr_name', esr_name,
                       'reason', reason,
                       'status', status,
                       'status_value', status_value,
                       'resolution_remark', resolution_remark,
                       'created_at', created_at,
                       'resolved_at', resolved_at,
                       'creator_name', creator_name
                     )) as remarks
              FROM issue_reports
              WHERE sensor_type = 'RCA' OR status_value LIKE '%Chlorine%' OR reason LIKE '%Chlorine%' OR reason LIKE '%RCA%'
              GROUP BY scheme_id
            ),
            recent_logs AS (
              SELECT DISTINCT ON (scheme_id, esr_name, sent_date) 
                     scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
                     sent_time,
                     ee_civil_name, ee_civil_email,
                     ee_mech_name, ee_mech_email,
                     de_ae_civil_name, de_ae_civil_email,
                     de_ae_mech_name, de_ae_mech_email,
                     se_name, se_email,
                     chief_engineer_name, chief_engineer_email,
                     civil_engineer_name, civil_engineer_email,
                     mechanical_engineer_name, mechanical_engineer_email,
                     site_supervisor_name, site_supervisor_email,
                     created_at, sent_date
              FROM email_alert_logs
              WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine', 'RCA')
                AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY scheme_id, esr_name, sent_date, created_at DESC
            ),
            ack_status AS (
              SELECT scheme_id,
                     sent_date,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'sent_date', sent_date::text,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       sent_date,
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'RCA')
                  AND ${dateFilter}
                GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id, sent_date
            ),
            deduped_sms AS (
              SELECT DISTINCT ON (id)
                     id, mobile, engineer_name, engineer_email, template_name, template_id,
                     message_text, gateway_status, is_success, sent_date, created_at, scheme_id,
                     dispatch_type, telemetry_date
              FROM sms_alert_logs
              WHERE (template_name ILIKE '%Chlorine%' AND template_name NOT ILIKE '%Offline%')
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY id, created_at DESC
            ),
            sms_status AS (
              SELECT scheme_id,
                     sent_date,
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
              GROUP BY scheme_id, sent_date
            )
            SELECT 
              COALESCE(e.scheme_id, c.scheme_id) as scheme_id, 
              COALESCE(e.scheme_name, c.scheme_name) as scheme_name, 
              COALESCE(e.region, c.region) as region,
              COALESCE(e.village_name, c.village_name) as village_name,
              COALESCE(e.esr_name, c.esr_name) as esr_name,
              COALESCE(e.alert_value, c.chlorine_value_7::text, '0') as current_value,
              c.chlorine_value_6 as previous_value,
              COALESCE(e.telemetry_date, c.chlorine_date_day_7, TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
              COALESCE(e.alert_value, c.chlorine_value_7::text, '0') as historical_value,
              COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
              COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
              sed.ee_civil_mobile,
              COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
              COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
              sed.ee_mech_mobile,
              COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
              COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
              sed.de_ae_civil_mobile,
              COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
              COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
              sed.de_ae_mech_mobile,
              COALESCE(e.se_name, sed.se_name) as se_name,
              COALESCE(e.se_email, sed.se_email) as se_email,
              sed.se_mobile,
              COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
              COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
              sed.chief_engineer_mobile,
              e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
              COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
            FROM recent_logs e
            LEFT JOIN chlorine_data c ON (c.scheme_id = e.scheme_id AND (c.esr_name = e.esr_name OR (c.esr_name IS NULL AND e.esr_name IS NULL)))
            LEFT JOIN scheme_status s ON e.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (e.scheme_id = sed.scheme_id OR e.scheme_name ILIKE sed.scheme)
            LEFT JOIN issues i ON e.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON (e.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
            LEFT JOIN sms_status sms ON (e.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
            WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
            ORDER BY e.region, e.scheme_name, e.village_name, e.esr_name
          `;
          const { rows } = await client.query(chlorineQuery, queryParams);
          const sheet = workbook.addWorksheet('Chlorine Sensor Alerts');
          const cols = [
            { header: 'Sr No.', key: 'sr_no', width: 8 },
            { header: 'Scheme ID', key: 'scheme_id', width: 14 },
            { header: 'Scheme Name', key: 'scheme_name', width: 28 },
            { header: 'Region', key: 'region', width: 16 },
            { header: 'Village Name', key: 'village_name', width: 22 },
            { header: 'ESR Name / Sensor Location', key: 'esr_name', width: 24 },
            { header: 'Current Chlorine (mg/L)', key: 'current_value', width: 22 },
            { header: 'Previous Day (mg/L)', key: 'previous_value', width: 20 },
            { header: 'Scheme Owner', key: 'scheme_owner', width: 26 },
            { header: 'Owner Mobile', key: 'owner_mobile', width: 18 },
            { header: 'Email Sent', key: 'email_status', width: 18 },
            { header: 'Email Sent Time', key: 'email_time', width: 22 },
            { header: 'SMS Dispatched', key: 'sms_status', width: 22 },
            { header: 'SMS Sent Time', key: 'sms_time', width: 20 },
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
          ];
          styleSheet(sheet, `Chlorine Sensor Alerts Summary (Sensors outside 0.20-0.50 mg/L) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const owner = getSchemeOwnerDetails(row);
            const email = getEmailDetails(row);
            const sms = getSmsDetails(row.sms_dispatches);
            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.esr_name || '-',
              row.current_value !== null ? row.current_value : '-',
              row.previous_value !== null ? row.previous_value : '-',
              owner.name !== '-' ? `${owner.name} (${owner.role})` : '-',
              owner.mobile || '-',
              email.status,
              email.time,
              sms.status,
              sms.time,
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.current_value_date || (row.sent_date ? String(row.sent_date).slice(0, 10) : '-'),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 15);
          });
        } else if (tabKey === 'pressure') {
          const pressureQuery = `
            WITH issues AS (
              SELECT scheme_id, 
                     json_agg(json_build_object(
                       'problem_level', problem_level,
                       'village_name', village_name,
                       'esr_name', esr_name,
                       'reason', reason,
                       'status', status,
                       'status_value', status_value,
                       'resolution_remark', resolution_remark,
                       'created_at', created_at,
                       'resolved_at', resolved_at,
                       'creator_name', creator_name
                     )) as remarks
              FROM issue_reports
              WHERE sensor_type = 'PT' OR status_value LIKE '%Pressure%' OR reason LIKE '%Pressure%' OR reason LIKE '%PT%'
              GROUP BY scheme_id
            ),
            recent_logs AS (
              SELECT DISTINCT ON (scheme_id, esr_name, sent_date) 
                     scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
                     sent_time,
                     ee_civil_name, ee_civil_email,
                     ee_mech_name, ee_mech_email,
                     de_ae_civil_name, de_ae_civil_email,
                     de_ae_mech_name, de_ae_mech_email,
                     se_name, se_email,
                     chief_engineer_name, chief_engineer_email,
                     civil_engineer_name, civil_engineer_email,
                     mechanical_engineer_name, mechanical_engineer_email,
                     site_supervisor_name, site_supervisor_email,
                     created_at, sent_date
              FROM email_alert_logs
              WHERE alert_type IN ('Pressure', 'Low Pressure')
                AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY scheme_id, esr_name, sent_date, created_at DESC
            ),
            ack_status AS (
              SELECT scheme_id,
                     sent_date,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'sent_date', sent_date::text,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       sent_date,
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type IN ('Pressure', 'Low Pressure')
                  AND ${dateFilter}
                GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id, sent_date
            ),
            deduped_sms AS (
              SELECT DISTINCT ON (id)
                     id, mobile, engineer_name, engineer_email, template_name, template_id,
                     message_text, gateway_status, is_success, sent_date, created_at, scheme_id,
                     dispatch_type, telemetry_date
              FROM sms_alert_logs
              WHERE (template_name ILIKE '%Pressure%' AND template_name NOT ILIKE '%Offline%')
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY id, created_at DESC
            ),
            sms_status AS (
              SELECT scheme_id,
                     sent_date,
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
              GROUP BY scheme_id, sent_date
            )
            SELECT 
              COALESCE(e.scheme_id, p.scheme_id) as scheme_id, 
              COALESCE(e.scheme_name, p.scheme_name) as scheme_name, 
              COALESCE(e.region, p.region) as region,
              COALESCE(e.village_name, p.village_name) as village_name,
              COALESCE(e.esr_name, p.esr_name) as esr_name,
              COALESCE(e.alert_value, p.pressure_value_7::text, '0') as current_value,
              p.pressure_value_6 as previous_value,
              COALESCE(e.telemetry_date, p.pressure_date_day_7, TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
              COALESCE(e.alert_value, p.pressure_value_7::text, '0') as historical_value,
              COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
              COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
              sed.ee_civil_mobile,
              COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
              COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
              sed.ee_mech_mobile,
              COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
              COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
              sed.de_ae_civil_mobile,
              COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
              COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
              sed.de_ae_mech_mobile,
              COALESCE(e.se_name, sed.se_name) as se_name,
              COALESCE(e.se_email, sed.se_email) as se_email,
              sed.se_mobile,
              COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
              COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
              sed.chief_engineer_mobile,
              e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
              COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
            FROM recent_logs e
            LEFT JOIN pressure_data p ON (p.scheme_id = e.scheme_id AND (p.esr_name = e.esr_name OR (p.esr_name IS NULL AND e.esr_name IS NULL)))
            LEFT JOIN scheme_status s ON e.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (p.scheme_id = sed.scheme_id OR p.scheme_name ILIKE sed.scheme)
            LEFT JOIN issues i ON p.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON (p.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
            LEFT JOIN sms_status sms ON (p.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
            WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
            ORDER BY e.region, e.scheme_name, e.village_name, e.esr_name
          `;
          const { rows } = await client.query(pressureQuery, queryParams);
          const sheet = workbook.addWorksheet('Pressure Sensor Alerts');
          const cols = [
            { header: 'Sr No.', key: 'sr_no', width: 8 },
            { header: 'Scheme ID', key: 'scheme_id', width: 14 },
            { header: 'Scheme Name', key: 'scheme_name', width: 28 },
            { header: 'Region', key: 'region', width: 16 },
            { header: 'Village Name', key: 'village_name', width: 22 },
            { header: 'ESR Name / Sensor Location', key: 'esr_name', width: 24 },
            { header: 'Current Pressure (bar)', key: 'current_value', width: 22 },
            { header: 'Previous Day (bar)', key: 'previous_value', width: 20 },
            { header: 'Scheme Owner', key: 'scheme_owner', width: 26 },
            { header: 'Owner Mobile', key: 'owner_mobile', width: 18 },
            { header: 'Email Sent', key: 'email_status', width: 18 },
            { header: 'Email Sent Time', key: 'email_time', width: 22 },
            { header: 'SMS Dispatched', key: 'sms_status', width: 22 },
            { header: 'SMS Sent Time', key: 'sms_time', width: 20 },
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
          ];
          styleSheet(sheet, `Pressure Sensor Alerts Summary (Sensors outside 0.20-0.70 Bar) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const owner = getSchemeOwnerDetails(row);
            const email = getEmailDetails(row);
            const sms = getSmsDetails(row.sms_dispatches);
            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.esr_name || '-',
              row.current_value !== null ? row.current_value : '-',
              row.previous_value !== null ? row.previous_value : '-',
              owner.name !== '-' ? `${owner.name} (${owner.role})` : '-',
              owner.mobile || '-',
              email.status,
              email.time,
              sms.status,
              sms.time,
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.current_value_date || (row.sent_date ? String(row.sent_date).slice(0, 10) : '-'),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 15);
          });
        } else if (tabKey === 'offline') {
          const offlineQuery = `
            WITH issues AS (
              SELECT scheme_id, 
                     json_agg(json_build_object(
                       'problem_level', problem_level,
                       'village_name', village_name,
                       'esr_name', esr_name,
                       'reason', reason,
                       'status', status,
                       'status_value', status_value,
                       'resolution_remark', resolution_remark,
                       'created_at', created_at,
                       'resolved_at', resolved_at,
                       'creator_name', creator_name
                     )) as remarks
              FROM issue_reports
              WHERE sensor_type = 'Offline' OR status_value LIKE '%Offline%' OR reason LIKE '%Offline%'
              GROUP BY scheme_id
            ),
            ack_status AS (
              SELECT scheme_id,
                     sent_date,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'sent_date', sent_date::text,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       sent_date,
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type = 'Offline'
                GROUP BY scheme_id, sent_date, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id, sent_date
            ),
            recent_logs AS (
              SELECT DISTINCT ON (scheme_id, COALESCE(esr_name, ''), COALESCE(village_name, ''), sent_date)
                     scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, created_at, sent_date,
                     sent_time, telemetry_date,
                     ee_civil_name, ee_civil_email,
                     ee_mech_name, ee_mech_email,
                     de_ae_civil_name, de_ae_civil_email,
                     de_ae_mech_name, de_ae_mech_email,
                     se_name, se_email,
                     chief_engineer_name, chief_engineer_email,
                     civil_engineer_name, civil_engineer_email,
                     mechanical_engineer_name, mechanical_engineer_email,
                     site_supervisor_name, site_supervisor_email
              FROM email_alert_logs
              WHERE alert_type ILIKE '%Offline%'
                AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY scheme_id, COALESCE(esr_name, ''), COALESCE(village_name, ''), sent_date, created_at DESC
            ),
            deduped_sms AS (
              SELECT DISTINCT ON (id)
                     id, mobile, engineer_name, engineer_email, template_name, template_id,
                     message_text, gateway_status, is_success, sent_date, created_at, scheme_id,
                     dispatch_type, telemetry_date
              FROM sms_alert_logs
              WHERE (template_name ILIKE '%Offline%' OR template_name IS NULL)
                AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
                AND ${dateFilter}
              ORDER BY id, created_at DESC
            ),
            sms_status AS (
              SELECT scheme_id,
                     sent_date,
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
              GROUP BY scheme_id, sent_date
            )
            SELECT 
              COALESCE(e.scheme_id, c.scheme_id) as scheme_id,
              COALESCE(e.scheme_name, c.scheme_name) as scheme_name,
              COALESCE(e.region, c.region) as region,
              COALESCE(e.village_name, c.village_name) as village_name,
              COALESCE(e.esr_name, c.esr_name) as esr_name,
              c.chlorine_status,
              c.pressure_status,
              c.flow_meter_status,
              c.last_seen,
              COALESCE(e.telemetry_date, TO_CHAR(c.last_seen, 'YYYY-MM-DD HH24:MI'), TO_CHAR(c.pressure_last_seen, 'YYYY-MM-DD HH24:MI'), TO_CHAR(e.sent_date, 'YYYY-MM-DD')) as current_value_date,
              COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
              COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
              sed.ee_civil_mobile,
              COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
              COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
              sed.ee_mech_mobile,
              COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
              COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
              sed.de_ae_civil_mobile,
              COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
              COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
              sed.de_ae_mech_mobile,
              COALESCE(e.se_name, sed.se_name) as se_name,
              COALESCE(e.se_email, sed.se_email) as se_email,
              sed.se_mobile,
              COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
              COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
              sed.chief_engineer_mobile,
              v.employee_name as vendor_name,
              v.email as vendor_email,
              v.phone as vendor_phone,
              e.created_at, TO_CHAR(e.sent_date, 'YYYY-MM-DD') as sent_date, e.sent_time, e.ticket_id, e.telemetry_date,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements,
              COALESCE(sms.sms_dispatches, '[]'::json) as sms_dispatches
            FROM recent_logs e
            LEFT JOIN communication_status c ON c.scheme_id = e.scheme_id
            LEFT JOIN scheme_status s ON e.scheme_id = s.scheme_id
            LEFT JOIN sms_status sms ON (c.scheme_id = sms.scheme_id AND e.sent_date::date = sms.sent_date::date)
            LEFT JOIN scheme_engineer_details sed ON (c.scheme_id = sed.scheme_id OR c.scheme_name ILIKE sed.scheme)
            LEFT JOIN (
              SELECT DISTINCT ON (region) region, employee_name, email, phone
              FROM vendor
              ORDER BY region, id
            ) v ON c.region = v.region
            LEFT JOIN issues i ON c.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON (c.scheme_id = a.scheme_id AND e.sent_date::date = a.sent_date::date)
            WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
            ORDER BY e.region, e.scheme_name, e.village_name;
          `;
          const { rows } = await client.query(offlineQuery, queryParams);
          const sheet = workbook.addWorksheet('Offline Sensor Alerts');
          const cols = [
            { header: 'Sr No.', key: 'sr_no', width: 8 },
            { header: 'Scheme ID', key: 'scheme_id', width: 14 },
            { header: 'Scheme Name', key: 'scheme_name', width: 28 },
            { header: 'Region', key: 'region', width: 16 },
            { header: 'Village Name', key: 'village_name', width: 22 },
            { header: 'ESR Name', key: 'esr_name', width: 22 },
            { header: 'Offline Devices', key: 'offline_devices', width: 24 },
            { header: 'Chlorine Status', key: 'chlorine_status', width: 16 },
            { header: 'Pressure Status', key: 'pressure_status', width: 16 },
            { header: 'Flow Meter Status', key: 'flow_status', width: 16 },
            { header: 'Last Seen', key: 'last_seen', width: 22 },
            { header: 'Scheme Owner', key: 'scheme_owner', width: 26 },
            { header: 'Owner Mobile', key: 'owner_mobile', width: 18 },
            { header: 'Email Sent', key: 'email_status', width: 18 },
            { header: 'Email Sent Time', key: 'email_time', width: 22 },
            { header: 'SMS Dispatched', key: 'sms_status', width: 22 },
            { header: 'SMS Sent Time', key: 'sms_time', width: 20 },
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
            { header: 'Assigned Vendor / Agency', key: 'vendor', width: 32 },
          ];
          styleSheet(sheet, `Offline Sensor Alerts Summary (Communication Blackout) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const offlineList: string[] = [];
            if (row.chlorine_status === 'Offline') offlineList.push('Chlorine');
            if (row.pressure_status === 'Offline') offlineList.push('Pressure');
            if (row.flow_meter_status === 'Offline') offlineList.push('Flow Meter');

            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const owner = getSchemeOwnerDetails(row);
            const email = getEmailDetails(row);
            const sms = getSmsDetails(row.sms_dispatches);

            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.esr_name || '-',
              offlineList.join(', ') || 'Offline',
              row.chlorine_status || 'Online',
              row.pressure_status || 'Online',
              row.flow_meter_status || 'Online',
              row.last_seen ? new Date(row.last_seen).toLocaleString('en-IN') : '-',
              owner.name !== '-' ? `${owner.name} (${owner.role})` : '-',
              owner.mobile || '-',
              email.status,
              email.time,
              sms.status,
              sms.time,
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.current_value_date || (row.sent_date ? String(row.sent_date).slice(0, 10) : '-'),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
              formatContact(row.vendor_name, row.vendor_email, row.vendor_phone),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 18);
          });
        }
      }

      const filenameDate = requestedDate || (subTab === 'previous' ? 'Yesterday' : new Date().toISOString().slice(0, 10));
      const cleanFilename = `Alerts_Report_${filenameDate}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/alerts-progress/export-total-engineers
 * Exports official Excel sheet of all registered engineers and personnel across schemes
 */
router.get('/export-total-engineers', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const sedRes = await client.query('SELECT * FROM scheme_engineer_details');

      const map = new Map<string, {
        name: string;
        role: string;
        email: string;
        mobile: string;
        scheme?: string;
        scheme_id?: string;
        region?: string;
        district?: string;
        division?: string;
      }>();

      sedRes.rows.forEach(s => {
        const roles = [
          { n: s.chief_engineer_name, e: s.chief_engineer_email, m: s.chief_engineer_mobile, r: 'Chief Engineer (CE)' },
          { n: s.se_name, e: s.se_email, m: s.se_mobile, r: 'Superintending Engineer (SE)' },
          { n: s.ee_civil_name, e: s.ee_civil_email, m: s.ee_civil_mobile, r: 'Executive Engineer (Civil)' },
          { n: s.ee_mech_name, e: s.ee_mech_email, m: s.ee_mech_mobile, r: 'Executive Engineer (Mech)' },
          { n: s.de_ae_civil_name, e: s.de_ae_civil_email, m: s.de_ae_civil_mobile, r: 'Deputy / Assistant Engineer (Civil)' },
          { n: s.de_ae_mech_name, e: s.de_ae_mech_email, m: s.de_ae_mech_mobile, r: 'Deputy / Assistant Engineer (Mech)' }
        ];

        roles.forEach(item => {
          if (!item.n || !item.n.trim()) return;
          const cleanName = item.n.trim();
          const lowerName = cleanName.toLowerCase();
          if (
            cleanName === '-' ||
            cleanName === '--' ||
            lowerName.includes('no engineer') ||
            lowerName.includes('vendor') ||
            lowerName === 'n/a' ||
            lowerName === 'na' ||
            lowerName === 'null' ||
            lowerName === 'none'
          ) {
            return;
          }

          const k = `${lowerName}_${item.r.toLowerCase()}`;
          if (!map.has(k)) {
            map.set(k, {
              name: cleanName,
              role: item.r,
              email: item.e?.trim() || '-',
              mobile: item.m?.trim() || '-',
              scheme: s.scheme || s.scheme_name || '-',
              scheme_id: s.scheme_id || '-',
              region: s.region?.replace(/[\uFEFF]/g, '').trim() || '-',
              district: s.district || '-',
              division: s.division || '-'
            });
          }
        });
      });

      const engineers = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MJP Water Supply Telemetry System';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Scheme Engineers Directory');
      const cols = [
        { header: 'Sr No.', key: 'sr_no', width: 8 },
        { header: 'Engineer Name', key: 'name', width: 28 },
        { header: 'Designation / Role', key: 'role', width: 32 },
        { header: 'Mobile Number', key: 'mobile', width: 18 },
        { header: 'Email Address', key: 'email', width: 32 },
        { header: 'Region', key: 'region', width: 20 },
        { header: 'District', key: 'district', width: 18 },
        { header: 'Assigned Scheme', key: 'scheme', width: 34 },
        { header: 'Scheme ID', key: 'scheme_id', width: 14 }
      ];

      styleSheet(sheet, `MJP Maharashtra - Total Scheme Engineers Directory (${engineers.length} Engineers)`, cols);

      engineers.forEach((eng, idx) => {
        const values = [
          idx + 1,
          eng.name,
          eng.role,
          eng.mobile,
          eng.email,
          eng.region || 'All Maharashtra',
          eng.district || '-',
          eng.scheme || '-',
          eng.scheme_id || '-'
        ];
        const row = sheet.addRow(values);
        row.height = 20;
        row.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        const bgColor = idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          cell.alignment = { vertical: 'middle' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          if (colNumber === 1 || colNumber === 4 || colNumber === 9) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const filename = `MJP_Total_Scheme_Engineers_Directory_${todayStr}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating total engineers report:', error);
    res.status(500).json({ error: 'Failed to generate total engineers report' });
  }
});

// Private admin-only endpoint to check email delivery failure audit logs
router.get('/email-failures', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id,
          recipient_email,
          engineer_name,
          scheme_id,
          scheme_name,
          alert_count,
          alert_summary,
          error_message,
          attempted_at
        FROM email_delivery_failures
        ORDER BY attempted_at DESC
        LIMIT 100
      `);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching email failures audit:', error);
    res.status(500).json({ error: 'Failed to fetch email failures audit' });
  }
});

// Endpoint to fetch all Daily Email and SMS Alert Dispatches (strictly excluding Real-Time alerts)
router.get('/daily-dispatches', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    const { dateFilter, queryParams } = getAlertDateFilter(requestedDate, subTab);

    const client = await pool.connect();
    try {
      // 1. Fetch Daily Email Alert Dispatches (strictly exclude Real-Time alerts)
      const emailsQuery = `
        SELECT 
          id, scheme_id, scheme_name, region, village_name, esr_name, 
          alert_type, alert_value, ticket_id, sent_time, telemetry_date, created_at,
          TO_CHAR(sent_date, 'YYYY-MM-DD') as sent_date,
          ee_civil_name, ee_civil_email,
          ee_mech_name, ee_mech_email,
          de_ae_civil_name, de_ae_civil_email,
          de_ae_mech_name, de_ae_mech_email,
          se_name, se_email,
          chief_engineer_name, chief_engineer_email
        FROM email_alert_logs
        WHERE (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
          AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
          AND ${dateFilter}
        ORDER BY created_at DESC
      `;
      const emailsResult = await client.query(emailsQuery, queryParams);

      // 2. Fetch Daily SMS Alert Dispatches (strictly exclude Real-Time templates)
      const smsQuery = `
        SELECT 
          id, mobile, engineer_name, engineer_email, scheme_id, scheme_name,
          template_id, template_name, message_text, gateway_status, gateway_response,
          is_success, telemetry_date, created_at,
          TO_CHAR(sent_date, 'YYYY-MM-DD') as sent_date
        FROM sms_alert_logs
        WHERE template_name NOT IN (
          'Residual Chlorine Sensor Offline', 
          'Residual Chlorine – Low', 
          'Flow Meter Sensor Offline', 
          'Pressure Sensor Offline'
        )
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND ${dateFilter}
        ORDER BY created_at DESC
      `;
      const smsResult = await client.query(smsQuery, queryParams);

      const emails = emailsResult.rows;
      const sms = smsResult.rows;

      const uniqueEmailSchemes = new Set(emails.map(e => e.scheme_id)).size;
      const uniqueSmsSchemes = new Set(sms.map(s => s.scheme_id)).size;
      const allUniqueSchemes = new Set([...emails.map(e => e.scheme_id), ...sms.map(s => s.scheme_id)]).size;

      res.json({
        summary: {
          totalEmails: emails.length,
          actualEmailsSent: uniqueEmailSchemes, // 1 consolidated email per scheme
          totalSms: sms.length,
          totalDispatches: emails.length + sms.length,
          schemesCount: allUniqueSchemes,
          emailSchemesCount: uniqueEmailSchemes,
          smsSchemesCount: uniqueSmsSchemes
        },
        emails,
        sms
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching daily alert dispatches:', error);
    res.status(500).json({ error: 'Failed to fetch daily alert dispatches' });
  }
});

export default router;


