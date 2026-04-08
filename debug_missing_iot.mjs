import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function diagnose() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('--- Detailed IoT Discrepancy Check ---');
        
        const iotStatuses = ['completed', 'fully-completed', 'fully completed', 'functionally completed'];
        const placeholders = iotStatuses.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
            SELECT scheme_id, region, district, fully_completion_scheme_status as status
            FROM scheme_status
            WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})
        `;
        
        const res = await pool.query(query, iotStatuses);
        
        console.log(`Total DB rows matching IoT statuses: ${res.rows.length}`);
        
        const uniqueIds = new Set(res.rows.map(r => r.scheme_id));
        console.log(`Unique Scheme IDs: ${uniqueIds.size}`);
        
        if (res.rows.length !== uniqueIds.size) {
            console.log('\n!!! DUPLICATE IDs FOUND !!!');
            const counts = {};
            res.rows.forEach(r => counts[r.scheme_id] = (counts[r.scheme_id] || 0) + 1);
            Object.entries(counts).filter(([_, c]) => c > 1).forEach(([id, c]) => {
                console.log(`- ID: ${id} appears ${c} times`);
            });
        }
        
        const noRegion = res.rows.filter(r => !r.region || r.region.trim() === '');
        console.log(`\nSchemes with NO region: ${noRegion.length}`);
        if (noRegion.length > 0) {
            noRegion.forEach(r => console.log(`- ID: ${r.scheme_id}, District: ${r.district}`));
        }
        
        const byRegion = {};
        res.rows.forEach(r => {
            const reg = r.region || 'UNKNOWN';
            byRegion[reg] = (byRegion[reg] || 0) + 1;
        });
        
        console.log('\nCount by Region:');
        Object.entries(byRegion).sort().forEach(([reg, count]) => {
            console.log(`- ${reg}: ${count}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
