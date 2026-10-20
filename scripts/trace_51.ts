import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function trace51() {
  const db = await getDB();

  // Get the 51 sensors from PressureDashboard:
  // 1. In PressureDashboard, it uses `withWaterSensors` from storage.
  // Let's get the 51 sensors:
  const qAll = await db.execute(sql`
    SELECT 
      pd.scheme_id, pd.village_name, pd.esr_name,
      pd.pressure_value_7, pd.pressure_value_6, pd.pressure_value_5, pd.pressure_value_4,
      pd.pressure_value_3, pd.pressure_value_2, pd.pressure_value_1,
      pd.number_of_consistent_zero_value_in_pressure,
      cs.pressure_connected, cs.pressure_status,
      wc.water_value_day7
    FROM pressure_data pd
    LEFT JOIN communication_status cs ON (
      pd.scheme_id = cs.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(cs.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(cs.esr_name))
    )
    LEFT JOIN water_consumption wc ON (
      pd.scheme_id = wc.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    JOIN scheme_status ss ON ss.scheme_id = pd.scheme_id AND ss.water_supply = 'Yes'
  `);

  console.log(`Total pressure rows in 39 schemes: ${qAll.rows.length}`);

  const zeroOrBelow51: any[] = [];
  for (const r of qAll.rows) {
    const isZero = Number(r.number_of_consistent_zero_value_in_pressure) === 7;
    const vals = [
      parseFloat(String(r.pressure_value_1 || 0)),
      parseFloat(String(r.pressure_value_2 || 0)),
      parseFloat(String(r.pressure_value_3 || 0)),
      parseFloat(String(r.pressure_value_4 || 0)),
      parseFloat(String(r.pressure_value_5 || 0)),
      parseFloat(String(r.pressure_value_6 || 0)),
      parseFloat(String(r.pressure_value_7 || 0)),
    ];
    const isBelow = vals.every(v => v > 0 && v < 0.2);

    if (isZero || isBelow) {
      zeroOrBelow51.push({
        scheme_id: r.scheme_id,
        village: r.village_name,
        esr: r.esr_name,
        isZero,
        isBelow,
        pressure_connected: r.pressure_connected,
        pressure_status: r.pressure_status,
        w7: r.water_value_day7,
        p7: r.pressure_value_7
      });
    }
  }

  console.log(`Total Consistent Zero / Below across 39 schemes: ${zeroOrBelow51.length}`);

  // How many have pressure_status = 'Online'?
  const online = zeroOrBelow51.filter(r => (r.pressure_status || '').toLowerCase() === 'online');
  console.log(`Online: ${online.length}`);

  // How many have w7 > 0?
  const onlineWithWater = online.filter(r => parseFloat(String(r.w7 || 0)) > 0);
  console.log(`Online with Water > 0: ${onlineWithWater.length}`);

  const notOnlineOrNoWater = zeroOrBelow51.filter(r => !((r.pressure_status || '').toLowerCase() === 'online' && parseFloat(String(r.w7 || 0)) > 0));
  console.log(`\nSensors in 39 schemes with Consistent Low, but NOT online with water (${notOnlineOrNoWater.length}):`);
  console.table(notOnlineOrNoWater.slice(0, 15));

  // Now, what about across ALL schemes (beyond the 39)?
  const qAllDB = await db.execute(sql`
    SELECT 
      pd.scheme_id, pd.village_name, pd.esr_name, ss.water_supply,
      pd.pressure_value_7,
      pd.number_of_consistent_zero_value_in_pressure,
      cs.pressure_connected, cs.pressure_status,
      wc.water_value_day7
    FROM pressure_data pd
    LEFT JOIN communication_status cs ON (
      pd.scheme_id = cs.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(cs.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(cs.esr_name))
    )
    LEFT JOIN water_consumption wc ON (
      pd.scheme_id = wc.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    LEFT JOIN scheme_status ss ON ss.scheme_id = pd.scheme_id
    WHERE (cs.pressure_connected = 'Connected' OR cs.pressure_connected = 'connected')
      AND (cs.pressure_status = 'Online' OR cs.pressure_status = 'online')
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7 > 0
  `);

  console.log(`\nAcross ALL schemes in DB: Total Online with Water: ${qAllDB.rows.length}`);

  process.exit(0);
}

trace51().catch(console.error);
