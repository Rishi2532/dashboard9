import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { generateRecentDateStrings } from './test_date_gen';

async function testBothFast() {
  const db = await getDB();
  
  const opRes = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIds = opRes.rows.map((r: any) => String(r.scheme_id));
  const sqlOpIds = sql.join(opIds.map(id => sql`${id}`), sql`, `);

  const recentDates = generateRecentDateStrings('19-Oct', 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  console.time("Pressure with Direct opIds");
  const prRes = await db.execute(sql`
    WITH dedup_pr AS (
      SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date)
        p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
        p.uploaded_at, p.id
      FROM pressure_history p
      WHERE p.scheme_id IN (${sqlOpIds})
        AND p.pressure_date IN (${sqlDateList})
      ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date, p.uploaded_at DESC, p.id DESC
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
      p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
      wc.water_value
    FROM dedup_pr p
    LEFT JOIN dedup_wc wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      p.pressure_date = wc.data_date
    )
    ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.uploaded_at DESC, p.id DESC
  `);
  console.timeEnd("Pressure with Direct opIds");
  console.log(`Pressure Rows: ${prRes.rows.length}`);

  process.exit(0);
}

testBothFast().catch(console.error);
