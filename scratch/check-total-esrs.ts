import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function checkTotalUniqueESRs() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT 
      w.region,
      w.circle,
      w.division,
      w.sub_division,
      w.block,
      w.scheme_id,
      w.scheme_name,
      w.village_name,
      w.esr_name,
      w.esr_capacity,
      COALESCE(ss.agency_type, 'MJP') as agency_type,
      w.dashboard_url
    FROM (
      SELECT DISTINCT ON (scheme_id, village_name, esr_name)
        region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name, esr_capacity, dashboard_url
      FROM water_consumption_history
      WHERE lower(region) LIKE '%amravati%'
    ) w
    LEFT JOIN (
      SELECT DISTINCT ON (scheme_id) scheme_id, agency_type
      FROM scheme_status
      WHERE agency_type IS NOT NULL
    ) ss ON ss.scheme_id = w.scheme_id
    ORDER BY w.circle, w.division, w.sub_division, w.block, w.scheme_id, w.village_name, w.esr_name
  `);

  console.log(`Unique ESRs for Amravati in DB: ${res.rows.length}`);
  const withUrl = res.rows.filter((r: any) => r.dashboard_url && r.dashboard_url.includes('asset='));
  console.log(`Unique ESRs with valid asset dashboard_url: ${withUrl.length}`);
  process.exit(0);
}

checkTotalUniqueESRs();
