import dotenv from 'dotenv';
dotenv.config();
import { getDB } from '../server/db';
import pg from 'pg';

async function checkEmails() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  console.log('=== Checking Email Tables for Today ===');
  
  // 1. Check consolidated_email_dispatches
  try {
    const dispatches = await client.query(`
      SELECT * FROM consolidated_email_dispatches 
      ORDER BY id DESC LIMIT 50
    `);
    console.log(`consolidated_email_dispatches count: ${dispatches.rows.length}`);
    if (dispatches.rows.length > 0) {
      console.log('Sample rows:');
      console.table(dispatches.rows.slice(0, 10).map(r => ({
        id: r.id,
        scheme_id: r.scheme_id,
        recipient_role: r.recipient_role,
        tier: r.tier,
        recipient_email: r.recipient_email,
        sent_date: r.sent_date,
        created_at: r.created_at,
        category: r.category,
        alert_type: r.alert_type
      })));

      // Group by scheme_id
      const byScheme = await client.query(`
        SELECT scheme_id, count(*) as count, string_agg(DISTINCT recipient_role, ', ') as roles, string_agg(DISTINCT tier::text, ', ') as tiers
        FROM consolidated_email_dispatches
        GROUP BY scheme_id
        ORDER BY count DESC
      `);
      console.log('Dispatches by scheme:');
      console.table(byScheme.rows);

      // Group by tier
      const byTier = await client.query(`
        SELECT tier, recipient_role, count(*) 
        FROM consolidated_email_dispatches 
        GROUP BY tier, recipient_role 
        ORDER BY tier
      `);
      console.log('Dispatches by tier/role:');
      console.table(byTier.rows);
    }
  } catch (err: any) {
    console.log('Error checking consolidated_email_dispatches:', err.message);
  }

  // 2. Check email_alert_logs
  try {
    const logs = await client.query(`
      SELECT count(*) FROM email_alert_logs
    `);
    console.log('email_alert_logs count:', logs.rows[0].count);
    const bySchemeLogs = await client.query(`
      SELECT scheme_id, scheme_name, count(*) as count, count(DISTINCT alert_type) as alert_types
      FROM email_alert_logs
      GROUP BY scheme_id, scheme_name
      ORDER BY count DESC LIMIT 15
    `);
    console.log('email_alert_logs by scheme (top 15):');
    console.table(bySchemeLogs.rows);
  } catch (err: any) {
    console.log('Error checking email_alert_logs:', err.message);
  }

  client.release();
  pool.end();
  process.exit(0);
}

checkEmails().catch(console.error);
