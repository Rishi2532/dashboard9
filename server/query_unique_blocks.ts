
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const db = await getDB();

        const query = sql`
            SELECT COUNT(DISTINCT block) as count 
            FROM scheme_status 
            WHERE fully_completion_scheme_status IN ('In Progress', 'Fully Completed')
        `;

        const result = await db.execute(query);
        const count = result.rows[0].count;

        console.log('RESULT_START');
        console.log('UNIQUE_BLOCK_COUNT:', count);
        console.log('RESULT_END');

        process.exit(0);
    } catch (error) {
        console.error('Error querying database:', error);
        process.exit(1);
    }
}

main();
