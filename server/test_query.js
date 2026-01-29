import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Logic from chlorine-routes.ts
  const query = `
        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, scheme_id, block, lpcd_value, water_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
          
          ORDER BY region, scheme_id, block, 
            CASE 
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
        )
        SELECT 
          region,
          COUNT(DISTINCT scheme_id || '-' || COALESCE(block, '')) as total_schemes
        FROM latest_scheme_data
        GROUP BY region
        ORDER BY region
      `;

  try {
    const res = await pool.query(query);
    res.rows.forEach(r => console.log(r.region));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
