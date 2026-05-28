import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const resStatus = await db.execute(sql.raw('SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status'));
  const resWater = await db.execute(sql.raw('SELECT COUNT(DISTINCT scheme_id) as count FROM water_scheme_data'));
  console.log('--- DB COUNTS ---');
  console.log(`scheme_status unique count: ${resStatus.rows[0].count}`);
  console.log(`water_scheme_data unique count: ${resWater.rows[0].count}`);
}

main().catch(console.error);
