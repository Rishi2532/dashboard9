import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const name = '105 Villages RRWSS';
        const res = await pool.query(`
        SELECT 
            data_date, 
            lpcd_value,
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
            END as parsed_date
        FROM scheme_lpcd_data_history 
        WHERE scheme_name = $1
        ORDER BY parsed_date DESC NULLS LAST
    `, [name]);
        console.log(`Records for ${name}:`);
        res.rows.forEach(r => console.log(`Date: ${r.data_date} -> Parsed: ${r.parsed_date ? r.parsed_date.toISOString().split('T')[0] : 'FAILED'}, LPCD: ${r.lpcd_value}`));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
