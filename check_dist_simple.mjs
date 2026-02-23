import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query(`
        SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN lpcd_value ~ '^[0-9.]+$' AND lpcd_value::numeric < 55 THEN 1 END) as below_55,
            COUNT(CASE WHEN lpcd_value ~ '^[0-9.]+$' AND lpcd_value::numeric >= 55 THEN 1 END) as above_55
        FROM scheme_lpcd_data_history
    `);
        console.log('Overall status distribution (raw):');
        console.log(res.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
