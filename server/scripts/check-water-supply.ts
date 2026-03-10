import { getDB } from '../db';
import { schemeStatuses } from '../../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
    const db = await getDB();
    const res = await db.select({ value: schemeStatuses.water_supply, count: sql`count(*)` }).from(schemeStatuses).groupBy(schemeStatuses.water_supply);
    console.log('Water Supply Values in DB:');
    console.log(res);
    process.exit(0);
}

main().catch(console.error);
