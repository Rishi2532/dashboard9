import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        console.log('Step 3a: history_parsed only');
        const step3a = await pool.query(`
        WITH history_parsed AS (
          SELECT 
            scheme_name,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              ELSE NULL 
            END as parsed_date,
            CASE WHEN lpcd_value ~ '^[0-9.]+$' THEN lpcd_value::numeric ELSE NULL END as lpcd
          FROM scheme_lpcd_data_history
        )
        SELECT * FROM history_parsed LIMIT 1
    `);
        console.log('Step 3a successful');

        console.log('Step 3b: ROW_NUMBER without complex partition');
        const step3b = await pool.query(`
        WITH history_parsed AS (
          SELECT 
            scheme_name,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history
        )
        SELECT 
            scheme_name, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_name ORDER BY parsed_date DESC) as rn
        FROM history_parsed
        WHERE parsed_date IS NOT NULL
        LIMIT 1
    `);
        console.log('Step 3b successful');

    } catch (err) {
        console.error('FAILED:');
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
