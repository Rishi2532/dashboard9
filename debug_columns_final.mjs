import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function checkColumns() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'scheme_status'
            ORDER BY ordinal_position
        `);
        console.log(JSON.stringify(res.rows.map(r => r.column_name)));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

checkColumns();
