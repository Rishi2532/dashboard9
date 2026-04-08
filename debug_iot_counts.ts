import { getDB } from './server/db';
import { schemeStatuses } from './shared/schema';
import { sql } from 'drizzle-orm';

async function diagnose() {
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
    const otherSchemes = [];

    allRows.forEach(row => {
        const s = (row.status || '').toLowerCase().trim();
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        
        if (iotStatuses.includes(s)) {
            completedSchemes.push(row);
        } else if (row.status) {
            otherSchemes.push(row);
        }
    });

    console.log('\nStatus Distribution (trimmed, lowercase):');
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`- "${status}": ${count}`);
    });

    console.log(`\nCompleted Schemes Found (matches current logic): ${completedSchemes.length}`);
    
    // Check for duplicates in the completed set
    const ids = completedSchemes.map(s => s.scheme_id);
    const uniqueIds = new Set(ids);
    console.log(`Unique Scheme IDs in completed set: ${uniqueIds.size}`);

    if (ids.length !== uniqueIds.size) {
        const diff = ids.length - uniqueIds.size;
        console.log(`!!! Found ${diff} duplicate IDs! These will be consolidated in the dashboard.`);
        
        const counts = {};
        ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
        const dups = Object.entries(counts).filter(([_, c]) => c > 1);
        console.log('Duplicate IDs sample:', dups.slice(0, 5));
    }

    // Check for missing regions
    const missingRegion = completedSchemes.filter(s => !s.region || s.region.trim() === '');
    console.log(`\nCompleted Schemes with MISSING regions: ${missingRegion.length}`);
    if (missingRegion.length > 0) {
        console.log('Missing region sample IDs:', missingRegion.slice(0, 5).map(s => s.scheme_id));
    }

    // Check for "near matches" that might be missing (e.g. typos)
    const nearMatches = allRows.filter(row => {
        const s = (row.status || '').toLowerCase().trim();
        return !iotStatuses.includes(s) && (s.includes('comp') || s.includes('instr'));
    });
    console.log(`\n"Near Matches" (not in current list but sound completed): ${nearMatches.length}`);
    nearMatches.forEach(nm => console.log(`- ID: ${nm.scheme_id}, Status: "${nm.status}"`));
}

diagnose().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
