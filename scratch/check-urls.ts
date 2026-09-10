import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function checkDashboardUrls() {
  const db = await getDB();
  const wcRows = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, dashboard_url
    FROM water_consumption
    WHERE lower(region) LIKE '%amravati%' AND dashboard_url IS NOT NULL
    LIMIT 5
  `);
  console.log('Sample water_consumption dashboard_url:', wcRows.rows);

  const histWithUrl = await db.execute(sql`
    SELECT count(*) as cnt
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%' AND dashboard_url IS NOT NULL
  `);
  console.log('Count of history rows with dashboard_url:', histWithUrl.rows);

  const sampleHist = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, dashboard_url
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%' AND dashboard_url IS NOT NULL
    LIMIT 5
  `);
  console.log('Sample history dashboard_url:', sampleHist.rows);

  process.exit(0);
}

checkDashboardUrls();
