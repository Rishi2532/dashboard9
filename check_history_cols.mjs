import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scheme_lpcd_data_history'");
        console.log('Columns:');
        res.rows.forEach(r => console.log(r));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
