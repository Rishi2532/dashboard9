import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function analyzePressureSensors() {
  const db = await getDB();

  // 1. Check all schemes in scheme_status
  const schemesRes = await db.execute(sql`
    SELECT scheme_id, scheme_name, water_supply 
    FROM scheme_status 
    WHERE water_supply = 'Yes'
  `);
  const valid39SchemeIds = schemesRes.rows.map((r: any) => String(r.scheme_id));
  console.log(`Fully operational schemes (water_supply = 'Yes'): ${valid39SchemeIds.length}`);

  // 2. Query all pressure rows that PressureDashboard loads for "Sensors with Water"
  // Let's check how PressureDashboard gets "Sensors with Water"
  // In PressureDashboard, what API does it call? /api/pressure/dashboard-data or /api/pressure/esrs?
  const allPressureRes = await db.execute(sql`
    SELECT p.*,
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM pressure_data p
    LEFT JOIN water_consumption wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
  `);

  console.log(`Total pressure rows in DB: ${allPressureRes.rows.length}`);

  // Filter for valid 39 schemes
  const rowsIn39 = allPressureRes.rows.filter((r: any) => valid39SchemeIds.includes(String(r.scheme_id)));
  console.log(`Pressure rows in 39 schemes: ${rowsIn39.length}`);

  // How many sensors have water on Day 7?
  const rowsWithWaterDay7 = rowsIn39.filter((r: any) => {
    const w7 = parseFloat(String(r.w7 || 0));
    return w7 > 0;
  });
  console.log(`Pressure rows in 39 schemes with water on Day 7 (w7 > 0): ${rowsWithWaterDay7.length}`);

  // Check how many have w7 > 0 across ALL schemes in DB (not just 39)
  const allRowsWithWaterDay7 = allPressureRes.rows.filter((r: any) => {
    const w7 = parseFloat(String(r.w7 || 0));
    return w7 > 0;
  });
  console.log(`Pressure rows across ALL schemes with water on Day 7 (w7 > 0): ${allRowsWithWaterDay7.length}`);

  // Now let's calculate:
  // Consistent Zero (all 7 days p = 0 or number_of_consistent_zero_value_in_pressure = 7)
  // Consistent Below (all 7 days 0 < p < 0.2)
  // for rowsWithWaterDay7 vs allRowsWithWaterDay7
  function evaluatePatterns(rows: any[], label: string) {
    let cZero = 0;
    let cBelow = 0;
    let cOptimal = 0;
    let cAbove = 0;
    let pLowOnDay7 = 0; // Day 7 p < 0.2

    const zeroDetails: any[] = [];
    const belowDetails: any[] = [];

    for (const r of rows) {
      const p = [
        parseFloat(String(r.pressure_value_1 ?? 0)),
        parseFloat(String(r.pressure_value_2 ?? 0)),
        parseFloat(String(r.pressure_value_3 ?? 0)),
        parseFloat(String(r.pressure_value_4 ?? 0)),
        parseFloat(String(r.pressure_value_5 ?? 0)),
        parseFloat(String(r.pressure_value_6 ?? 0)),
        parseFloat(String(r.pressure_value_7 ?? 0)),
      ];

      const p7 = parseFloat(String(r.pressure_value_7 ?? 0));
      if (p7 < 0.2 && p7 >= 0) pLowOnDay7++;

      const isZero7 = Number(r.number_of_consistent_zero_value_in_pressure) === 7 || p.every(v => v === 0);
      const isBelow7 = p.every(v => v > 0 && v < 0.2);
      const isOptimal7 = p.every(v => v >= 0.2 && v <= 0.7);
      const isAbove7 = p.every(v => v > 0.7);

      if (isZero7) {
        cZero++;
        zeroDetails.push({
          scheme_id: r.scheme_id,
          scheme_name: r.scheme_name,
          village: r.village_name,
          esr: r.esr_name,
          p,
          w: [r.w1, r.w2, r.w3, r.w4, r.w5, r.w6, r.w7],
        });
      }
      if (isBelow7) {
        cBelow++;
        belowDetails.push({
          scheme_id: r.scheme_id,
          scheme_name: r.scheme_name,
          village: r.village_name,
          esr: r.esr_name,
          p,
          w: [r.w1, r.w2, r.w3, r.w4, r.w5, r.w6, r.w7],
        });
      }
      if (isOptimal7) cOptimal++;
      if (isAbove7) cAbove++;
    }

    console.log(`\n--- Pattern Stats for: ${label} (${rows.length} rows) ---`);
    console.log(`Below Range Day 7 (< 0.2): ${pLowOnDay7}`);
    console.log(`Consistent Zero (7 days = 0): ${cZero}`);
    console.log(`Consistent Below (7 days 0 < p < 0.2): ${cBelow}`);
    console.log(`Total Consistent Low (Zero + Below): ${cZero + cBelow}`);
    console.log(`Consistent Optimal (7 days 0.2-0.7): ${cOptimal}`);
    console.log(`Consistent Above (7 days > 0.7): ${cAbove}`);

    return { cZero, cBelow, totalLow: cZero + cBelow, zeroDetails, belowDetails };
  }

  evaluatePatterns(rowsWithWaterDay7, 'In 39 Schemes with Water on Day 7');
  evaluatePatterns(allRowsWithWaterDay7, 'Across ALL DB Rows with Water on Day 7');
  evaluatePatterns(rowsIn39, 'All 39 Schemes (regardless of water)');
  evaluatePatterns(allPressureRes.rows, 'All DB Pressure Rows (regardless of water)');

  process.exit(0);
}

analyzePressureSensors().catch(console.error);
