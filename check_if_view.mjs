import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_name = 'scheme_lpcd_data_history'");
        console.log('Table info:', res.rows);

        if (res.rows[0] && res.rows[0].table_type === 'VIEW') {
            const viewDef = await pool.query("SELECT view_definition FROM information_schema.views WHERE table_name = 'scheme_lpcd_data_history'");
            console.log('View definition (first 500 chars):');
            console.log(viewDef.rows[0].view_definition.substring(0, 500));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
