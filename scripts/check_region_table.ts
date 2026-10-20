import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkRegionTable() {
  const db = await getDB();

  const regRows = await db.execute(sql`
    SELECT * FROM region;
  `);
  console.log('Region table:');
  console.table(regRows.rows);

  process.exit(0);
}

checkRegionTable().catch(console.error);
