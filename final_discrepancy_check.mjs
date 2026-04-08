import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function diagnose() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('--- Final Discrepancy Check ---');
        
        const iotStatuses = ['completed', 'fully-completed', 'fully completed', 'functionally completed'];
        const placeholders = iotStatuses.map((_, i) => `$${i + 1}`).join(', ');
        
        // Let's first check WHAT COLUMNS WE HAVE to avoid the error
        const colRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scheme_status'");
        const columns = colRes.rows.map(r => r.column_name);
        console.log('Actual columns in table:', columns.join(', '));

        const hasRegion = columns.includes('region');
        const hasStatus = columns.includes('fully_completion_scheme_status');
        const hasId = columns.includes('scheme_id');

        if (!hasId || !hasStatus) {
            console.error('CRITICAL ERROR: scheme_id or fully_completion_scheme_status missing!');
            return;
        }

        const query = `
            SELECT scheme_id ${hasRegion ? ', region' : ''}
            FROM scheme_status
            WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})
        `;
        
        const res = await pool.query(query, iotStatuses);
        console.log(`Total rows matching IoT criteria: ${res.rows.length}`);
        
        const uniqueIds = new Set(res.rows.map(r => r.scheme_id));
        console.log(`Unique Scheme IDs: ${uniqueIds.size}`);

        if (hasRegion) {
            const noRegion = res.rows.filter(r => !r.region || r.region.trim() === '');
            console.log(`Schemes with NO region: ${noRegion.length}`);
            if (noRegion.length > 0) {
                console.log('IDs with no region:', noRegion.map(r => r.scheme_id));
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

diagnose();
