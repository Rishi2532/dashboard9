import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const delRes = await db.execute(sql`DELETE FROM consolidated_email_dispatches WHERE id >= 340;`);
  console.log("Deleted records:", delRes);

  const dates = await db.execute(sql`
    SELECT dispatch_date::text, count(*) 
    FROM consolidated_email_dispatches 
    GROUP BY dispatch_date::text 
    ORDER BY dispatch_date::text DESC;
  `);
  console.log("Remaining dispatches by date:", dates.rows);

  process.exit(0);
}

run();
