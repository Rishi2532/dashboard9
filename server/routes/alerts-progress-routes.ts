import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Restrict all alerts-progress endpoints to administrators only
router.use((req: any, res: any, next: any) => {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ error: 'Access restricted to administrators only' });
  }
  next();
});

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
          SELECT chief_engineer_name as name FROM scheme_engineer_details WHERE chief_engineer_name IS NOT NULL AND TRIM(chief_engineer_name) != ''
          UNION
          SELECT se_name as name FROM scheme_engineer_details WHERE se_name IS NOT NULL AND TRIM(se_name) != ''
          UNION
          SELECT ee_civil_name as name FROM scheme_engineer_details WHERE ee_civil_name IS NOT NULL AND TRIM(ee_civil_name) != ''
          UNION
          SELECT ee_mech_name as name FROM scheme_engineer_details WHERE ee_mech_name IS NOT NULL AND TRIM(ee_mech_name) != ''
          UNION
          SELECT de_ae_civil_name as name FROM scheme_engineer_details WHERE de_ae_civil_name IS NOT NULL AND TRIM(de_ae_civil_name) != ''
          UNION
          SELECT de_ae_mech_name as name FROM scheme_engineer_details WHERE de_ae_mech_name IS NOT NULL AND TRIM(de_ae_mech_name) != ''
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
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

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
                 scheme_id, village_name, ticket_id, alert_value, 
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
            AND ${dateFilter}
          ORDER BY scheme_id, village_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type IN ('LPCD', 'Low LPCD')
              AND ${dateFilter}
            GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id
        )
        SELECT 
          w.scheme_id, 
          w.scheme_name, 
          w.region,
          w.village_name,
          w.lpcd_value_day7 as current_value,
          w.lpcd_value_day6 as previous_value,
          e.alert_value as historical_value,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as civil_engineer_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, e.sent_date, e.ticket_id,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM water_scheme_data w
        JOIN recent_logs e ON w.scheme_id = e.scheme_id AND w.village_name IS NOT DISTINCT FROM e.village_name
        JOIN scheme_status s ON w.scheme_id = s.scheme_id
        LEFT JOIN scheme_engineer_details sed ON (w.scheme_id = sed.scheme_id OR w.scheme_name ILIKE sed.scheme)
        LEFT JOIN issues i ON w.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON w.scheme_id = a.scheme_id
        WHERE s.water_supply = 'Yes'
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
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

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
                 scheme_id, esr_name, ticket_id, alert_value, 
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
            AND ${dateFilter}
          ORDER BY scheme_id, esr_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')
              AND ${dateFilter}
            GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id
        )
        SELECT 
          c.scheme_id, 
          c.scheme_name, 
          c.region,
          c.village_name,
          c.esr_name,
          c.chlorine_value_7 as current_value,
          c.chlorine_value_6 as previous_value,
          e.alert_value as historical_value,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as civil_engineer_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, e.sent_date, e.ticket_id,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM chlorine_data c
        JOIN recent_logs e ON c.scheme_id = e.scheme_id AND c.esr_name IS NOT DISTINCT FROM e.esr_name
        JOIN scheme_status s ON c.scheme_id = s.scheme_id
        LEFT JOIN scheme_engineer_details sed ON (c.scheme_id = sed.scheme_id OR c.scheme_name ILIKE sed.scheme)
        LEFT JOIN issues i ON c.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON c.scheme_id = a.scheme_id
        WHERE s.water_supply = 'Yes'
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
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

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
                 scheme_id, esr_name, ticket_id, alert_value, 
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
            AND ${dateFilter}
          ORDER BY scheme_id, esr_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type IN ('Pressure', 'Low Pressure')
              AND ${dateFilter}
            GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id
        )
        SELECT 
          p.scheme_id, 
          p.scheme_name, 
          p.region,
          p.village_name,
          p.esr_name,
          p.pressure_value_7 as current_value,
          p.pressure_value_6 as previous_value,
          e.alert_value as historical_value,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as ee_civil_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as ee_civil_email,
          COALESCE(e.ee_mech_name, sed.ee_mech_name) as ee_mech_name,
          COALESCE(e.ee_mech_email, sed.ee_mech_email) as ee_mech_email,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as de_ae_civil_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as de_ae_civil_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name, e.site_supervisor_name) as de_ae_mech_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email, e.site_supervisor_email) as de_ae_mech_email,
          COALESCE(e.se_name, sed.se_name) as se_name,
          COALESCE(e.se_email, sed.se_email) as se_email,
          COALESCE(e.chief_engineer_name, sed.chief_engineer_name) as chief_engineer_name,
          COALESCE(e.chief_engineer_email, sed.chief_engineer_email) as chief_engineer_email,
          COALESCE(e.de_ae_civil_name, sed.de_ae_civil_name, e.civil_engineer_name) as civil_engineer_name,
          COALESCE(e.de_ae_civil_email, sed.de_ae_civil_email, e.civil_engineer_email) as civil_engineer_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.mechanical_engineer_name) as mechanical_engineer_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.mechanical_engineer_email) as mechanical_engineer_email,
          COALESCE(e.de_ae_mech_name, sed.de_ae_mech_name, e.site_supervisor_name) as site_supervisor_name,
          COALESCE(e.de_ae_mech_email, sed.de_ae_mech_email, e.site_supervisor_email) as site_supervisor_email,
          e.created_at, e.sent_date, e.ticket_id,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM pressure_data p
        JOIN recent_logs e ON p.scheme_id = e.scheme_id AND p.esr_name IS NOT DISTINCT FROM e.esr_name
        JOIN scheme_status s ON p.scheme_id = s.scheme_id
        LEFT JOIN scheme_engineer_details sed ON (p.scheme_id = sed.scheme_id OR p.scheme_name ILIKE sed.scheme)
        LEFT JOIN issues i ON p.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON p.scheme_id = a.scheme_id
        WHERE s.water_supply = 'Yes'
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
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

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
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', max_ack
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, 
                   LOWER(TRIM(engineer_email)) as engineer_email, 
                   MAX(engineer_name) as engineer_name, 
                   MAX(acknowledged_at) as max_ack
            FROM email_acknowledgements
            WHERE alert_type = 'Offline'
              AND ${dateFilter}
            GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
          ) sub
          GROUP BY scheme_id
        )
        SELECT 
          c.id,
          c.scheme_id,
          c.scheme_name,
          c.region,
          c.village_name,
          c.esr_name,
          c.chlorine_status,
          c.pressure_status,
          c.flow_meter_status,
          c.chlorine_connected,
          c.pressure_connected,
          c.flow_meter_connected,
          c.last_seen,
          c.pressure_last_seen,
          sed.ee_civil_name,
          sed.ee_civil_email,
          sed.ee_civil_mobile,
          sed.ee_mech_name,
          sed.ee_mech_email,
          sed.ee_mech_mobile,
          sed.de_ae_civil_name,
          sed.de_ae_civil_email,
          sed.de_ae_civil_mobile,
          sed.de_ae_mech_name,
          sed.de_ae_mech_email,
          sed.de_ae_mech_mobile,
          sed.se_name,
          sed.se_email,
          sed.se_mobile,
          sed.chief_engineer_name,
          sed.chief_engineer_email,
          sed.chief_engineer_mobile,
          v.employee_name as vendor_name,
          v.email as vendor_email,
          v.phone as vendor_phone,
          COALESCE(sed.de_ae_civil_name, v.employee_name) as civil_engineer_name,
          COALESCE(sed.de_ae_civil_email, v.email) as civil_engineer_email,
          COALESCE(sed.de_ae_civil_mobile, v.phone) as civil_engineer_mobile,
          sed.de_ae_mech_name as mechanical_engineer_name,
          sed.de_ae_mech_email as mechanical_engineer_email,
          sed.de_ae_mech_name as site_supervisor_name,
          sed.de_ae_mech_email as site_supervisor_email,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM communication_status c
        INNER JOIN scheme_status s ON c.scheme_id = s.scheme_id
        LEFT JOIN scheme_engineer_details sed ON (c.scheme_id = sed.scheme_id OR c.scheme_name ILIKE sed.scheme)
        LEFT JOIN (
          SELECT DISTINCT ON (region) region, employee_name, email, phone
          FROM vendor
          ORDER BY region, id
        ) v ON c.region = v.region
        LEFT JOIN issues i ON c.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON c.scheme_id = a.scheme_id
        WHERE (c.chlorine_status = 'Offline' 
           OR c.pressure_status = 'Offline' 
           OR c.flow_meter_status = 'Offline')
          AND s.water_supply = 'Yes'
        ORDER BY c.region, c.scheme_name, c.village_name;
      `;
      const result = await client.query(query, queryParams);
      
      const mappedRows = result.rows.map((row: any) => {
        const offlineList: string[] = [];
        if (row.chlorine_status === 'Offline') offlineList.push('Chlorine');
        if (row.pressure_status === 'Offline') offlineList.push('Pressure');
        if (row.flow_meter_status === 'Offline') offlineList.push('Flow Meter');
        
        return {
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          region: row.region,
          village_name: row.village_name,
          esr_name: row.esr_name,
          current_value: offlineList.join(', '),
          previous_value: null,
          historical_value: null,
          ee_civil_name: row.ee_civil_name || null,
          ee_civil_email: row.ee_civil_email || null,
          ee_mech_name: row.ee_mech_name || null,
          ee_mech_email: row.ee_mech_email || null,
          de_ae_civil_name: row.de_ae_civil_name || null,
          de_ae_civil_email: row.de_ae_civil_email || null,
          de_ae_mech_name: row.de_ae_mech_name || null,
          de_ae_mech_email: row.de_ae_mech_email || null,
          se_name: row.se_name || null,
          se_email: row.se_email || null,
          chief_engineer_name: row.chief_engineer_name || null,
          chief_engineer_email: row.chief_engineer_email || null,
          vendor_name: row.vendor_name || null,
          vendor_email: row.vendor_email || null,
          civil_engineer_name: row.civil_engineer_name || 'No Engineer/Vendor Assigned',
          civil_engineer_email: row.civil_engineer_email || null,
          civil_engineer_mobile: row.civil_engineer_mobile || null,
          mechanical_engineer_name: row.mechanical_engineer_name || null,
          mechanical_engineer_email: row.mechanical_engineer_email || null,
          site_supervisor_name: row.site_supervisor_name || null,
          site_supervisor_email: row.site_supervisor_email || null,
          created_at: new Date().toISOString(),
          remarks: row.remarks || [],
          acknowledgements: row.acknowledgements || []
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

    let dateFilter = `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    let queryParams: any[] = [];

    if (requestedDate) {
      dateFilter = `sent_date = $1::date`;
      queryParams = [requestedDate];
    } else if (subTab === 'current') {
      dateFilter = `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    } else if (subTab === 'previous') {
      dateFilter = `sent_date = CURRENT_DATE - INTERVAL '1 day'`;
    }

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
                     scheme_id, village_name, ticket_id, alert_value, 
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
                AND ${dateFilter}
              ORDER BY scheme_id, village_name, sent_date, created_at DESC
            ),
            ack_status AS (
              SELECT scheme_id,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type IN ('LPCD', 'Low LPCD')
                  AND ${dateFilter}
                GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id
            )
            SELECT 
              w.scheme_id, 
              w.scheme_name, 
              w.region,
              w.village_name,
              w.lpcd_value_day7 as current_value,
              w.lpcd_value_day6 as previous_value,
              e.alert_value as historical_value,
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
              e.created_at, e.sent_date, e.ticket_id,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
            FROM water_scheme_data w
            JOIN recent_logs e ON w.scheme_id = e.scheme_id AND w.village_name IS NOT DISTINCT FROM e.village_name
            JOIN scheme_status s ON w.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (w.scheme_id = sed.scheme_id OR w.scheme_name ILIKE sed.scheme)
            LEFT JOIN issues i ON w.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON w.scheme_id = a.scheme_id
            WHERE s.water_supply = 'Yes'
            ORDER BY w.region, w.scheme_name, w.village_name
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
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
          ];
          styleSheet(sheet, `Village LPCD Alerts Summary (Villages < 55 LPCD) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.current_value !== null ? row.current_value : '-',
              row.previous_value !== null ? row.previous_value : '-',
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.sent_date ? String(row.sent_date).slice(0, 10) : '-',
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 8);
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
                     scheme_id, esr_name, ticket_id, alert_value, 
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
              WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'RCA')
                AND ${dateFilter}
              ORDER BY scheme_id, esr_name, sent_date, created_at DESC
            ),
            ack_status AS (
              SELECT scheme_id,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'RCA')
                  AND ${dateFilter}
                GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id
            )
            SELECT 
              c.scheme_id, 
              c.scheme_name, 
              c.region,
              c.village_name,
              c.esr_name,
              c.chlorine_value_7 as current_value,
              c.chlorine_value_6 as previous_value,
              e.alert_value as historical_value,
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
              e.created_at, e.sent_date, e.ticket_id,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
            FROM chlorine_data c
            JOIN recent_logs e ON c.scheme_id = e.scheme_id AND c.esr_name IS NOT DISTINCT FROM e.esr_name
            JOIN scheme_status s ON c.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (c.scheme_id = sed.scheme_id OR c.scheme_name ILIKE sed.scheme)
            LEFT JOIN issues i ON c.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON c.scheme_id = a.scheme_id
            WHERE s.water_supply = 'Yes'
            ORDER BY c.region, c.scheme_name, c.village_name, c.esr_name
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
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
          ];
          styleSheet(sheet, `Chlorine Sensor Alerts Summary (Sensors outside 0.20-0.50 mg/L) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.esr_name || '-',
              row.current_value !== null ? row.current_value : '-',
              row.previous_value !== null ? row.previous_value : '-',
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.sent_date ? String(row.sent_date).slice(0, 10) : '-',
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 9);
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
                     scheme_id, esr_name, ticket_id, alert_value, 
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
                AND ${dateFilter}
              ORDER BY scheme_id, esr_name, sent_date, created_at DESC
            ),
            ack_status AS (
              SELECT scheme_id,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type IN ('Pressure', 'Low Pressure')
                  AND ${dateFilter}
                GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id
            )
            SELECT 
              p.scheme_id, 
              p.scheme_name, 
              p.region,
              p.village_name,
              p.esr_name,
              p.pressure_value_7 as current_value,
              p.pressure_value_6 as previous_value,
              e.alert_value as historical_value,
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
              e.created_at, e.sent_date, e.ticket_id,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
            FROM pressure_data p
            JOIN recent_logs e ON p.scheme_id = e.scheme_id AND p.esr_name IS NOT DISTINCT FROM e.esr_name
            JOIN scheme_status s ON p.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (p.scheme_id = sed.scheme_id OR p.scheme_name ILIKE sed.scheme)
            LEFT JOIN issues i ON p.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON p.scheme_id = a.scheme_id
            WHERE s.water_supply = 'Yes'
            ORDER BY p.region, p.scheme_name, p.village_name, p.esr_name
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
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'Ticket ID', key: 'ticket_id', width: 16 },
            { header: 'Alert Date', key: 'sent_date', width: 14 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
          ];
          styleSheet(sheet, `Pressure Sensor Alerts Summary (Sensors outside 0.20-0.70 Bar) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);
            const values = [
              idx + 1,
              row.scheme_id || '-',
              row.scheme_name || '-',
              row.region || '-',
              row.village_name || '-',
              row.esr_name || '-',
              row.current_value !== null ? row.current_value : '-',
              row.previous_value !== null ? row.previous_value : '-',
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              row.ticket_id || '-',
              row.sent_date ? String(row.sent_date).slice(0, 10) : '-',
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 9);
          });
        } else if (tabKey === 'offline') {
          const offlineQuery = `
            WITH ack_status AS (
              SELECT scheme_id,
                     json_agg(json_build_object(
                       'engineer_email', engineer_email,
                       'engineer_name', engineer_name,
                       'acknowledged_at', max_ack
                     )) as acknowledgements
              FROM (
                SELECT scheme_id, 
                       LOWER(TRIM(engineer_email)) as engineer_email, 
                       MAX(engineer_name) as engineer_name, 
                       MAX(acknowledged_at) as max_ack
                FROM email_acknowledgements
                WHERE alert_type = 'Offline'
                GROUP BY scheme_id, LOWER(TRIM(engineer_email)), LOWER(TRIM(COALESCE(engineer_name, '')))
              ) sub
              GROUP BY scheme_id
            )
            SELECT 
              c.scheme_id,
              c.scheme_name,
              c.region,
              c.village_name,
              c.esr_name,
              c.chlorine_status,
              c.pressure_status,
              c.flow_meter_status,
              c.last_seen,
              sed.ee_civil_name,
              sed.ee_civil_email,
              sed.ee_civil_mobile,
              sed.ee_mech_name,
              sed.ee_mech_email,
              sed.ee_mech_mobile,
              sed.de_ae_civil_name,
              sed.de_ae_civil_email,
              sed.de_ae_civil_mobile,
              sed.de_ae_mech_name,
              sed.de_ae_mech_email,
              sed.de_ae_mech_mobile,
              sed.se_name,
              sed.se_email,
              sed.se_mobile,
              sed.chief_engineer_name,
              sed.chief_engineer_email,
              sed.chief_engineer_mobile,
              v.employee_name as vendor_name,
              v.email as vendor_email,
              v.phone as vendor_phone,
              COALESCE(i.remarks, '[]'::json) as remarks,
              COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
            FROM communication_status c
            INNER JOIN scheme_status s ON c.scheme_id = s.scheme_id
            LEFT JOIN scheme_engineer_details sed ON (c.scheme_id = sed.scheme_id OR c.scheme_name ILIKE sed.scheme)
            LEFT JOIN (
              SELECT DISTINCT ON (region) region, employee_name, email, phone
              FROM vendor
              ORDER BY region, id
            ) v ON c.region = v.region
            LEFT JOIN issues i ON c.scheme_id = i.scheme_id
            LEFT JOIN ack_status a ON c.scheme_id = a.scheme_id
            WHERE (c.chlorine_status = 'Offline' 
               OR c.pressure_status = 'Offline' 
               OR c.flow_meter_status = 'Offline')
              AND s.water_supply = 'Yes'
            ORDER BY c.region, c.scheme_name, c.village_name;
          `;
          const { rows } = await client.query(offlineQuery);
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
            { header: 'Alert Status', key: 'ack_status', width: 16 },
            { header: 'Acknowledged By', key: 'ack_by', width: 22 },
            { header: 'Acknowledged At', key: 'ack_at', width: 22 },
            { header: 'Latest Remark / Action', key: 'remark', width: 32 },
            { header: 'EE Civil', key: 'ee_civil', width: 32 },
            { header: 'EE Mech', key: 'ee_mech', width: 32 },
            { header: 'DE / AE Civil', key: 'de_civil', width: 32 },
            { header: 'DE / AE Mech', key: 'de_mech', width: 32 },
            { header: 'Superintending Engineer', key: 'se', width: 32 },
            { header: 'Chief Engineer', key: 'ce', width: 32 },
            { header: 'Assigned Vendor / Engineer', key: 'vendor', width: 32 },
          ];
          styleSheet(sheet, `Offline Sensor Alerts Summary (Communication Blackout) - ${titleSuffix}`, cols);
          rows.forEach((row: any, idx: number) => {
            const offlineList: string[] = [];
            if (row.chlorine_status === 'Offline') offlineList.push('Chlorine');
            if (row.pressure_status === 'Offline') offlineList.push('Pressure');
            if (row.flow_meter_status === 'Offline') offlineList.push('Flow Meter');

            const ack = getAckDetails(row.acknowledgements);
            const remark = getRemarkText(row.remarks);

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
              ack.ackStatus,
              ack.ackBy,
              ack.ackAt,
              remark,
              formatContact(row.ee_civil_name, row.ee_civil_email, row.ee_civil_mobile),
              formatContact(row.ee_mech_name, row.ee_mech_email, row.ee_mech_mobile),
              formatContact(row.de_ae_civil_name, row.de_ae_civil_email, row.de_ae_civil_mobile),
              formatContact(row.de_ae_mech_name, row.de_ae_mech_email, row.de_ae_mech_mobile),
              formatContact(row.se_name, row.se_email, row.se_mobile),
              formatContact(row.chief_engineer_name, row.chief_engineer_email, row.chief_engineer_mobile),
              formatContact(row.vendor_name, row.vendor_email, row.vendor_phone),
            ];
            addSheetRow(sheet, values, ack.ackStatus, idx, 12);
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

export default router;

