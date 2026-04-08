import { getDB } from './server/db.js';
import { schemeStatuses } from './shared/schema.js';

async function test() {
    console.log('Testing DB connection...');
    try {
        const db = await getDB();
        console.log('Connected!');
        const result = await db.select().from(schemeStatuses).limit(1);
        console.log('Success! Found 1 row.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

test();
