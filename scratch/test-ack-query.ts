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
        scheme_id,
        json_agg(json_build_object(
          'engineer_email', engineer_email,
          'engineer_name', engineer_name,
          'engineer_role', engineer_role
        )) as acks
      FROM (
        SELECT 
          ea.scheme_id,
          LOWER(TRIM(ea.engineer_email)) as engineer_email,
          MAX(ea.engineer_name) as engineer_name,
          COALESCE(
            MAX(ced.engineer_role),
            CASE
              WHEN LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) = LOWER(TRIM(COALESCE(MAX(s.ee_civil_name), '')))
                OR LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%executive%'
                OR LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%ee%'
                THEN 'Executive Engineer (Civil)'
              WHEN LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%chief%' THEN 'Chief Engineer'
              WHEN LOWER(TRIM(COALESCE(MAX(ea.engineer_name), ''))) LIKE '%superintending%' THEN 'Superintending Engineer (SE)'
              ELSE 'DE/AE (Civil)'
            END
          ) as engineer_role
        FROM email_acknowledgements ea
        LEFT JOIN scheme_engineer_details s ON s.scheme_id = ea.scheme_id
        LEFT JOIN consolidated_email_dispatches ced 
          ON ced.dispatch_date = ea.sent_date 
         AND LOWER(TRIM(ced.engineer_email)) = LOWER(TRIM(ea.engineer_email))
         AND LOWER(TRIM(ced.engineer_name)) = LOWER(TRIM(ea.engineer_name))
        WHERE ea.alert_type IN ('Chlorine', 'Low Chlorine', 'High Chlorine')
          AND ea.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        GROUP BY ea.scheme_id, LOWER(TRIM(ea.engineer_email)), LOWER(TRIM(COALESCE(ea.engineer_name, '')))
        
        UNION
        
        SELECT 
          elem::text as scheme_id,
          LOWER(TRIM(ced.engineer_email)) as engineer_email,
          ced.engineer_name,
          ced.engineer_role
        FROM consolidated_email_dispatches ced,
             jsonb_array_elements_text(ced.scheme_ids) as elem
        WHERE ced.dispatch_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          AND ced.chlorine_alerts_count > 0
      ) sub
      WHERE scheme_id IN ('7940233', '20017217', '456654')
      GROUP BY scheme_id
    `;
    const r = await client.query(q);
    console.log('Results for schemes:', JSON.stringify(r.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}
check().catch(console.error);
