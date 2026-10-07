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
         WHERE ticket_id = $3 AND (engineer_email IS NULL OR LOWER(TRIM(engineer_email)) = $4)
         RETURNING id`,
        [remarks || 'Acknowledged in Portal', name, ticket_id, email]
      );
    }

    if (!updateRes || updateRes.rows.length === 0) {
      // Try updating unacknowledged record for this engineer on this scheme/ESR
      updateRes = await client.query(
        `UPDATE realtime_acknowledgements
         SET is_acknowledged = TRUE, acknowledged_at = NOW(), remarks = $1, engineer_name = $2
         WHERE scheme_id = $3 
           AND COALESCE(NULLIF(TRIM(esr_name), '-'), '') = COALESCE(NULLIF(TRIM($4), '-'), '')
           AND sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
           AND (engineer_email IS NULL OR LOWER(TRIM(engineer_email)) = $5)
         RETURNING id`,
        [remarks || 'Acknowledged in Portal', name, scheme_id, esr_name || null, email]
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
    const sessionUser = (req as any).session;
    let currentEngineerEmail = (sessionUser?.engineerProfile?.email || sessionUser?.user?.email || sessionUser?.email || '').trim().toLowerCase();
    const isEngineerSession = sessionUser?.isEngineer === true || sessionUser?.role === 'engineer';
    if (!currentEngineerEmail && sessionUser?.userId) {
      const uRes = await client.query('SELECT email FROM users WHERE id = $1', [sessionUser.userId]);
      if (uRes.rows[0]?.email) {
        currentEngineerEmail = uRes.rows[0].email.trim().toLowerCase();
      }
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS realtime_acknowledgements (
        id SERIAL PRIMARY KEY,
        token VARCHAR(100) UNIQUE,
        scheme_id VARCHAR(50),
        scheme_name VARCHAR(255),
        village_name VARCHAR(255),
        esr_name VARCHAR(255),
        alert_type VARCHAR(100),
        alert_value VARCHAR(100),
        ticket_id VARCHAR(100),
        engineer_name VARCHAR(255),
        engineer_email VARCHAR(255),
        remarks TEXT,
        is_acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        sent_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS realtime_sensor_data (
        id SERIAL PRIMARY KEY,
        scheme_id VARCHAR(50),
        scheme_name VARCHAR(255),
        village_name VARCHAR(255),
        esr_name VARCHAR(255),
        chlorine_value NUMERIC(10, 4),
        chlorine_timestamp TIMESTAMP WITH TIME ZONE,
        chlorine_comm_status VARCHAR(50),
        flow_rate_value NUMERIC(10, 4),
        flow_rate_timestamp TIMESTAMP WITH TIME ZONE,
        flow_rate_comm_status VARCHAR(50),
        pressure_value NUMERIC(10, 4),
        pressure_timestamp TIMESTAMP WITH TIME ZONE,
        pressure_comm_status VARCHAR(50),
        prev_chlorine_status VARCHAR(50),
        prev_chlorine_value NUMERIC(10, 4),
        last_updated_values JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 1. Support requestedDate & subTab for date resilience
    const requestedDate = req.query.date as string;
    const subTab = (req.query.subTab as string) || 'current';
    let dateFilterSql = `(ra.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR ra.sent_date = CURRENT_DATE)`;
    let emailDateFilterSql = `(e.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR e.sent_date = CURRENT_DATE)`;
    if (requestedDate && requestedDate.trim() && requestedDate !== 'undefined' && requestedDate !== 'null') {
      dateFilterSql = `ra.sent_date = '${requestedDate.trim()}'::date`;
      emailDateFilterSql = `e.sent_date = '${requestedDate.trim()}'::date`;
    } else if (subTab === 'previous') {
      dateFilterSql = `ra.sent_date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')::date`;
      emailDateFilterSql = `e.sent_date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')::date`;
    }

    // 2. Fetch Sent Alerts from realtime_acknowledgements (scoped with LATERAL joins to eliminate duplicate Cartesian explosion)
    let sentAlertsRes = await client.query(`
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
      LEFT JOIN LATERAL (
        SELECT s.scheme_name, s.region, s.circle, s.division, s.block
        FROM scheme_status s 
        WHERE s.scheme_id = ra.scheme_id 
        LIMIT 1
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT rsd.village_name, rsd.esr_name, rsd.chlorine_value, rsd.flow_rate_value, rsd.pressure_value, rsd.prev_chlorine_status, rsd.prev_chlorine_value
        FROM realtime_sensor_data rsd 
        WHERE rsd.scheme_id = ra.scheme_id AND (ra.esr_name IS NULL OR rsd.esr_name = ra.esr_name)
        LIMIT 1
      ) rsd ON true
      LEFT JOIN LATERAL (
        SELECT sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
               sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
               sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
               sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
               sed.se_name, sed.se_email, sed.se_mobile,
               sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
        FROM scheme_engineer_details sed 
        WHERE sed.scheme_id = ra.scheme_id OR (ra.scheme_name IS NOT NULL AND sed.scheme = ra.scheme_name)
        LIMIT 1
      ) sed ON true
      WHERE ${dateFilterSql}
      ORDER BY 
        ${isEngineerSession && currentEngineerEmail ? `(CASE WHEN LOWER(TRIM(ra.engineer_email)) = '${currentEngineerEmail}' THEN 0 ELSE 1 END),` : ''}
        ra.created_at DESC
    `);

    // Fallback to email_alert_logs if realtime_acknowledgements has 0 records on cloud
    if (sentAlertsRes.rows.length === 0) {
      sentAlertsRes = await client.query(`
        SELECT 
          e.id,
          e.ticket_id as token,
          e.scheme_id,
          COALESCE(e.scheme_name, s.scheme_name, e.scheme_id) as scheme_name,
          e.village_name,
          e.esr_name,
          e.alert_type,
          e.alert_value,
          e.ticket_id,
          COALESCE(e.ee_civil_name, sed.ee_civil_name) as engineer_name,
          COALESCE(e.ee_civil_email, sed.ee_civil_email) as engineer_email,
          NULL as remarks,
          FALSE as is_acknowledged,
          NULL as acknowledged_at,
          e.sent_date,
          e.sent_time,
          e.telemetry_date,
          e.created_at,
          s.region,
          s.circle,
          s.division,
          s.block,
          NULL as chlorine_value,
          NULL as flow_rate_value,
          NULL as pressure_value,
          NULL as prev_chlorine_status,
          NULL as prev_chlorine_value,
          sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile,
          sed.ee_mech_name, sed.ee_mech_email, sed.ee_mech_mobile,
          sed.de_ae_civil_name, sed.de_ae_civil_email, sed.de_ae_civil_mobile,
          sed.de_ae_mech_name, sed.de_ae_mech_email, sed.de_ae_mech_mobile,
          sed.se_name, sed.se_email, sed.se_mobile,
          sed.chief_engineer_name, sed.chief_engineer_email, sed.chief_engineer_mobile
        FROM email_alert_logs e
        LEFT JOIN LATERAL (
          SELECT s.scheme_name, s.region, s.circle, s.division, s.block
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
        WHERE (e.dispatch_type = 'realtime' OR e.ticket_id LIKE 'TKT-RT-%')
          AND ${emailDateFilterSql}
        ORDER BY e.created_at DESC
      `);
    }


    // Fetch email and sms dispatch stats
    const statsRes = await client.query(`
      WITH distinct_emails AS (
        SELECT engineer_email as email FROM realtime_acknowledgements WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AND engineer_email IS NOT NULL AND engineer_email != ''
        UNION
        SELECT unnest(ARRAY[ee_civil_email, ee_mech_email, civil_engineer_email, de_ae_civil_email, mechanical_engineer_email, de_ae_mech_email, se_email, chief_engineer_email]) as email
        FROM email_alert_logs
        WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      ),
      email_stats AS (
        SELECT 
          (SELECT COUNT(DISTINCT ticket_id)::int FROM email_alert_logs WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date) as emails_sent_today,
          (SELECT COUNT(DISTINCT email)::int FROM distinct_emails WHERE email IS NOT NULL AND email != '') as distinct_recipients
      ),
      sms_stats AS (
        SELECT 
          COUNT(*)::int as sms_sent_today,
          COUNT(DISTINCT mobile)::int as sms_recipients
        FROM sms_alert_logs
        WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
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
      SELECT scheme_id, esr_name, alert_type, ticket_id, engineer_name, engineer_email, is_acknowledged, acknowledged_at, sent_date, remarks
      FROM realtime_acknowledgements
      WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AND (is_acknowledged = TRUE OR acknowledged_at IS NOT NULL)
    `);

    // Fetch all SMS dispatch logs for today
    const smsTodayRes = await client.query(`
      SELECT id, mobile, engineer_name, engineer_email, template_name, message_text, gateway_status, is_success, sent_date, created_at, scheme_id
      FROM sms_alert_logs
      WHERE sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
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
        const alertAcks = acksTodayRes.rows.filter((a: any) => {
          if (a.scheme_id !== r.scheme_id) return false;
          if (r.ticket_id && a.ticket_id && a.ticket_id === r.ticket_id) return true;
          if (r.esr_name && a.esr_name && a.esr_name.trim().toLowerCase() === r.esr_name.trim().toLowerCase() && a.alert_type === r.alert_type) return true;
          return false;
        });

        const myAck = (isEngineerSession && currentEngineerEmail)
          ? alertAcks.find((a: any) => (a.engineer_email || '').trim().toLowerCase() === currentEngineerEmail)
          : null;

        const isAlertAcked = (isEngineerSession && currentEngineerEmail)
          ? Boolean(myAck)
          : (Boolean(r.is_acknowledged) || alertAcks.length > 0);

        const schemeSms = smsTodayRes.rows.filter((s: any) => s.scheme_id === r.scheme_id);

        let categoryType = 'chlorine_critical';
        const lowerAlert = (r.alert_type || '').toLowerCase();
        if (lowerAlert.includes('chlorine') && lowerAlert.includes('offline')) {
          categoryType = 'chlorine_offline';
        } else if (lowerAlert.includes('flow') && lowerAlert.includes('offline')) {
          categoryType = 'flow_offline';
        } else if (lowerAlert.includes('pressure') && lowerAlert.includes('offline')) {
          categoryType = 'pressure_offline';
        } else if (lowerAlert.includes('pressure')) {
          categoryType = 'pressure_critical';
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
          sent_time: r.sent_time || null,
          telemetry_date: r.telemetry_date || r.created_at || null,
          created_at: r.created_at,
          is_acknowledged: isAlertAcked,
          acknowledged_at: myAck ? myAck.acknowledged_at : (isEngineerSession ? null : (r.acknowledged_at || alertAcks[0]?.acknowledged_at || null)),
          acknowledged_by: myAck ? (myAck.engineer_name || myAck.engineer_email) : (isEngineerSession ? null : (r.engineer_name || alertAcks[0]?.engineer_name || r.engineer_email || 'Engineer')),
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
          acknowledgements: alertAcks,
          sms_dispatches: schemeSms,
          total_emails_sent: emailRecipients.length,
          total_sms_sent: schemeSms.length,
          is_dispatched: true,
        });
      }
    }

    // Dispatched alerts are strictly sourced from sentAlertsRes (realtime_acknowledgements / email_alert_logs)
    // preserving exact immutable sent time and alert value at time of dispatch.


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
    const pressureOfflineCount = finalAlertsList.filter((a: any) => a.category_type === 'pressure_offline' || (String(a.alert_type).toLowerCase().includes('pressure') && String(a.alert_type).toLowerCase().includes('offline'))).length;
    const genericOfflineCount = finalAlertsList.filter((a: any) => a.category_type === 'offline').length;
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
      total_offline_count: (chlorineOfflineCount + flowOfflineCount + pressureOfflineCount + genericOfflineCount) || finalAlertsList.filter((a: any) => String(a.alert_type || '').toLowerCase().includes('offline')).length,
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
