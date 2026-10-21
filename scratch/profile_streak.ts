import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Connecting DB...");
  const db = await getDB();
  console.log("Connected.");

  console.time("1. LPCD Query");
  const lpcdRows = await db.execute(sql`
    SELECT 
      h.scheme_id, h.scheme_name, h.region, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    JOIN scheme_status ss ON ss.scheme_id = h.scheme_id AND ss.water_supply = 'Yes'
    WHERE h.data_date IS NOT NULL
    ORDER BY h.scheme_id, LOWER(TRIM(COALESCE(h.village_name, ''))), h.uploaded_at DESC, h.id DESC
  `);
  console.timeEnd("1. LPCD Query");
  console.log(`LPCD rows: ${lpcdRows.rows.length}`);

  console.time("2. Chlorine Query");
  const clRows = await db.execute(sql`
    SELECT 
      c.scheme_id, c.scheme_name, c.region, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
      wc.water_value
    FROM chlorine_history c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    LEFT JOIN water_consumption_history wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      c.chlorine_date = wc.data_date
    )
    WHERE c.chlorine_date IS NOT NULL
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.uploaded_at DESC, c.id DESC
  `);
  console.timeEnd("2. Chlorine Query");
  console.log(`Chlorine rows: ${clRows.rows.length}`);

  console.time("3. Pressure Query");
  const prRows = await db.execute(sql`
    SELECT 
      p.scheme_id, p.scheme_name, p.region, p.village_name, p.esr_name, p.pressure_date, p.pressure_value,
      wc.water_value
    FROM pressure_history p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    LEFT JOIN water_consumption_history wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      p.pressure_date = wc.data_date
    )
    WHERE p.pressure_date IS NOT NULL
    ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))), p.uploaded_at DESC, p.id DESC
  `);
  console.timeEnd("3. Pressure Query");
  console.log(`Pressure rows: ${prRows.rows.length}`);

  console.time("4. Offline Query");
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
  console.timeEnd("4. Offline Query");
  console.log(`Offline rows: ${offRes.rows.length}`);

  process.exit(0);
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
