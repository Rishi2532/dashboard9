import { getDB } from './server/db.js';
import { schemeStatuses, waterConsumption, waterConsumptionHistory } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function run() {
    try {
        const db = await getDB();
        const schemeName = 'Paldhi (bk& Kh) RR Tal DHARANGAON';
        const schemes = await db.select().from(schemeStatuses).where(eq(schemeStatuses.scheme_name, schemeName));
        
        console.log('--- Scheme(s) found ---');
        console.log(JSON.stringify(schemes, null, 2));

        if (schemes.length > 0) {
            const schemeId = schemes[0].scheme_id;
            console.log('\n--- Scheme ID:', schemeId);
            
            // Check villages
            const villagesResult = await db.execute(`SELECT DISTINCT village_name FROM water_consumption WHERE scheme_id = ?`, [schemeId]);
            console.log('\n--- Villages in water_consumption:', JSON.stringify(villagesResult.rows, null, 2));
            
            if (villagesResult.rows.length > 0) {
                const villageName = villagesResult.rows[0].village_name;
                console.log('\n--- ESRs for Village:', villageName);
                
                const esrsResult = await db.execute(`
                    SELECT esr_name FROM water_consumption 
                    WHERE scheme_id = ? AND village_name = ?
                    UNION
                    SELECT esr_name FROM water_consumption_history 
                    WHERE scheme_id = ? AND village_name = ?
                `, [schemeId, villageName, schemeId, villageName]);
                
                console.log('ESRs found:', JSON.stringify(esrsResult.rows, null, 2));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

run();
