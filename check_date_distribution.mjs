import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const query = `
        SELECT data_date, count(*) 
        FROM scheme_lpcd_data_history 
        GROUP BY data_date 
        ORDER BY count(*) DESC 
        LIMIT 50
    `;

        const res = await pool.query(query);
        console.log('Top 50 data_date values:');
        res.rows.forEach(r => console.log(`'${r.data_date}': ${r.count}`));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
