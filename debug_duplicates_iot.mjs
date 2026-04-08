import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const iotStatuses = ['completed', 'fully-completed', 'fully completed', 'functionally completed'];
        const placeholders = iotStatuses.map((_, i) => `$${i + 1}`).join(', ');
        const res = await pool.query(`SELECT scheme_id, region, fully_completion_scheme_status FROM scheme_status WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})`, iotStatuses);
        
        const ids = res.rows.map(r => r.scheme_id);
        const uniqueIds = new Set(ids);
        
        console.log('Total Rows:', ids.length);
        console.log('Unique IDs:', uniqueIds.size);
        
        const counts = {};
        ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
        
        const duplicates = Object.entries(counts).filter(([id, c]) => c > 1);
        if (duplicates.length > 0) {
            console.log('\nDuplicates Found:');
            duplicates.forEach(([id, c]) => {
                const rows = res.rows.filter(r => r.scheme_id === id);
                console.log(`- ID: ${id}, Count: ${c}`);
                rows.forEach(r => console.log(`  - Region: ${r.region}, Status: ${r.fully_completion_scheme_status}`));
            });
        } else {
            console.log('\nNo duplicate IDs found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

check();
