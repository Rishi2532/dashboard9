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
            scheme_name,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN TO_DATE(data_date || '-2025', 'DD-Mon-YYYY')
              ELSE NULL 
            END as parsed_date,
            CASE WHEN lpcd_value ~ '^[0-9.]+$' THEN lpcd_value::numeric ELSE NULL END as lpcd
          FROM scheme_lpcd_data_history
          WHERE data_date IS NOT NULL
        ),
        latest_records AS (
          SELECT DISTINCT ON (scheme_name)
            scheme_name, lpcd, parsed_date
          FROM history_parsed
          WHERE parsed_date IS NOT NULL
          ORDER BY scheme_name, parsed_date DESC
        )
        SELECT 
            COUNT(*) as total_schemes,
            COUNT(CASE WHEN lpcd < 55 THEN 1 END) as latest_below_55
        FROM latest_records
    `;

        const res = await pool.query(query);
        console.log(res.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
