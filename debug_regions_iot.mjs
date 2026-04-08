import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function diagnose() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('--- IoT Region Breakdown ---');
        
        const iotStatuses = ['completed', 'fully-completed', 'fully completed', 'functionally completed'];
        const placeholders = iotStatuses.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
            SELECT region, district, COUNT(*) as count
            FROM scheme_status
            WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})
            GROUP BY region, district
            ORDER BY region, district
        `;
        
        const res = await pool.query(query, iotStatuses);
        
        console.log('Region/District Breakdown:');
        let total = 0;
        res.rows.forEach(r => {
            console.log(`- Region: "${r.region}", District: "${r.district}", Count: ${r.count}`);
            total += parseInt(r.count);
        });
        console.log(`\nGrand Total: ${total}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

diagnose();
