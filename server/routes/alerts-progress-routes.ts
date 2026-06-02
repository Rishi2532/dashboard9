import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/lpcd', async (req, res) => {
  try {
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
          SELECT DISTINCT ON (scheme_id) scheme_id, civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email
          FROM email_alert_logs
          WHERE alert_type IN ('LPCD', 'Water')
            AND sent_date >= CURRENT_DATE - INTERVAL '1 day'
          ORDER BY scheme_id, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', acknowledged_at
                 )) as acknowledgements
          FROM email_acknowledgements
          WHERE alert_type IN ('LPCD', 'Water')
            AND sent_date = CURRENT_DATE
          GROUP BY scheme_id
        )
        SELECT 
          w.scheme_id, 
          w.scheme_name, 
          w.region,
          w.village_name,
          w.lpcd_value_day7 as current_value,
          w.lpcd_value_day6 as previous_value,
          e.civil_engineer_name, e.civil_engineer_email,
          e.mechanical_engineer_name, e.mechanical_engineer_email,
          e.site_supervisor_name, e.site_supervisor_email,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM water_scheme_data w
        JOIN recent_logs e ON w.scheme_id = e.scheme_id
        LEFT JOIN issues i ON w.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON w.scheme_id = a.scheme_id
      `;
      const result = await client.query(query);
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
          SELECT DISTINCT ON (scheme_id) scheme_id, civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email
          FROM email_alert_logs
          WHERE alert_type = 'Chlorine'
            AND sent_date >= CURRENT_DATE - INTERVAL '1 day'
          ORDER BY scheme_id, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', acknowledged_at
                 )) as acknowledgements
          FROM email_acknowledgements
          WHERE alert_type = 'Chlorine'
            AND sent_date = CURRENT_DATE
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
          e.civil_engineer_name, e.civil_engineer_email,
          e.mechanical_engineer_name, e.mechanical_engineer_email,
          e.site_supervisor_name, e.site_supervisor_email,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM chlorine_data c
        JOIN recent_logs e ON c.scheme_id = e.scheme_id
        LEFT JOIN issues i ON c.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON c.scheme_id = a.scheme_id
      `;
      const result = await client.query(query);
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
          SELECT DISTINCT ON (scheme_id) scheme_id, civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email
          FROM email_alert_logs
          WHERE alert_type = 'Pressure'
            AND sent_date >= CURRENT_DATE - INTERVAL '1 day'
          ORDER BY scheme_id, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', acknowledged_at
                 )) as acknowledgements
          FROM email_acknowledgements
          WHERE alert_type = 'Pressure'
            AND sent_date = CURRENT_DATE
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
          e.civil_engineer_name, e.civil_engineer_email,
          e.mechanical_engineer_name, e.mechanical_engineer_email,
          e.site_supervisor_name, e.site_supervisor_email,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM pressure_data p
        JOIN recent_logs e ON p.scheme_id = e.scheme_id
        LEFT JOIN issues i ON p.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON p.scheme_id = a.scheme_id
      `;
      const result = await client.query(query);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Pressure alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Pressure alerts progress' });
  }
});

export default router;
