import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { findElementsByTemplate, fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function checkVillages() {
  const db = await getDB();
  
  // 1. Check DB for villages in Amravati
  const dbVillages = await db.execute(sql`
    SELECT 
      w.region, w.circle, w.division, w.sub_division, w.block, w.scheme_id, w.scheme_name, w.village_name, w.population, w.number_of_esr, w.dashboard_url,
      COALESCE(ss.agency_type, 'MJP') as agency_type
    FROM (
      SELECT DISTINCT ON (scheme_id, village_name)
        region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, population, number_of_esr, dashboard_url
      FROM water_scheme_data
      WHERE lower(region) LIKE '%amravati%'
    ) w
    LEFT JOIN (
      SELECT DISTINCT ON (scheme_id) scheme_id, agency_type
      FROM scheme_status
      WHERE agency_type IS NOT NULL
    ) ss ON ss.scheme_id = w.scheme_id
    ORDER BY w.circle, w.division, w.sub_division, w.block, w.scheme_id, w.village_name
  `);

  console.log(`Villages found in water_scheme_data for Amravati: ${dbVillages.rows.length}`);

  // 2. Also check water_scheme_data_history count
  const histVillages = await db.execute(sql`
    SELECT count(DISTINCT (scheme_id || '_' || village_name)) as cnt
    FROM water_scheme_data_history
    WHERE lower(region) LIKE '%amravati%'
  `);
  console.log(`Unique villages in water_scheme_data_history:`, histVillages.rows);

  if (dbVillages.rows.length > 0) {
    console.log('Sample village row:', dbVillages.rows[0]);
  }

  process.exit(0);
}

checkVillages().catch(err => {
  console.error(err);
  process.exit(1);
});
