import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query("SELECT DISTINCT scheme_name FROM scheme_lpcd_data_history WHERE scheme_name LIKE '%105 Villages%' LIMIT 10");
        console.log('Schemes matching %105 Villages%:');
        res.rows.forEach(r => console.log(`'${r.scheme_name}'`));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
