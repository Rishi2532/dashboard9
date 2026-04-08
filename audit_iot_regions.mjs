import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function diagnose() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('--- IoT Region Audit ---');
        
        const iotStatuses = ['completed', 'fully-completed', 'fully completed', 'functionally completed'];
        const placeholders = iotStatuses.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
            SELECT scheme_id, region, fully_completion_scheme_status as status
            FROM scheme_status
            WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})
        `;
        
        const res = await pool.query(query, iotStatuses);
        
        console.log(`Total Found: ${res.rows.length}`);
        
        const regionCounts = {};
        res.rows.forEach(r => {
            const reg = (r.region || 'NULL').trim();
            regionCounts[reg] = (regionCounts[reg] || 0) + 1;
            if (reg === 'NULL' || reg === '') {
                console.log(`- Missing Region for ID: ${r.scheme_id}`);
            }
        });
        
        console.log('\nRegion Counts:');
        Object.entries(regionCounts).forEach(([reg, count]) => {
            console.log(`- "${reg}": ${count}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

diagnose();
