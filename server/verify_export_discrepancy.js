import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const metricFlag = 'is_above_55';
    const daysNum = 7;

    // Use the exact same query logic as the updated export route
    const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
            scheme_id,
            COALESCE(block, '') as block,
            lpcd_value::numeric as lpcd_value,
            data_date,
            CASE 
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
          WHERE data_date IS NOT NULL
            AND lpcd_value IS NOT NULL
          ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id, block,
            lpcd_value, data_date, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 55 THEN 1 ELSE 0 END as is_above_55
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT *,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, ${metricFlag} ORDER BY rn) as grp
          FROM ranked WHERE rn <= 30
        ),
        first_row_groups AS (
          SELECT scheme_id, block, grp
          FROM with_groups 
          WHERE rn = 1 AND ${metricFlag} = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.scheme_id, wg.block,
            COUNT(*) as consecutive_days
          FROM with_groups wg
          INNER JOIN first_row_groups frg 
            ON wg.scheme_id = frg.scheme_id 
            AND wg.block = frg.block 
            AND wg.grp = frg.grp
          WHERE wg.${metricFlag} = 1
          GROUP BY wg.scheme_id, wg.block
        )
        SELECT COUNT(*) as total_count
        FROM consecutive_counts
        WHERE consecutive_days >= $1
    `;

    const res = await client.query(query, [daysNum]);
    console.log(`Total Schemes >55 LPCD for 1 consecutive day (No Filter): ${res.rows[0].total_count}`);

    // With fullyCompleted filter
    const filteredQuery = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
            scheme_id,
            COALESCE(block, '') as block,
            lpcd_value::numeric as lpcd_value,
            data_date,
            CASE 
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
          WHERE data_date IS NOT NULL
            AND lpcd_value IS NOT NULL
            AND h.scheme_id IN (
              SELECT scheme_id FROM scheme_status 
              WHERE LOWER(fully_completion_scheme_status) IN ('completed', 'fully-completed', 'fully completed')
            )
          ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id, block,
            lpcd_value, data_date, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 55 THEN 1 ELSE 0 END as is_above_55
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT *,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, ${metricFlag} ORDER BY rn) as grp
          FROM ranked WHERE rn <= 30
        ),
        first_row_groups AS (
          SELECT scheme_id, block, grp
          FROM with_groups 
          WHERE rn = 1 AND ${metricFlag} = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.scheme_id, wg.block,
            COUNT(*) as consecutive_days
          FROM with_groups wg
          INNER JOIN first_row_groups frg 
            ON wg.scheme_id = frg.scheme_id 
            AND wg.block = frg.block 
            AND wg.grp = frg.grp
          WHERE wg.${metricFlag} = 1
          GROUP BY wg.scheme_id, wg.block
        )
        SELECT COUNT(*) as total_count
        FROM consecutive_counts
        WHERE consecutive_days >= $1
    `;
    const resFiltered = await client.query(filteredQuery, [daysNum]);
    console.log(`Total Schemes >55 LPCD for 1 consecutive day (Fully Completed Only): ${resFiltered.rows[0].total_count}`);

  } finally {
    client.release();
    pool.end();
  }
}

verify();
