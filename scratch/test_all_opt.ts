import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import { generateRecentDateStrings } from './test_date_gen';

async function testAllOptimized() {
  const db = await getDB();
  
  // 1. Get latest date
  const latestDateRes = await db.execute(sql`
    SELECT COALESCE(
      (SELECT chlorine_date_day_7 FROM chlorine_data WHERE chlorine_date_day_7 IS NOT NULL LIMIT 1),
      (SELECT pressure_date_day_7 FROM pressure_data WHERE pressure_date_day_7 IS NOT NULL LIMIT 1),
      (SELECT lpcd_date_day7 FROM water_scheme_data WHERE lpcd_date_day7 IS NOT NULL LIMIT 1),
      '19-Oct'
    ) as latest_date
  `);
  const rawLatest = latestDateRes.rows?.[0]?.latest_date || '19-Oct';
  const recentDates = generateRecentDateStrings(String(rawLatest), 35);
  const sqlDateList = sql.join(recentDates.map(d => sql`${d}`), sql`, `);

  console.time("All 4 Queries Total");

  // 1. LPCD Query
  console.time("1. LPCD");
  const lpcdRes = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    )
    SELECT DISTINCT ON (h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date)
      h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    JOIN op_schemes ss ON ss.scheme_id = h.scheme_id
    WHERE h.data_date IN (${sqlDateList})
    ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.data_date, h.uploaded_at DESC, h.id DESC
  `);
  console.timeEnd("1. LPCD");
  console.log(`LPCD rows: ${lpcdRes.rows.length}`);

  // 2. Chlorine Query
  console.time("2. Chlorine");
  const clRes = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    dedup_cl AS (
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date)
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
        c.uploaded_at, c.id
      FROM chlorine_history c
      JOIN op_schemes ss ON ss.scheme_id = c.scheme_id
      WHERE c.chlorine_date IN (${sqlDateList})
      ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date, c.uploaded_at DESC, c.id DESC
    ),
    dedup_wc AS (
      SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      JOIN op_schemes ss ON ss.scheme_id = wc.scheme_id
      WHERE wc.data_date IN (${sqlDateList})
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
  console.timeEnd("2. Chlorine");
  console.log(`Chlorine rows: ${clRes.rows.length}`);

  // 3. Pressure Query
  console.time("3. Pressure");
  const prRes = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    dedup_pr AS (
      SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date)
        p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
        p.uploaded_at, p.id
      FROM pressure_history p
      JOIN op_schemes ss ON ss.scheme_id = p.scheme_id
      WHERE p.pressure_date IN (${sqlDateList})
      ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.pressure_date, p.uploaded_at DESC, p.id DESC
    ),
    dedup_wc AS (
      SELECT DISTINCT ON (wc.scheme_id, LOWER(TRIM(COALESCE(wc.village_name, ''))), LOWER(TRIM(COALESCE(wc.esr_name, ''))), wc.data_date)
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      JOIN op_schemes ss ON ss.scheme_id = wc.scheme_id
      WHERE wc.data_date IN (${sqlDateList})
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
  console.timeEnd("3. Pressure");
  console.log(`Pressure rows: ${prRes.rows.length}`);

  // 4. Offline Query
  console.time("4. Offline");
  const offRes: any = await db.execute(sql`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name,
      c.chlorine_connected, c.pressure_connected, c.flow_meter_connected,
      c.chlorine_status, c.pressure_status, c.flow_meter_status,
      c.last_seen, c.pressure_last_seen,
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - 1) as yesterday_ist
    FROM communication_status c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    WHERE (TRIM(c.chlorine_connected) = 'Connected' AND c.chlorine_status = 'Offline')
       OR (TRIM(c.pressure_connected) = 'Connected' AND c.pressure_status = 'Offline')
       OR (TRIM(c.flow_meter_connected) = 'Connected' AND c.flow_meter_status = 'Offline')
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
  `);
  console.timeEnd("4. Offline");
  console.log(`Offline rows: ${offRes.rows.length}`);

  console.timeEnd("All 4 Queries Total");

  process.exit(0);
}

testAllOptimized().catch(console.error);
