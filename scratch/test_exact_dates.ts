import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testExactDates() {
  const db = await getDB();
  
  const dates = [
    '19-Oct', '18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct',
    '12-Oct', '11-Oct', '10-Oct', '09-Oct', '08-Oct', '07-Oct', '06-Oct',
    '05-Oct', '04-Oct', '03-Oct', '02-Oct', '01-Oct',
    '9-Oct', '8-Oct', '7-Oct', '6-Oct', '5-Oct', '4-Oct', '3-Oct', '2-Oct', '1-Oct'
  ];

  console.time("Exact Dates Chlorine Query");
  const res = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    recent_cl AS (
      SELECT 
        c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
        c.uploaded_at, c.id
      FROM chlorine_history c
      JOIN op_schemes ss ON ss.scheme_id = c.scheme_id
      WHERE c.chlorine_date IN (${sql.join(dates.map(d => sql`${d}`), sql`, `)})
    ),
    recent_wc AS (
      SELECT 
        wc.scheme_id, wc.village_name, wc.esr_name, wc.data_date, wc.water_value
      FROM water_consumption_history wc
      JOIN op_schemes ss ON ss.scheme_id = wc.scheme_id
      WHERE wc.data_date IN (${sql.join(dates.map(d => sql`${d}`), sql`, `)})
    )
    SELECT 
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
      wc.water_value
    FROM recent_cl c
    LEFT JOIN recent_wc wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      c.chlorine_date = wc.data_date
    )
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.uploaded_at DESC, c.id DESC;
  `);
  console.timeEnd("Exact Dates Chlorine Query");
  console.log(`Returned rows: ${res.rows.length}`);

  process.exit(0);
}

testExactDates().catch(console.error);
