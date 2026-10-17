import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const q = `
      SELECT 
        ced.id::text,
        'email' AS channel,
        ced.created_at,
        ced.dispatch_date::date AS sent_date,
        COALESCE(ced.scheme_ids->>0, 'MJP-SCHEME') AS scheme_id,
        CASE 
          WHEN jsonb_array_length(ced.scheme_names) = 1 THEN ced.scheme_names->>0
          WHEN jsonb_array_length(ced.scheme_names) > 1 THEN (ced.scheme_names->>0) || ' (+' || (jsonb_array_length(ced.scheme_names) - 1) || ' more)'
          ELSE 'Maharashtra Jeevan Pradhikaran'
        END AS scheme_name,
        ced.scheme_ids,
        ced.engineer_name AS recipient_name,
        LOWER(TRIM(ced.engineer_email)) AS recipient_email,
        ced.engineer_mobile AS recipient_mobile,
        ced.engineer_role AS recipient_role,
        CASE 
          WHEN ced.engineer_role ILIKE '%Principal%' THEN 5
          WHEN ced.engineer_role ILIKE '%Member%' THEN 4
          WHEN ced.engineer_role ILIKE '%Chief%' OR ced.engineer_role ILIKE '%Superintending%' OR ced.engineer_role ILIKE '%SE%' THEN 3
          WHEN ced.engineer_role ILIKE '%Executive%' OR ced.engineer_role ILIKE '%EE%' THEN 2
          ELSE 1
        END AS tier,
        ced.total_alerts,
        ced.lpcd_alerts_count,
        ced.chlorine_alerts_count,
        ced.pressure_alerts_count,
        ced.offline_alerts_count,
        (ced.lpcd_alerts_count > 0) AS is_lpcd,
        (ced.chlorine_alerts_count > 0) AS is_chlorine,
        (ced.pressure_alerts_count > 0) AS is_pressure,
        (ced.offline_alerts_count > 0) AS is_offline
      FROM consolidated_email_dispatches ced
      WHERE ced.dispatch_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    `;
    const r = await client.query(q);
    console.log('Total consolidated emails today:', r.rows.length);
    const tierCounts = {};
    const catCountsByTier = { 1: { lpcd: 0, chlorine: 0, pressure: 0, offline: 0 }, 2: { lpcd: 0, chlorine: 0, pressure: 0, offline: 0 } };
    r.rows.forEach(row => {
      tierCounts[row.tier] = (tierCounts[row.tier] || 0) + 1;
      if (catCountsByTier[row.tier]) {
        if (row.is_lpcd) catCountsByTier[row.tier].lpcd++;
        if (row.is_chlorine) catCountsByTier[row.tier].chlorine++;
        if (row.is_pressure) catCountsByTier[row.tier].pressure++;
        if (row.is_offline) catCountsByTier[row.tier].offline++;
      }
    });
    console.log('Tier breakdown:', tierCounts);
    console.log('Categories by tier:', catCountsByTier);
  } finally {
    client.release();
    await pool.end();
  }
}
check().catch(console.error);
