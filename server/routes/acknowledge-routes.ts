import { Router, type Request, type Response } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure the table exists when the route module loads
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_acknowledgements (
        id SERIAL PRIMARY KEY,
        token VARCHAR(128) NOT NULL,
        scheme_id VARCHAR(50) NOT NULL,
        alert_type VARCHAR(20) NOT NULL,
        engineer_email VARCHAR(255) NOT NULL,
        engineer_name VARCHAR(255),
        sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON email_acknowledgements(token);
      CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON email_acknowledgements(scheme_id, alert_type, sent_date);
    `);
    console.log('✅ email_acknowledgements table ready');
  } catch (e: any) {
    console.log('ℹ️ email_acknowledgements table check:', e.message);
  } finally {
    client.release();
  }
})();

/**
 * GET /api/acknowledge?token=xxx
 * Public route (no auth required) - engineer clicks this link from their email.
 * Marks ALL schemes associated with this token as acknowledged.
 */
router.get('/', async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send(renderPage('Invalid Link', 'This acknowledgement link is invalid or malformed.', false));
  }

  const client = await pool.connect();
  try {
    // Find all rows with this token
    const findResult = await client.query(
      `SELECT * FROM email_acknowledgements WHERE token = $1`,
      [token]
    );

    if (findResult.rows.length === 0) {
      return res.status(404).send(renderPage('Link Not Found', 'This acknowledgement link is invalid or has expired. Please check your email for the correct link.', false));
    }

    const firstRecord = findResult.rows[0];
    const alreadyAcknowledged = findResult.rows.every((r: any) => r.acknowledged_at !== null);

    if (alreadyAcknowledged) {
      const ackTime = new Date(firstRecord.acknowledged_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const schemeCount = findResult.rows.length;
      return res.send(renderPage(
        'Already Acknowledged',
        `You already acknowledged ${schemeCount} scheme alert${schemeCount > 1 ? 's' : ''} on <strong>${ackTime} IST</strong>.<br><br>No further action is needed.`,
        true
      ));
    }

    // Mark ALL rows with this token as acknowledged
    const updateResult = await client.query(
      `UPDATE email_acknowledgements SET acknowledged_at = NOW() WHERE token = $1 AND acknowledged_at IS NULL RETURNING scheme_id`,
      [token]
    );

    const acknowledgedSchemes = updateResult.rows.length;
    const engineerName = firstRecord.engineer_name || firstRecord.engineer_email;

    return res.send(renderPage(
      '✅ Alerts Acknowledged!',
      `Thank you, <strong>${engineerName}</strong>!<br><br>
       You have successfully acknowledged <strong>${acknowledgedSchemes} scheme alert${acknowledgedSchemes > 1 ? 's' : ''}</strong>.<br><br>
       Your acknowledgement has been recorded on the dashboard. Please ensure you take the necessary action to investigate and resolve the reported issues promptly.`,
      true
    ));
  } catch (error) {
    console.error('Error processing acknowledgement:', error);
    return res.status(500).send(renderPage('Server Error', 'Something went wrong. Please try again later or contact the administrator.', false));
  } finally {
    client.release();
  }
});

/**
 * GET /api/acknowledge/status
 * Internal API - used by the dashboard to get acknowledgement status.
 */
router.get('/status', async (req: Request, res: Response) => {
  const { scheme_id, alert_type, date } = req.query;

  if (!scheme_id || !alert_type) {
    return res.status(400).json({ error: 'scheme_id and alert_type are required' });
  }

  const client = await pool.connect();
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const result = await client.query(
      `SELECT engineer_email, engineer_name, acknowledged_at
       FROM email_acknowledgements
       WHERE scheme_id = $1 AND alert_type = $2 AND sent_date = $3
       ORDER BY acknowledged_at DESC NULLS LAST`,
      [scheme_id, alert_type, targetDate]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching acknowledgement status:', error);
    res.status(500).json({ error: 'Failed to fetch acknowledgement status' });
  } finally {
    client.release();
  }
});

/** Helper to render a clean standalone HTML page */
function renderPage(title: string, message: string, success: boolean): string {
  const color = success ? '#059669' : '#dc2626';
  const bgColor = success ? '#ecfdf5' : '#fef2f2';
  const borderColor = success ? '#a7f3d0' : '#fecaca';
  const icon = success ? '✅' : '❌';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Maharashtra Water Infrastructure</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 480px; width: 100%; overflow: hidden; }
    .header { background: #1e3a5f; color: white; padding: 28px 32px; text-align: center; }
    .header h1 { font-size: 16px; font-weight: 600; opacity: 0.9; }
    .header p { font-size: 13px; opacity: 0.7; margin-top: 4px; }
    .body { padding: 36px 32px; text-align: center; }
    .icon { font-size: 56px; margin-bottom: 20px; display: block; }
    .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .message-box { background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 10px; padding: 20px; margin-bottom: 24px; color: ${color}; font-size: 15px; line-height: 1.7; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding: 16px 32px; text-align: center; }
    .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⚠️ JJM SWSM IoT Maharashtra</h1>
      <p>Maharashtra Water Infrastructure Management Platform</p>
    </div>
    <div class="body">
      <span class="icon">${icon}</span>
      <div class="title">${title}</div>
      <div class="message-box">${message}</div>
      <a href="https://dashboard1.mahajaliot.in" class="btn">Go to Dashboard</a>
    </div>
    <div class="footer">This is an automated system from Maharashtra Water Infrastructure Management Platform.</div>
  </div>
</body>
</html>`;
}

export default router;
