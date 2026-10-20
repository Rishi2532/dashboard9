import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkVillageHistory() {
  const db = await getDB();

  const q = await db.execute(sql`
    SELECT scheme_id, village_name, count(DISTINCT data_date) as distinct_dates,
           array_agg(DISTINCT data_date) as dates
    FROM water_scheme_data_history
    GROUP BY scheme_id, village_name
    ORDER BY distinct_dates DESC
    LIMIT 5;
  `);

  console.log('Sample villages with most dates in water_scheme_data_history:');
  console.dir(q.rows, { depth: null });

  process.exit(0);
}

checkVillageHistory().catch(console.error);
