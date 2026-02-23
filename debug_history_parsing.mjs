import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const query = `
        WITH history_parsed AS (
          SELECT 
            region, scheme_name,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date,
            CASE WHEN lpcd_value ~ '^[0-9.]+$' THEN lpcd_value::numeric ELSE NULL END as lpcd
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL AND data_date IS NOT NULL
        ),
        history_ranked AS (
          SELECT 
            region, scheme_name, lpcd, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_name ORDER BY parsed_date DESC) as rn
          FROM (
            SELECT DISTINCT ON (scheme_name, parsed_date)
              region, scheme_name, lpcd, parsed_date
            FROM history_parsed
            WHERE parsed_date IS NOT NULL
            ORDER BY scheme_name, parsed_date DESC
          ) deduped
        )
        SELECT * FROM history_ranked WHERE rn = 1 LIMIT 20
    `;

        const res = await pool.query(query);
        console.log('Most recent record per scheme (rn=1):');
        res.rows.forEach(r => console.log(`${r.scheme_name}: date=${r.parsed_date ? r.parsed_date.toISOString().split('T')[0] : 'null'}, lpcd=${r.lpcd}`));

        const countQuery = `
        WITH history_parsed AS (
          SELECT 
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date,
            CASE WHEN lpcd_value ~ '^[0-9.]+$' THEN lpcd_value::numeric ELSE NULL END as lpcd,
            scheme_name
          FROM scheme_lpcd_data_history
          WHERE data_date IS NOT NULL
        ),
        history_ranked AS (
          SELECT scheme_name, lpcd, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_name ORDER BY parsed_date DESC) as rn
          FROM (
            SELECT DISTINCT ON (scheme_name, parsed_date)
              scheme_name, lpcd, parsed_date
            FROM history_parsed
            WHERE parsed_date IS NOT NULL
            ORDER BY scheme_name, parsed_date DESC
          ) deduped
        )
        SELECT COUNT(*) FROM history_ranked WHERE rn = 1 AND lpcd < 55
    `;
        const res2 = await pool.query(countQuery);
        console.log('Schemes whose latest history record is below 55 LPCD:', res2.rows[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
