import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const name = '105 Villages RRWSS (Amravati)';
        const res = await pool.query("SELECT data_date, lpcd_value, uploaded_at FROM scheme_lpcd_data_history WHERE scheme_name = $1 ORDER BY id DESC", [name]);
        console.log(`Records for ${name}:`);
        res.rows.forEach(r => console.log(r));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
