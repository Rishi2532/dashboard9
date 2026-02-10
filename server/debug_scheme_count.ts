
import { getDB } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const db = await getDB();

        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM scheme_status`);
        console.log('TOTAL_ROWS:', countResult.rows[0].count);

        const distinctIdResult = await db.execute(sql`SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status`);
        console.log('DISTINCT_ID_COUNT:', distinctIdResult.rows[0].count);

        const duplicateIdResult = await db.execute(sql`SELECT scheme_id, COUNT(*) FROM scheme_status GROUP BY scheme_id HAVING COUNT(*) > 1`);
        console.log('DUPLICATE_IDS:', duplicateIdResult.rows);

        if (duplicateIdResult.rows.length > 0) {
            const id = duplicateIdResult.rows[0].scheme_id;
            const detailsResult = await db.execute(sql`SELECT scheme_id, scheme_name, region, block FROM scheme_status WHERE scheme_id = ${id}`);
            console.log('DETAILS_FOR_DUPLICATE:', detailsResult.rows);
        }

        const distinctNameResult = await db.execute(sql`SELECT COUNT(DISTINCT scheme_name) as count FROM scheme_status`);
        console.log('DISTINCT_NAME_COUNT:', distinctNameResult.rows[0].count);

        process.exit(0);
    } catch (error) {
        console.error('Error querying database:', error);
        process.exit(1);
    }
}

main();
