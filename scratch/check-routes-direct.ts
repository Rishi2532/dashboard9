import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkRoutes() {
  const db = await getDB();
  const dateFilter = sql`sent_date = '2026-10-19'`;

  // Chlorine
  const clRes = await db.execute(sql`
    WITH recent_logs AS (
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date) 
             scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
             sent_time, created_at, sent_date
      FROM email_alert_logs
      WHERE alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')
        AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND ${dateFilter}
      ORDER BY scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date, created_at DESC
    )
    SELECT COUNT(*) as count FROM recent_logs;
  `);
  console.log('Alert Progress Chlorine count:', clRes.rows[0].count);

  // Pressure
  const prRes = await db.execute(sql`
    WITH recent_logs AS (
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date) 
             scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
             sent_time, created_at, sent_date
      FROM email_alert_logs
      WHERE alert_type IN ('Pressure', 'Low Pressure')
        AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND ${dateFilter}
      ORDER BY scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date, created_at DESC
    )
    SELECT COUNT(*) as count FROM recent_logs;
  `);
  console.log('Alert Progress Pressure count:', prRes.rows[0].count);

  // Offline
  const offRes = await db.execute(sql`
    WITH recent_logs AS (
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date)
        scheme_id, scheme_name, region, village_name, esr_name, ticket_id, alert_value, telemetry_date,
        sent_time, created_at, sent_date
      FROM email_alert_logs
      WHERE alert_type ILIKE '%Offline%'
        AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND ${dateFilter}
      ORDER BY scheme_id, LOWER(TRIM(COALESCE(village_name, ''))), LOWER(TRIM(COALESCE(esr_name, ''))), sent_date, created_at DESC
    )
    SELECT COUNT(*) as count FROM recent_logs;
  `);
  console.log('Alert Progress Offline count:', offRes.rows[0].count);

  // LPCD
  const lpcdRes = await db.execute(sql`
    WITH recent_logs AS (
      SELECT scheme_id, scheme_name, region, village_name, ticket_id, alert_value, telemetry_date,
             sent_time, created_at, sent_date
      FROM email_alert_logs
      WHERE alert_type IN ('LPCD', 'Low LPCD')
        AND (ticket_id NOT LIKE 'TKT-RT-%' OR ticket_id IS NULL)
        AND (dispatch_type = 'daily' OR dispatch_type IS NULL)
        AND ${dateFilter}
    )
    SELECT COUNT(*) as count FROM recent_logs;
  `);
  console.log('Alert Progress LPCD count:', lpcdRes.rows[0].count);

  process.exit(0);
}

checkRoutes().catch(console.error);
