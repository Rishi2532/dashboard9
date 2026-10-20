import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testWaterCondition() {
  const db = await getDB();

  const q = await db.execute(sql`
    SELECT 
      pd.scheme_id, pd.scheme_name, pd.village_name, pd.esr_name,
      pd.pressure_value_7, pd.pressure_value_6, pd.pressure_value_5, pd.pressure_value_4,
      pd.pressure_value_3, pd.pressure_value_2, pd.pressure_value_1,
      pd.number_of_consistent_zero_value_in_pressure,
      wc.water_value_day7, wc.water_value_day6, wc.water_value_day5, wc.water_value_day4,
      wc.water_value_day3, wc.water_value_day2, wc.water_value_day1
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

  console.log(`Total sensors matching PressureDashboard logic: ${q.rows.length}`);

  let cZeroUI = 0;
  let cBelowUI = 0;
  const zeroList: any[] = [];
  const belowList: any[] = [];

  for (const row of q.rows) {
    const isZero = Number(row.number_of_consistent_zero_value_in_pressure) === 7;
    const pVals = [
      parseFloat(String(row.pressure_value_1 || 0)),
      parseFloat(String(row.pressure_value_2 || 0)),
      parseFloat(String(row.pressure_value_3 || 0)),
      parseFloat(String(row.pressure_value_4 || 0)),
      parseFloat(String(row.pressure_value_5 || 0)),
      parseFloat(String(row.pressure_value_6 || 0)),
      parseFloat(String(row.pressure_value_7 || 0)),
    ];
    const isBelow = pVals.every((v) => v > 0 && v < 0.2);

    if (isZero) {
      cZeroUI++;
      zeroList.push(row);
    }
    if (isBelow) {
      cBelowUI++;
      belowList.push(row);
    }
  }

  console.log(`UI Consistent Zero: ${cZeroUI}`);
  console.log(`UI Consistent Below: ${cBelowUI}`);
  console.log(`UI Total Low (Zero + Below): ${cZeroUI + cBelowUI}`);

  const all51 = [...zeroList, ...belowList];
  let hasWaterAll7Days = 0;
  let missingWaterOnSomeDays = 0;

  const missingWaterDetails: any[] = [];
  const all7WaterDetails: any[] = [];

  for (const row of all51) {
    const wVals = [
      parseFloat(String(row.water_value_day7 || 0)),
      parseFloat(String(row.water_value_day6 || 0)),
      parseFloat(String(row.water_value_day5 || 0)),
      parseFloat(String(row.water_value_day4 || 0)),
      parseFloat(String(row.water_value_day3 || 0)),
      parseFloat(String(row.water_value_day2 || 0)),
      parseFloat(String(row.water_value_day1 || 0)),
    ];
    const pVals = [
      parseFloat(String(row.pressure_value_7 || 0)),
      parseFloat(String(row.pressure_value_6 || 0)),
      parseFloat(String(row.pressure_value_5 || 0)),
      parseFloat(String(row.pressure_value_4 || 0)),
      parseFloat(String(row.pressure_value_3 || 0)),
      parseFloat(String(row.pressure_value_2 || 0)),
      parseFloat(String(row.pressure_value_1 || 0)),
    ];

    // Calculate streak backwards from Day 7 (index 0)
    let streakWithWater = 0;
    let streakRegardlessOfWater = 0;

    for (let i = 0; i < 7; i++) {
      if (pVals[i] >= 0 && pVals[i] < 0.2 && wVals[i] > 0) {
        streakWithWater++;
      } else {
        break;
      }
    }

    for (let i = 0; i < 7; i++) {
      if (pVals[i] >= 0 && pVals[i] < 0.2) {
        streakRegardlessOfWater++;
      } else {
        break;
      }
    }

    if (streakWithWater === 7) {
      hasWaterAll7Days++;
      all7WaterDetails.push({
        scheme_id: row.scheme_id,
        village: row.village_name,
        esr: row.esr_name,
        isZero: Number(row.number_of_consistent_zero_value_in_pressure) === 7,
      });
    } else {
      missingWaterOnSomeDays++;
      missingWaterDetails.push({
        scheme_id: row.scheme_id,
        village: row.village_name,
        esr: row.esr_name,
        isZero: Number(row.number_of_consistent_zero_value_in_pressure) === 7,
        streakWithWater,
        streakRegardlessOfWater,
        pVals_7_to_1: pVals,
        wVals_7_to_1: wVals,
      });
    }
  }

  console.log(`\nOf the ${all51.length} sensors in PressureDashboard:`);
  console.log(`- Has pressure < 0.2 AND water > 0 on ALL 7 days (streak = 7): ${hasWaterAll7Days}`);
  console.log(`- Water was 0 or missing on at least one day (streak < 7): ${missingWaterOnSomeDays}`);
  console.log(`\nDetails of the ${missingWaterDetails.length} sensors where streak < 7 due to water:`);
  for (const m of missingWaterDetails) {
    console.log(`Scheme ${m.scheme_id} | ${m.village} | ${m.esr}:`);
    console.log(`  Streak with water: ${m.streakWithWater} days | Streak without water requirement: ${m.streakRegardlessOfWater} days`);
    console.log(`  Pressure (Day 7..1):`, m.pVals_7_to_1);
    console.log(`  Water (Day 7..1):   `, m.wVals_7_to_1);
  }

  process.exit(0);
}

testWaterCondition().catch(console.error);
