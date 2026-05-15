
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkCounts() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const lpcdCount = await client.query("SELECT COUNT(DISTINCT (scheme_id, block)) FROM scheme_lpcd");
    console.log('Total schemes in scheme_lpcd:', lpcdCount.rows[0].count);

    const historyCount = await client.query("SELECT COUNT(DISTINCT (scheme_id, block)) FROM scheme_lpcd_data_history");
    console.log('Total schemes in history:', historyCount.rows[0].count);

    const parsedHistoryCount = await client.query(`
      WITH ranked_history AS (
          SELECT 
            h.scheme_id, h.block, h.lpcd_value, h.total_population, h.data_date, h.uploaded_at,
            CASE 
              WHEN h.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN h.data_date::date
              WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
              WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(h.data_date || '-' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(h.uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(h.data_date || '-' || (TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(h.data_date || '-' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
        )
        SELECT COUNT(DISTINCT (scheme_id, block)) FROM ranked_history WHERE parsed_date IS NOT NULL
    `);
    console.log('Total schemes in history with parsed_date:', parsedHistoryCount.rows[0].count);

    // Find the one that is missing from parsed history
    const missing = await client.query(`
      SELECT scheme_id, block, scheme_name FROM scheme_lpcd
      EXCEPT
      SELECT scheme_id, block, scheme_name FROM (
        WITH ranked_history AS (
          SELECT 
            h.scheme_id, h.block, h.scheme_name,
            CASE 
              WHEN h.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN h.data_date::date
              WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
              WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(h.data_date || '-' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(h.uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(h.data_date || '-' || (TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(h.data_date || '-' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
        )
        SELECT scheme_id, block, scheme_name FROM ranked_history WHERE parsed_date IS NOT NULL
      ) as sub
    `);
    console.log('Schemes missing from parsed history:', missing.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

checkCounts();
