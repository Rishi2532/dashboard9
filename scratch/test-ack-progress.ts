import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const client = await pool.connect();
  try {
    // 1. Find a token in email_acknowledgements
    const row = await client.query(`SELECT id, token, scheme_id, alert_type, engineer_email FROM email_acknowledgements LIMIT 1`);
    if (row.rows.length === 0) {
      console.log("No rows in email_acknowledgements");
      return;
    }

    const testToken = row.rows[0].token;
    console.log("Acknowledging token:", testToken);

    // Simulate GET /api/acknowledge?token=xxx
    const updateRes = await client.query(`UPDATE email_acknowledgements SET acknowledged_at = NOW() WHERE token = $1 RETURNING *`, [testToken]);
    console.log("Updated ack row:", updateRes.rows);

    // 2. Query alerts-progress for LPCD or Chlorine or Pressure
    const schemeId = row.rows[0].scheme_id;
    const ackRes = await client.query(`
      SELECT scheme_id,
             json_agg(json_build_object(
               'engineer_email', engineer_email,
               'engineer_name', engineer_name,
               'acknowledged_at', acknowledged_at
             )) as acknowledgements
      FROM email_acknowledgements
      WHERE scheme_id = $1
      GROUP BY scheme_id
    `, [schemeId]);

    console.log("Ack status result for scheme:", ackRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
