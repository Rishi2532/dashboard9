import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { schemeStatuses } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function check() {
  const sql_db = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql_db);
  try {
    const res = await db.select({
      water_supply: schemeStatuses.water_supply,
      v_sum: sql`SUM(${schemeStatuses.fully_completed_villages})`,
      e_sum: sql`SUM(${schemeStatuses.no_fully_completed_esr})`,
      count: sql`COUNT(*)`
    }).from(schemeStatuses).groupBy(schemeStatuses.water_supply);
    console.log(JSON.stringify(res, null, 2));
  } finally {
    await sql_db.end();
  }
}

check();
