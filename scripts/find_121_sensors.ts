import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function find121Sensors() {
  const db = await getDB();

  const regions = ['Amravati', 'Chhatrapati Sambhajinagar', 'Konkan', 'Nagpur', 'Nashik', 'Pune'];

  for (const r of regions) {
    const q = await db.execute(sql`
      SELECT 
        pd.*,
        wc.water_value_day7 as w7
      FROM communication_status cs
      JOIN pressure_data pd ON (
        cs.scheme_id = pd.scheme_id AND
        LOWER(TRIM(cs.village_name)) = LOWER(TRIM(pd.village_name)) AND
        LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(pd.esr_name))
      )
      LEFT JOIN water_consumption wc ON (
        cs.scheme_id = wc.scheme_id AND
        LOWER(TRIM(cs.village_name)) = LOWER(TRIM(wc.village_name)) AND
        LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(wc.esr_name))
      )
      WHERE cs.region = ${r}
        AND (cs.pressure_connected = 'Connected' OR cs.pressure_connected = 'connected')
        AND (cs.pressure_status = 'Online' OR cs.pressure_status = 'online')
        AND wc.water_value_day7 IS NOT NULL 
        AND wc.water_value_day7 > 0
    `);

    let cZero = 0;
    let cBelow = 0;
    let belowRange = 0;
    let optimal = 0;
    let above = 0;

    const schemeSet = new Set();
    const villageSet = new Set();

    for (const row of q.rows) {
      schemeSet.add(row.scheme_id);
      villageSet.add(row.village_name);

      const p7 = parseFloat(String(row.pressure_value_7 || 0));
      if (p7 < 0.2) belowRange++;
      else if (p7 <= 0.7) optimal++;
      else above++;

      const isZero = Number(row.number_of_consistent_zero_value_in_pressure) === 7;
      const values = [
        parseFloat(String(row.pressure_value_1 || 0)),
        parseFloat(String(row.pressure_value_2 || 0)),
        parseFloat(String(row.pressure_value_3 || 0)),
        parseFloat(String(row.pressure_value_4 || 0)),
        parseFloat(String(row.pressure_value_5 || 0)),
        parseFloat(String(row.pressure_value_6 || 0)),
        parseFloat(String(row.pressure_value_7 || 0)),
      ];
      const isBelow = values.every((v) => v > 0 && v < 0.2);

      if (isZero) cZero++;
      if (isBelow) cBelow++;
    }

    console.log(`Region: ${r.padEnd(26)} => Total: ${String(q.rows.length).padStart(3)} (${schemeSet.size} schemes, ${villageSet.size} villages) | Below: ${belowRange}, Optimal: ${optimal}, Above: ${above} | Consistent Zero: ${cZero}, Consistent Below: ${cBelow}`);
  }

  // Also check across 39 operational schemes:
  const q39 = await db.execute(sql`
    SELECT 
      pd.*,
      wc.water_value_day7 as w7
    FROM communication_status cs
    JOIN pressure_data pd ON (
      cs.scheme_id = pd.scheme_id AND
      LOWER(TRIM(cs.village_name)) = LOWER(TRIM(pd.village_name)) AND
      LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(pd.esr_name))
    )
    LEFT JOIN water_consumption wc ON (
      cs.scheme_id = wc.scheme_id AND
      LOWER(TRIM(cs.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    JOIN scheme_status ss ON (cs.scheme_id = ss.scheme_id)
    WHERE ss.water_supply = 'Yes'
      AND (cs.pressure_connected = 'Connected' OR cs.pressure_connected = 'connected')
      AND (cs.pressure_status = 'Online' OR cs.pressure_status = 'online')
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7 > 0
  `);

  let cZero39 = 0;
  let cBelow39 = 0;
  let belowRange39 = 0;
  let optimal39 = 0;
  let above39 = 0;
  const sSet39 = new Set();
  const vSet39 = new Set();

  for (const row of q39.rows) {
    sSet39.add(row.scheme_id);
    vSet39.add(row.village_name);

    const p7 = parseFloat(String(row.pressure_value_7 || 0));
    if (p7 < 0.2) belowRange39++;
    else if (p7 <= 0.7) optimal39++;
    else above39++;

    const isZero = Number(row.number_of_consistent_zero_value_in_pressure) === 7;
    const values = [
      parseFloat(String(row.pressure_value_1 || 0)),
      parseFloat(String(row.pressure_value_2 || 0)),
      parseFloat(String(row.pressure_value_3 || 0)),
      parseFloat(String(row.pressure_value_4 || 0)),
      parseFloat(String(row.pressure_value_5 || 0)),
      parseFloat(String(row.pressure_value_6 || 0)),
      parseFloat(String(row.pressure_value_7 || 0)),
    ];
    const isBelow = values.every((v) => v > 0 && v < 0.2);

    if (isZero) cZero39++;
    if (isBelow) cBelow39++;
  }

  console.log(`\nOperational 39 Schemes with Online & Water > 0 => Total: ${q39.rows.length} (${sSet39.size} schemes, ${vSet39.size} villages) | Below: ${belowRange39}, Optimal: ${optimal39}, Above: ${above39} | Consistent Zero: ${cZero39}, Consistent Below: ${cBelow39}`);

  // Also check across 39 operational schemes WITHOUT the "Online" restriction (e.g. all connected pressure sensors with water):
  const q39AllConnected = await db.execute(sql`
    SELECT 
      pd.*,
      wc.water_value_day7 as w7
    FROM pressure_data pd
    LEFT JOIN water_consumption wc ON (
      pd.scheme_id = wc.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    JOIN scheme_status ss ON (pd.scheme_id = ss.scheme_id)
    WHERE ss.water_supply = 'Yes'
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7 > 0
  `);

  let cZeroAll = 0;
  let cBelowAll = 0;
  const sSetAll = new Set();
  const vSetAll = new Set();
  for (const row of q39AllConnected.rows) {
    sSetAll.add(row.scheme_id);
    vSetAll.add(row.village_name);
    const isZero = Number(row.number_of_consistent_zero_value_in_pressure) === 7;
    const values = [
      parseFloat(String(row.pressure_value_1 || 0)),
      parseFloat(String(row.pressure_value_2 || 0)),
      parseFloat(String(row.pressure_value_3 || 0)),
      parseFloat(String(row.pressure_value_4 || 0)),
      parseFloat(String(row.pressure_value_5 || 0)),
      parseFloat(String(row.pressure_value_6 || 0)),
      parseFloat(String(row.pressure_value_7 || 0)),
    ];
    const isBelow = values.every((v) => v > 0 && v < 0.2);
    if (isZero) cZeroAll++;
    if (isBelow) cBelowAll++;
  }
  console.log(`\nOperational 39 Schemes (All in pressure_data with Water > 0) => Total: ${q39AllConnected.rows.length} (${sSetAll.size} schemes, ${vSetAll.size} villages) | Consistent Zero: ${cZeroAll}, Consistent Below: ${cBelowAll}`);

  process.exit(0);
}

find121Sensors().catch(console.error);
