const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const colRes = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'consolidated_email_dispatches' AND column_name IN ('scheme_ids', 'scheme_names')
    `);
    console.log('Columns data_type:', colRes.rows);

    // Test the CTE directly for Tier 2 on 17 Oct
    const testCte = await client.query(`
      SELECT 
        (ced.id::text || '-' || COALESCE(sid.scheme_id, '0')) AS id,
        'email' AS channel,
        ced.created_at,
        ced.dispatch_date::date AS sent_date,
        COALESCE(sid.scheme_id, ced.scheme_ids->>0, 'MJP-SCHEME') AS scheme_id,
        ced.engineer_name AS recipient_name,
        ced.engineer_role AS recipient_role,
        CASE 
          WHEN ced.engineer_role ILIKE '%Executive%' OR ced.engineer_role ILIKE '%EE%' THEN 2
          ELSE 1
        END AS tier
      FROM consolidated_email_dispatches ced
      LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(ced.scheme_ids, '[]'::jsonb)) AS sid(scheme_id) ON true
      WHERE ced.engineer_role ILIKE '%EE%'
      LIMIT 10
    `);
    console.log(`Test CTE rows count: ${testCte.rows.length}`);
    console.table(testCte.rows);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
