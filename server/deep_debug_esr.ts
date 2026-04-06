import { getDB } from './db';
import { schemeStatuses, waterConsumption, waterConsumptionHistory, waterSchemeData } from '../shared/schema';
import { eq, ilike, and } from 'drizzle-orm';

async function run() {
    try {
        const db = await getDB();
        const searchName = '%Paldhi%';
        console.log(`Searching for scheme matching: ${searchName}`);

        const schemes = await db.select().from(schemeStatuses).where(ilike(schemeStatuses.scheme_name, searchName));
        console.log(`Found ${schemes.length} schemes:`);
        schemes.forEach(s => console.log(` - ID: [${s.scheme_id}], Name: [${s.scheme_name}]`));

        for (const s of schemes) {
            console.log(`\nChecking villages for Scheme ID [${s.scheme_id}]:`);
            const villages = await db.select({ village: waterSchemeData.village_name }).from(waterSchemeData).where(eq(waterSchemeData.scheme_id, s.scheme_id)).groupBy(waterSchemeData.village_name);
            console.log(` - Villages found: ${villages.map(v => v.village).join(', ')}`);

            for (const v of villages) {
                console.log(`\n  Checking ESRs for Village [${v.village}]:`);
                
                const esrList = await db.select({ esr_name: waterConsumption.esr_name }).from(waterConsumption).where(and(eq(waterConsumption.scheme_id, s.scheme_id), eq(waterConsumption.village_name, v.village)));
                
                if (esrList.length === 0) {
                   console.log(`   - ❌ No ESR found with exact Scheme ID and Village Name in water_consumption.`);
                   
                   // Try finding by just village name to see if names differ
                   const partialMatch = await db.select({ esr_name: waterConsumption.esr_name, scheme_id: waterConsumption.scheme_id, village_name: waterConsumption.village_name }).from(waterConsumption).where(ilike(waterConsumption.village_name, `%${v.village}%`)).limit(5);
                   
                   if (partialMatch.length > 0) {
                       console.log(`     - 🔎 Partial matches found in water_consumption:`);
                       partialMatch.forEach((row: any) => console.log(`       - ID in DB: [${row.scheme_id}] / Village in DB: [${row.village_name}] / ESR: [${row.esr_name}]`));
                   }
                } else {
                    esrList.forEach((row: any) => console.log(`   - ✅ ESR: ${row.esr_name}`));
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

run();
