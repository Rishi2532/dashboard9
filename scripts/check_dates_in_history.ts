import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDatesInHistory() {
  const db = await getDB();

  console.log('--- water_scheme_data_history ---');
  const lpcdDates = await db.execute(sql`
    SELECT data_date, count(*) as count
    FROM water_scheme_data_history
    GROUP BY data_date
    ORDER BY count DESC
    LIMIT 20;
  `);
  console.table(lpcdDates.rows);

  console.log('--- chlorine_history ---');
  const clDates = await db.execute(sql`
    SELECT chlorine_date, count(*) as count
    FROM chlorine_history
    GROUP BY chlorine_date
    ORDER BY count DESC
    LIMIT 20;
  `);
  console.table(clDates.rows);

  console.log('--- pressure_history ---');
  const prDates = await db.execute(sql`
    SELECT pressure_date, count(*) as count
    FROM pressure_history
    GROUP BY pressure_date
    ORDER BY count DESC
    LIMIT 20;
  `);
  console.table(prDates.rows);

  process.exit(0);
}

checkDatesInHistory().catch(console.error);
