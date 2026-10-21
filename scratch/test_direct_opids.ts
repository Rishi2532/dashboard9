import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { generateRecentDateStrings } from './test_date_gen';

async function testIndexSpeed() {
  const db = await getDB();
  
  const opRes = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIds = opRes.rows.map((r: any) => String(r.scheme_id));
  const sqlOpIds = sql.join(opIds.map(id => sql`${id}`), sql`, `);

  const recentDates = generateRecentDateStrings('19-Oct', 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  console.time("Chlorine with Direct opIds");
  const clRes = await db.execute(sql`
    WITH dedup_cl AS (
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date)
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
        c.uploaded_at, c.id
      FROM chlorine_history c
      WHERE c.scheme_id IN (${sqlOpIds})
        AND c.chlorine_date IN (${sqlDateList})
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date, c.uploaded_at DESC, c.id DESC
    ),
    dedup_wc AS (
      SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      WHERE wc.scheme_id IN (${sqlOpIds})
        AND wc.data_date IN (${sqlDateList})
      ORDER BY wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date, wc.uploaded_at DESC, wc.id DESC
    )
    SELECT 
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
      wc.water_value
    FROM dedup_cl c
    LEFT JOIN dedup_wc wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      c.chlorine_date = wc.data_date
    )
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.uploaded_at DESC, c.id DESC
  `);
  console.timeEnd("Chlorine with Direct opIds");
  console.log(`Rows: ${clRes.rows.length}`);

  process.exit(0);
}

testIndexSpeed().catch(console.error);
