import { Router, type Request, type Response } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import { runPiRealtimeAlertsJob } from '../cron/pi-realtime-alerts';

dotenv.config();

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure table constraints allow shared tokens per batch
(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        ALTER TABLE realtime_acknowledgements DROP CONSTRAINT IF EXISTS realtime_acknowledgements_token_unique;
        ALTER TABLE realtime_acknowledgements DROP CONSTRAINT IF EXISTS realtime_acknowledgements_token_key;
      `);
      console.log('✅ realtime_acknowledgements table ready with multi-alert batch support');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.log('ℹ️ realtime_acknowledgements constraint setup:', err.message);
  }
})();

function renderAckPage(title: string, message: string, isSuccess: boolean) {
  const brandColor = isSuccess ? "#16a34a" : "#dc2626";
  const icon = isSuccess ? "✅" : "⚠️";
  const baseUrl = process.env.APP_BASE_URL || 'https://dashboard1.mahajaliot.in';
  const portalUrl = `${baseUrl.replace(/\/$/, '')}/engineer`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | MahaJal IoT SCADA</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        body { background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; color: #1e293b; }
        .card { background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05); max-width: 540px; width: 100%; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: ${brandColor}; color: white; padding: 28px 24px; text-align: center; }
        .header h1 { font-size: 20px; font-weight: 800; margin-top: 10px; }
        .body-content { padding: 32px 28px; font-size: 14.5px; line-height: 1.6; color: #334155; }
        .btn { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 24px; text-align: center; }
        .footer { border-top: 1px solid #f1f5f9; padding: 16px 24px; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 40px;">${icon}</div>
          <h1>${title}</h1>
          <p style="margin-top: 4px; opacity: 0.9; font-size: 13px;">MahaJal IoT SCADA Real-Time Platform</p>
        </div>
        <div class="body-content">
          <p>${message}</p>
          <div style="text-align: center;">
            <a href="${portalUrl}" class="btn">👉 Go to Engineer Portal</a>
          </div>
        </div>
        <div class="footer">
          Water Supply & Sanitation Department, Government of Maharashtra
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * GET /api/realtime-alerts/acknowledge?token=xxx
 * Public one-click acknowledgment endpoint from email (cross-checks both realtime and daily tables)
 */
router.get('/acknowledge', async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send(renderAckPage('Invalid Link', 'This real-time acknowledgement link is invalid or malformed.', false));
  }

  const client = await pool.connect();
  try {
    let findRes = await client.query(
      `SELECT * FROM realtime_acknowledgements WHERE token = $1`,
      [token]
    );

    let isRealtimeTable = true;
    if (findRes.rows.length === 0) {
      // Cross check email_acknowledgements table
      findRes = await client.query(
        `SELECT * FROM email_acknowledgements WHERE token = $1`,
        [token]
      );
      if (findRes.rows.length > 0) {
        isRealtimeTable = false;
      }
    }

    if (findRes.rows.length === 0) {
      return res.status(404).send(renderAckPage('Link Expired or Not Found', 'This acknowledgement link was not found or has expired.', false));
    }

    const first = findRes.rows[0];
    const allAlreadyAcked = isRealtimeTable
      ? findRes.rows.every((r: any) => r.is_acknowledged)
      : findRes.rows.every((r: any) => r.acknowledged_at !== null);

    if (allAlreadyAcked) {
      const ackTime = new Date(first.acknowledged_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      return res.send(renderAckPage(
        'Already Acknowledged',
        `You have already acknowledged these <strong>${findRes.rows.length} alerts</strong> on <strong>${ackTime} IST</strong>.<br><br>No further action is required.`,
        true
      ));
    }

    // Mark all rows with this token as acknowledged
    if (isRealtimeTable) {
      await client.query(
        `UPDATE realtime_acknowledgements 
         SET is_acknowledged = TRUE, acknowledged_at = NOW() 
         WHERE token = $1`,
        [token]
      );
    } else {
      await client.query(
        `UPDATE email_acknowledgements 
         SET acknowledged_at = NOW() 
         WHERE token = $1 AND acknowledged_at IS NULL`,
        [token]
      );
    }

    const count = findRes.rows.length;
    const engineerName = first.engineer_name || first.engineer_email || 'Engineer';

    return res.send(renderAckPage(
      '✅ Real-Time Alerts Acknowledged!',
      `Thank you, <strong>${engineerName}</strong>!<br><br>
       You have successfully acknowledged <strong>${count} live real-time telemetry alert${count > 1 ? 's' : ''}</strong> for your assigned scheme(s).<br><br>
       Your acknowledgment timestamp has been recorded in the central SCADA system.`,
      true
    ));
  } catch (err) {
    console.error('Error processing realtime acknowledgement:', err);
    return res.status(500).send(renderAckPage('Server Error', 'Failed to process acknowledgment. Please try again.', false));
  } finally {
    client.release();
  }
});

/**
 * POST /api/realtime-alerts/acknowledge
 * Portal acknowledgment endpoint (used by Engineer Portal & Alerts Progress)
 */
router.post('/acknowledge', async (req: Request, res: Response) => {
  const { scheme_id, esr_name, alert_type, remarks, engineer_email, engineer_name, ticket_id } = req.body;

  if (!scheme_id || !alert_type) {
    return res.status(400).json({ error: 'scheme_id and alert_type are required' });
  }

  const client = await pool.connect();
  try {
    const session = (req as any).session;
    const email = (engineer_email || session?.email || 'engineer@swsm.gov.in').trim().toLowerCase();
    const name = engineer_name || session?.name || session?.username || 'Engineer';

    let updateRes;
    if (ticket_id) {
      updateRes = await client.query(
        `UPDATE realtime_acknowledgements
         SET is_acknowledged = TRUE, acknowledged_at = NOW(), remarks = $1, engineer_name = $2
         WHERE ticket_id = $3
         RETURNING id`,
        [remarks || 'Acknowledged in Portal', name, ticket_id]
      );
    }

    if (!updateRes || updateRes.rows.length === 0) {
      // Insert new acknowledgment record if not present
      const token = `PORTAL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      await client.query(
        `INSERT INTO realtime_acknowledgements (
          token, scheme_id, esr_name, alert_type, ticket_id,
          engineer_name, engineer_email, remarks, is_acknowledged, acknowledged_at, sent_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), CURRENT_DATE)`,
        [
          token,
          scheme_id,
          esr_name || null,
          alert_type,
          ticket_id || `TKT-ACK-${Date.now().toString().slice(-4)}`,
          name,
          email,
          remarks || 'Acknowledged in Portal',
        ]
      );
    }

    res.json({ success: true, message: 'Real-time alert successfully acknowledged' });
  } catch (err: any) {
    console.error('Error in portal realtime acknowledge:', err);
    res.status(500).json({ error: err.message || 'Failed to acknowledge alert' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/alerts-progress/realtime
 * Complete KPI summary and sent alerts list for the Alerts Progress page "Real-Time Critical Alerts" tab
 */
router.get('/progress', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    // 1. Target schemes for which real-time alerts are sent (assigned to engineers / logged in dispatches)
    // 2. Fetch Sent Alerts from realtime_acknowledgements
    const sentAlertsRes = await client.query(`
      SELECT 
        ra.id,
        ra.token,
        ra.scheme_id,
        COALESCE(ra.scheme_name, s.scheme_name, ra.scheme_id) as scheme_name,
        COALESCE(ra.village_name, rsd.village_name) as village_name,
        COALESCE(ra.esr_name, rsd.esr_name) as esr_name,
        ra.alert_type,
        ra.alert_value,
        ra.ticket_id,
        ra.engineer_name,
        ra.engineer_email,
        ra.remarks,
        ra.is_acknowledged,
        ra.acknowledged_at,
        ra.sent_date,
        ra.created_at,
        s.region,
        s.circle,
        s.division,
        s.block,
        rsd.chlorine_value,
        rsd.flow_rate_value,
        rsd.pressure_value,
        rsd.prev_chlorine_status,
        rsd.prev_chlorine_value,
        sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
        sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
        sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
        sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
        sed.se_name, sed.se_email, sed.se_mobile,
        sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
      FROM realtime_acknowledgements ra
      LEFT JOIN scheme_status s ON ra.scheme_id = s.scheme_id
      LEFT JOIN realtime_sensor_data rsd ON (ra.scheme_id = rsd.scheme_id AND (ra.esr_name = rsd.esr_name OR (ra.esr_name IS NULL AND rsd.esr_name IS NULL)))
      LEFT JOIN scheme_engineer_details sed ON (ra.scheme_id = sed.scheme_id OR s.scheme_name ILIKE sed.scheme)
      WHERE ra.sent_date = CURRENT_DATE
      ORDER BY ra.created_at DESC
    `);

    // 3. Also fetch Active Critical Sensors from realtime_sensor_data ONLY FOR schemes where alerts are sent
    const activeSensorsRes = await client.query(`
      WITH target_schemes AS (
        SELECT DISTINCT scheme_id FROM scheme_engineer_details WHERE scheme_id IS NOT NULL
        UNION
        SELECT DISTINCT scheme_id FROM realtime_acknowledgements WHERE sent_date = CURRENT_DATE
        UNION
        SELECT DISTINCT scheme_id FROM email_alert_logs WHERE sent_date = CURRENT_DATE
      )
      SELECT 
        r.scheme_id,
        r.village_name,
        r.esr_name,
        r.chlorine_value,
        r.chlorine_timestamp,
        r.chlorine_comm_status,
        r.flow_rate_value,
        r.flow_rate_timestamp,
        r.flow_rate_comm_status,
        r.pressure_value,
        r.pressure_timestamp,
        r.pressure_comm_status,
        r.prev_chlorine_status,
        r.prev_chlorine_value,
        r.last_updated_values,
        s.scheme_name,
        s.region,
        s.circle,
        s.division,
        s.block,
        sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
        sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
        sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
        sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
        sed.se_name, sed.se_email, sed.se_mobile,
        sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
      FROM realtime_sensor_data r
      JOIN target_schemes ts ON r.scheme_id = ts.scheme_id
      LEFT JOIN scheme_status s ON r.scheme_id = s.scheme_id
      LEFT JOIN scheme_engineer_details sed ON (r.scheme_id = sed.scheme_id OR s.scheme_name ILIKE sed.scheme)
      WHERE 
        -- Chlorine Critical with active flow
        (r.flow_rate_value > 0 AND r.chlorine_value IS NOT NULL AND (r.chlorine_value < 0.2 OR r.chlorine_value > 0.5))
        -- Or Chlorine Offline
        OR r.chlorine_comm_status = 'Offline'
        -- Or Flow Offline
        OR r.flow_rate_comm_status = 'Offline'
        -- Or Restored Chlorine
        OR (
          r.prev_chlorine_status IN ('Critical', 'Offline') 
          AND (
            (r.chlorine_comm_status = 'Online' AND r.flow_rate_value > 0 AND r.chlorine_value >= 0.2 AND r.chlorine_value <= 0.5)
            OR (r.chlorine_comm_status = 'Online' AND r.prev_chlorine_status = 'Offline')
          )
        )
      ORDER BY r.last_updated_values DESC
    `);

    // Fetch email and sms dispatch stats
    const statsRes = await client.query(`
      WITH distinct_emails AS (
        SELECT engineer_email as email FROM realtime_acknowledgements WHERE sent_date = CURRENT_DATE AND engineer_email IS NOT NULL AND engineer_email != ''
        UNION
        SELECT unnest(ARRAY[ee_civil_email, ee_mech_email, civil_engineer_email, de_ae_civil_email, mechanical_engineer_email, de_ae_mech_email, se_email, chief_engineer_email]) as email
        FROM email_alert_logs
        WHERE sent_date = CURRENT_DATE
      ),
      email_stats AS (
        SELECT 
          (SELECT COUNT(DISTINCT ticket_id)::int FROM email_alert_logs WHERE sent_date = CURRENT_DATE) as emails_sent_today,
          (SELECT COUNT(DISTINCT email)::int FROM distinct_emails WHERE email IS NOT NULL AND email != '') as distinct_recipients
      ),
      sms_stats AS (
        SELECT 
          COUNT(*)::int as sms_sent_today,
          COUNT(DISTINCT mobile)::int as sms_recipients
        FROM sms_alert_logs
        WHERE sent_date = CURRENT_DATE
      )
      SELECT 
        e.emails_sent_today,
        e.distinct_recipients as email_recipients_count,
        m.sms_sent_today,
        m.sms_recipients as sms_recipients_count
      FROM email_stats e
      CROSS JOIN sms_stats m
    `);
    const dispatchStats = statsRes.rows[0] || {};

    // Fetch all acknowledgements recorded today for real-time and email
    const acksTodayRes = await client.query(`
      SELECT scheme_id, esr_name, ticket_id, engineer_name, engineer_email, is_acknowledged, acknowledged_at, sent_date, remarks
      FROM realtime_acknowledgements
      WHERE sent_date = CURRENT_DATE AND (is_acknowledged = TRUE OR acknowledged_at IS NOT NULL)
    `);

    // Fetch all SMS dispatch logs for today
    const smsTodayRes = await client.query(`
      SELECT id, mobile, engineer_name, engineer_email, template_name, message_text, gateway_status, is_success, sent_date, created_at, scheme_id
      FROM sms_alert_logs
      WHERE sent_date = CURRENT_DATE
      ORDER BY created_at DESC
    `);

    // Combine and build rich sent alerts list
    const alertsMap = new Map<string, any>();

    const buildEmailRecipients = (r: any) => {
      const list: any[] = [];
      if (r.ee_civil_name || r.ee_civil_email) {
        list.push({ name: r.ee_civil_name || 'Executive Engineer (Civil)', email: r.ee_civil_email, role: 'Executive Engineer (Civil)', mobile: r.ee_civil_mobile });
      }
      if (r.ee_mech_name || r.ee_mech_email) {
        list.push({ name: r.ee_mech_name || 'Executive Engineer (Mech)', email: r.ee_mech_email, role: 'Executive Engineer (Mech)', mobile: r.ee_mech_mobile });
      }
      if (r.de_ae_civil_name || r.de_ae_civil_email) {
        list.push({ name: r.de_ae_civil_name || 'DE / AE (Civil)', email: r.de_ae_civil_email, role: 'DE / AE (Civil)', mobile: r.de_ae_civil_mobile });
      }
      if (r.de_ae_mech_name || r.de_ae_mech_email) {
        list.push({ name: r.de_ae_mech_name || 'DE / AE (Mech)', email: r.de_ae_mech_email, role: 'DE / AE (Mech)', mobile: r.de_ae_mech_mobile });
      }
      if (r.se_name || r.se_email) {
        list.push({ name: r.se_name || 'Superintending Engineer (SE)', email: r.se_email, role: 'Superintending Engineer (SE)', mobile: r.se_mobile });
      }
      if (r.chief_engineer_name || r.chief_engineer_email) {
        list.push({ name: r.chief_engineer_name || 'Chief Engineer', email: r.chief_engineer_email, role: 'Chief Engineer', mobile: r.chief_engineer_mobile });
      }
      if (list.length === 0 && r.engineer_email) {
        list.push({ name: r.engineer_name || 'Assigned Engineer', email: r.engineer_email, role: 'Assigned Engineer', mobile: null });
      }
      return list;
    };

    // Process from sent records in realtime_acknowledgements
    for (const r of sentAlertsRes.rows) {
      const key = `${r.scheme_id}|${r.esr_name || ''}|${r.alert_type}`.toLowerCase();
      if (!alertsMap.has(key)) {
        const emailRecipients = buildEmailRecipients(r);
        const schemeAcks = acksTodayRes.rows.filter((a: any) => a.scheme_id === r.scheme_id);
        const schemeSms = smsTodayRes.rows.filter((s: any) => s.scheme_id === r.scheme_id);

        let categoryType = 'chlorine_critical';
        const lowerAlert = (r.alert_type || '').toLowerCase();
        if (lowerAlert.includes('chlorine') && lowerAlert.includes('offline')) {
          categoryType = 'chlorine_offline';
        } else if (lowerAlert.includes('flow') && lowerAlert.includes('offline')) {
          categoryType = 'flow_offline';
        } else if (lowerAlert.includes('offline')) {
          categoryType = 'offline';
        } else if (lowerAlert.includes('restore') || lowerAlert.includes('normal') || lowerAlert.includes('changed')) {
          categoryType = 'restored';
        }

        alertsMap.set(key, {
          id: r.id,
          token: r.token,
          scheme_id: r.scheme_id,
          scheme_name: r.scheme_name,
          village_name: r.village_name,
          esr_name: r.esr_name,
          alert_type: r.alert_type,
          alert_value: r.alert_value,
          flow_rate_value: r.flow_rate_value,
          chlorine_value: r.chlorine_value,
          pressure_value: r.pressure_value,
          prev_chlorine_status: r.prev_chlorine_status,
          prev_chlorine_value: r.prev_chlorine_value,
          region: r.region,
          circle: r.circle,
          division: r.division,
          block: r.block,
          ticket_id: r.ticket_id,
          category_type: categoryType,
          sent_date: r.sent_date,
          created_at: r.created_at,
          is_acknowledged: Boolean(r.is_acknowledged) || schemeAcks.length > 0,
          acknowledged_at: r.acknowledged_at || (schemeAcks[0]?.acknowledged_at || null),
          acknowledged_by: r.engineer_name || (schemeAcks[0]?.engineer_name || r.engineer_email || 'Engineer'),
          remarks: r.remarks,
          ee_civil_name: r.ee_civil_name,
          ee_civil_email: r.ee_civil_email,
          ee_civil_mobile: r.ee_civil_mobile,
          ee_mech_name: r.ee_mech_name,
          ee_mech_email: r.ee_mech_email,
          ee_mech_mobile: r.ee_mech_mobile,
          de_ae_civil_name: r.de_ae_civil_name,
          de_ae_civil_email: r.de_ae_civil_email,
          de_ae_civil_mobile: r.de_ae_civil_mobile,
          de_ae_mech_name: r.de_ae_mech_name,
          de_ae_mech_email: r.de_ae_mech_email,
          de_ae_mech_mobile: r.de_ae_mech_mobile,
          se_name: r.se_name,
          se_email: r.se_email,
          se_mobile: r.se_mobile,
          chief_engineer_name: r.chief_engineer_name,
          chief_engineer_email: r.chief_engineer_email,
          chief_engineer_mobile: r.chief_engineer_mobile,
          email_recipients: emailRecipients,
          sms_recipients: schemeSms,
          acknowledgements: schemeAcks,
          sms_dispatches: schemeSms,
          total_emails_sent: emailRecipients.length,
          total_sms_sent: schemeSms.length,
          is_dispatched: true,
        });
      }
    }

    // Also include active / restored sensors from activeSensorsRes for alerted schemes
    for (const r of activeSensorsRes.rows) {
      let alertType = 'Low Chlorine';
      let categoryType = 'chlorine_critical';
      let alertValue = '-';

      const isRestored = r.prev_chlorine_status && r.prev_chlorine_status !== 'Good' && (
        (r.chlorine_comm_status === 'Online' && Number(r.flow_rate_value) > 0 && Number(r.chlorine_value) >= 0.2 && Number(r.chlorine_value) <= 0.5) ||
        (r.chlorine_comm_status === 'Online' && r.prev_chlorine_status === 'Offline')
      );

      if (isRestored) {
        alertType = 'Restored to Standard';
        categoryType = 'restored';
        alertValue = `${Number(r.chlorine_value || 0).toFixed(2)} mg/L (Good)`;
      } else if (r.flow_rate_value > 0 && r.chlorine_value !== null && Number(r.chlorine_value) > 0.5) {
        alertType = 'High Chlorine';
        categoryType = 'chlorine_critical';
        alertValue = `${Number(r.chlorine_value).toFixed(2)} mg/L`;
      } else if (r.flow_rate_value > 0 && r.chlorine_value !== null && Number(r.chlorine_value) < 0.2) {
        alertType = 'Low Chlorine';
        categoryType = 'chlorine_critical';
        alertValue = `${Number(r.chlorine_value).toFixed(2)} mg/L`;
      } else if (r.chlorine_comm_status === 'Offline') {
        alertType = 'Chlorine Sensor Offline';
        categoryType = 'chlorine_offline';
        alertValue = 'Offline';
      } else if (r.flow_rate_comm_status === 'Offline') {
        alertType = 'Flow Meter Offline';
        categoryType = 'flow_offline';
        alertValue = 'Offline';
      }

      const key = `${r.scheme_id}|${r.esr_name || ''}|${alertType}`.toLowerCase();
      if (!alertsMap.has(key)) {
        const emailRecipients = buildEmailRecipients(r);
        const schemeAcks = acksTodayRes.rows.filter((a: any) => a.scheme_id === r.scheme_id);
        const schemeSms = smsTodayRes.rows.filter((s: any) => s.scheme_id === r.scheme_id);

        alertsMap.set(key, {
          scheme_id: r.scheme_id,
          scheme_name: r.scheme_name,
          village_name: r.village_name,
          esr_name: r.esr_name,
          alert_type: alertType,
          alert_value: alertValue,
          flow_rate_value: r.flow_rate_value,
          chlorine_value: r.chlorine_value,
          pressure_value: r.pressure_value,
          prev_chlorine_status: r.prev_chlorine_status,
          prev_chlorine_value: r.prev_chlorine_value,
          region: r.region,
          circle: r.circle,
          division: r.division,
          block: r.block,
          ticket_id: `TKT-RT-${r.scheme_id}`,
          category_type: categoryType,
          sent_date: new Date().toISOString().split('T')[0],
          created_at: r.last_updated_values,
          is_acknowledged: schemeAcks.length > 0,
          acknowledged_at: schemeAcks[0]?.acknowledged_at || null,
          acknowledged_by: schemeAcks[0]?.engineer_name || null,
          remarks: schemeAcks[0]?.remarks || null,
          ee_civil_name: r.ee_civil_name,
          ee_civil_email: r.ee_civil_email,
          ee_civil_mobile: r.ee_civil_mobile,
          ee_mech_name: r.ee_mech_name,
          ee_mech_email: r.ee_mech_email,
          ee_mech_mobile: r.ee_mech_mobile,
          de_ae_civil_name: r.de_ae_civil_name,
          de_ae_civil_email: r.de_ae_civil_email,
          de_ae_civil_mobile: r.de_ae_civil_mobile,
          de_ae_mech_name: r.de_ae_mech_name,
          de_ae_mech_email: r.de_ae_mech_email,
          de_ae_mech_mobile: r.de_ae_mech_mobile,
          se_name: r.se_name,
          se_email: r.se_email,
          se_mobile: r.se_mobile,
          chief_engineer_name: r.chief_engineer_name,
          chief_engineer_email: r.chief_engineer_email,
          chief_engineer_mobile: r.chief_engineer_mobile,
          email_recipients: emailRecipients,
          sms_recipients: schemeSms,
          acknowledgements: schemeAcks,
          sms_dispatches: schemeSms,
          total_emails_sent: emailRecipients.length,
          total_sms_sent: schemeSms.length,
          is_dispatched: true,
        });
      }
    }

    const finalAlertsList = Array.from(alertsMap.values());

    // Calculate exact mathematical KPI summaries directly from finalAlertsList
    const highChlorineCount = finalAlertsList.filter((a: any) =>
      a.category_type === 'chlorine_critical' && (String(a.alert_type).toLowerCase().includes('high') || (a.chlorine_value !== null && Number(a.chlorine_value) > 0.5))
    ).length;

    const lowChlorineCount = finalAlertsList.filter((a: any) =>
      a.category_type === 'chlorine_critical' && !String(a.alert_type).toLowerCase().includes('high') && !(a.chlorine_value !== null && Number(a.chlorine_value) > 0.5)
    ).length;

    const totalCriticalChlorine = finalAlertsList.filter((a: any) => a.category_type === 'chlorine_critical').length;
    const restoredCount = finalAlertsList.filter((a: any) => a.category_type === 'restored').length;
    const chlorineOfflineCount = finalAlertsList.filter((a: any) => a.category_type === 'chlorine_offline').length;
    const flowOfflineCount = finalAlertsList.filter((a: any) => a.category_type === 'flow_offline').length;
    const pressureOfflineCount = finalAlertsList.filter((a: any) => String(a.alert_type).toLowerCase().includes('pressure') && String(a.alert_type).toLowerCase().includes('offline')).length;
    const acknowledgedCount = finalAlertsList.filter((a: any) => Boolean(a.is_acknowledged)).length;
    const pendingAcknowledgedCount = finalAlertsList.length - acknowledgedCount;

    const summary = {
      low_chlorine_count: lowChlorineCount,
      high_chlorine_count: highChlorineCount,
      total_critical_chlorine: totalCriticalChlorine,
      restored_chlorine_count: restoredCount,
      chlorine_offline_count: chlorineOfflineCount,
      flow_offline_count: flowOfflineCount,
      pressure_offline_count: pressureOfflineCount,
      acknowledged_count: acknowledgedCount,
      pending_acknowledged_count: pendingAcknowledgedCount,
      total_esrs: new Set(finalAlertsList.map((a: any) => `${a.scheme_id}|${a.esr_name || ''}`)).size || finalAlertsList.length,
      emails_sent_today: dispatchStats.emails_sent_today || 0,
      sms_sent_today: dispatchStats.sms_sent_today || 0,
      email_recipients_count: dispatchStats.email_recipients_count || 0,
      sms_recipients_count: dispatchStats.sms_recipients_count || 0,
    };

    res.json({
      summary,
      alerts: finalAlertsList,
    });
  } catch (err: any) {
    console.error('Error fetching realtime progress data:', err);
    res.status(500).json({ error: 'Failed to fetch realtime progress data' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/realtime-alerts/trigger
 * Admin manual trigger to run a real-time cycle immediately
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    console.log("Manual real-time alert trigger requested...");
    runPiRealtimeAlertsJob().catch(err => console.error("Error in manually triggered real-time job:", err));
    res.json({ success: true, message: "Real-time alerts cycle initiated in background" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
