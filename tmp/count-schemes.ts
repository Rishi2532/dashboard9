import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql.raw('SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status'));
  console.log(`There are ${res.rows[0].count} unique schemes in the scheme_status table.`);
}

main().catch(console.error);
