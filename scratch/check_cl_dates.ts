import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDates() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      MIN(chlorine_date) as min_date,
      MAX(chlorine_date) as max_date,
      COUNT(DISTINCT chlorine_date) as unique_dates,
      COUNT(*) as total_rows
    FROM chlorine_history
  `);
  console.log("Chlorine history dates:", res.rows[0]);

  // Check what dates are present in recent days:
  const recent = await db.execute(sql`
    SELECT chlorine_date, COUNT(*) as cnt
    FROM chlorine_history
    GROUP BY chlorine_date
    ORDER BY chlorine_date DESC
    LIMIT 15;
  `);
  console.log("Recent chlorine dates:", recent.rows);

  process.exit(0);
}

checkDates().catch(console.error);
