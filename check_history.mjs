import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query("SELECT lpcd_value, data_date, pg_typeof(lpcd_value) as lpcd_type, pg_typeof(data_date) as date_type FROM scheme_lpcd_data_history LIMIT 10");
        console.log('Sample data with types:');
        res.rows.forEach(r => console.log(r));

        const dateFormats = await pool.query(`
      SELECT data_date, count(*) 
      FROM scheme_lpcd_data_history 
      GROUP BY data_date 
      LIMIT 10
    `);
        console.log('Sample date formats:', dateFormats.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
