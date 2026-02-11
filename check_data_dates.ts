
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkDates() {
    const db = await storage.getDb();

    const tables = [
        { name: 'water_consumption_history', col: 'data_date' },
        { name: 'chlorine_history', col: 'chlorine_date' },
        { name: 'pressure_history', col: 'pressure_date' }
    ];

    for (const table of tables) {
        console.log(`\n--- ${table.name} ---`);
        const results = await db.execute(sql.raw(`
      SELECT DISTINCT ${table.col}
      FROM ${table.name}
      WHERE ${table.col} LIKE '%13%'
    `));

        console.log(results.rows.map(r => r[table.col]));
    }

    process.exit(0);
}

checkDates().catch(console.error);
