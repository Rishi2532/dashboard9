import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Get fully completed IDs
    const statusRes = await pool.query(`
      SELECT scheme_id FROM scheme_status 
      WHERE LOWER(fully_completion_scheme_status) IN ('completed', 'fully-completed', 'fully completed')
    `);
    const ids = statusRes.rows.map(r => `'${r.scheme_id}'`).join(',');
    
    console.log(`Found ${statusRes.rows.length} fully completed schemes.`);
    
    let schemeIdFilter = "AND scheme_id IN (NULL)";
    if (ids.length > 0) {
      schemeIdFilter = `AND scheme_id IN (${ids})`;
    }

    // 2. Run Main Query with Filter
    const query = `
        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, scheme_id, block, lpcd_value, water_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
          ${schemeIdFilter}
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

    const res = await pool.query(query);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
