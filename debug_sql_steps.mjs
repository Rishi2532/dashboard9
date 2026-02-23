import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        console.log('Step 1: Raw data check');
        const step1 = await pool.query('SELECT data_date, lpcd_value FROM scheme_lpcd_data_history LIMIT 1');
        console.log('Step 1 successful');

        console.log('Step 2: Parsing check');
        const step2 = await pool.query(`
        SELECT 
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(CURRENT_DATE, 'YYYY'), 'DD-Mon-YYYY') > (CURRENT_DATE + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(CURRENT_DATE, 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(CURRENT_DATE, 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
        FROM scheme_lpcd_data_history 
        LIMIT 1
    `);
        console.log('Step 2 successful');

        console.log('Step 3: Ranking check');
        const step3 = await pool.query(`
        WITH history_parsed AS (
          SELECT 
            scheme_name,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              ELSE NULL 
            END as parsed_date,
            CASE WHEN lpcd_value ~ '^[0-9.]+$' THEN lpcd_value::numeric ELSE NULL END as lpcd
          FROM scheme_lpcd_data_history
        )
        SELECT 
            scheme_name, lpcd, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_name ORDER BY parsed_date DESC) as rn
        FROM history_parsed
        WHERE parsed_date IS NOT NULL
        LIMIT 1
    `);
        console.log('Step 3 successful');

        console.log('Step 4: Streak Group check (The likely culprit)');
        const step4 = await pool.query(`
        WITH history_ranked AS (
          SELECT 1 as rn, 10.0 as lpcd, 'test' as scheme_name
        )
        SELECT
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_name, (lpcd < 55) ORDER BY rn) as grp
        FROM history_ranked
    `);
        console.log('Step 4 successful');

    } catch (err) {
        console.error('FAILED at some step:');
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
