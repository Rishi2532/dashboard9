import { getDB } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT dispatch_date::text, count(*) as count
    FROM consolidated_email_dispatches
    GROUP BY dispatch_date
    ORDER BY dispatch_date DESC
  `);
  console.log('Distinct dispatch dates and counts:', res.rows);

  const eaRes = await db.execute(sql`
    SELECT sent_date::text, count(*) as count
    FROM email_acknowledgements
    GROUP BY sent_date
    ORDER BY sent_date DESC
    LIMIT 5
  `);
  console.log('email_acknowledgements dates and counts:', eaRes.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
