
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const db = await getDB();
        const result = await db.execute(sql`SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status`);
        console.log('UNIQUE_SCHEME_COUNT:', result.rows[0].count);
        process.exit(0);
    } catch (error) {
        console.error('Error querying scheme count:', error);
        process.exit(1);
    }
}

main();
