import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const res = await db.execute(sql`SELECT * FROM chlorine_data WHERE scheme_name ILIKE '%20029079%' LIMIT 1`);
  console.log(res.rows[0]);
  process.exit(0);
}

run();
