import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testOperationalByRegion() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT
      ss.region,
      COUNT(DISTINCT ss.scheme_id) as operational_schemes,
      COUNT(DISTINCT (ws.scheme_id, LOWER(TRIM(ws.village_name)))) as operational_villages,
      COUNT(DISTINCT (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))) as operational_esrs
    FROM scheme_status ss
    LEFT JOIN water_scheme_data ws ON ws.scheme_id = ss.scheme_id
    LEFT JOIN chlorine_data c ON c.scheme_id = ss.scheme_id
    WHERE ss.water_supply = 'Yes'
    GROUP BY ss.region;
  `);
  console.log('Operational by region:');
  console.table(res.rows);

  process.exit(0);
}

testOperationalByRegion().catch(console.error);
