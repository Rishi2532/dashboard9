
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
    connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' 
});

async function query() {
    try {
        const res = await pool.query(`
            SELECT 
                scheme_id, 
                scheme_name, 
                block, 
                lpcd_value, 
                data_date, 
                uploaded_at 
            FROM scheme_lpcd_data_history 
            WHERE scheme_id = '20013367' 
            ORDER BY uploaded_at DESC 
            LIMIT 10
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

query();
