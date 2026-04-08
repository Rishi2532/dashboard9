import { getDB } from './server/db.js';
import { schemeStatuses } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function diagnose() {
    try {
        const db = await getDB();
        console.log('--- IoT Scheme Diagnosis ---');

        const allRows = await db.select({
            scheme_id: schemeStatuses.scheme_id,
            status: schemeStatuses.fully_completion_scheme_status,
            region: schemeStatuses.region,
            district: schemeStatuses.district
        }).from(schemeStatuses);

        console.log(`Total rows in scheme_status: ${allRows.length}`);

        const statusCounts = {};
        const iotStatuses = ['completed', 'fully-completed', 'fully completed', 'functionally completed'];
        
        const completedSchemes = [];

        allRows.forEach(row => {
            const s = (row.status || '').toLowerCase().trim();
            statusCounts[s] = (statusCounts[s] || 0) + 1;
            
            if (iotStatuses.includes(s)) {
                completedSchemes.push(row);
            }
        });

        console.log('\nStatus Distribution (trimmed, lowercase):');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`- "${status}": ${count}`);
        });

        console.log(`\nCompleted Schemes Found: ${completedSchemes.length}`);
        
        const uniqueIds = new Set(completedSchemes.map(s => s.scheme_id));
        console.log(`Unique Scheme IDs in completed set: ${uniqueIds.size}`);

        const missingRegion = completedSchemes.filter(s => !s.region || s.region.trim() === '');
        console.log(`Completed Schemes with MISSING regions: ${missingRegion.length}`);
        if (missingRegion.length > 0) {
            console.log('Missing region sample IDs:', missingRegion.slice(0, 5).map(s => s.scheme_id));
        }

        const nearMatches = allRows.filter(row => {
            const s = (row.status || '').toLowerCase().trim();
            return !iotStatuses.includes(s) && (s.includes('comp') || s.includes('instr'));
        });
        console.log(`\n"Near Matches": ${nearMatches.length}`);
        nearMatches.forEach(nm => console.log(`- ID: ${nm.scheme_id}, Status: "${nm.status}"`));

        process.exit(0);
    } catch (err) {
        console.error('Error during diagnosis:', err);
        process.exit(1);
    }
}

diagnose();
