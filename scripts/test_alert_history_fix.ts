import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testTelemetryHistory() {
  const db = await getDB();

  // Test 1: Chlorine alert history
  // Let's pick a chlorine breached sensor
  const clRowRes = await db.execute(sql`
    SELECT c.*, 
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM chlorine_data c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    JOIN water_consumption wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE c.chlorine_value_7::numeric < 0.2 AND wc.water_value_day7::numeric > 0
    LIMIT 1
  `);

  const clRow = clRowRes.rows?.[0];
  console.log('\n--- Sample Chlorine Row ---', {
    scheme: clRow.scheme_name,
    village: clRow.village_name,
    esr: clRow.esr_name,
    c7: clRow.chlorine_value_7,
    w7: clRow.w7
  });

  // Extract 7 days
  const clTimeline = [7, 6, 5, 4, 3, 2, 1].map((k, idx) => {
    const rawVal = clRow[`chlorine_value_${k}`];
    const rawW = clRow[`w${k}`];
    const rawDate = clRow[`chlorine_date_day_${k}`] || `${11 + k}-Oct`;
    const numVal = rawVal !== null && rawVal !== undefined ? parseFloat(String(rawVal)) : null;
    const numW = rawW !== null && rawW !== undefined ? parseFloat(String(rawW)) : null;

    const isBreach = numVal !== null && numW !== null && numW > 0 && (numVal < 0.2 || numVal > 0.5);
    const alertType = !isBreach ? 'Compliant' : numVal! > 0.5 ? 'High Chlorine' : 'Low Chlorine';
    const alertValue = numVal !== null ? `${numVal.toFixed(2)} mg/L` : 'No Data';

    return {
      dayIndex: idx + 1,
      dateFormatted: `${rawDate} 2026`,
      alertValue,
      alertType,
      hasAlert: isBreach,
    };
  });

  console.log('Chlorine Timeline:');
  console.table(clTimeline);

  // Test 2: Pressure alert history
  const prRowRes = await db.execute(sql`
    SELECT p.*, 
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM pressure_data p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    JOIN water_consumption wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE p.pressure_value_7::numeric < 0.2 AND wc.water_value_day7::numeric > 0
    LIMIT 1
  `);

  const prRow = prRowRes.rows?.[0];
  console.log('\n--- Sample Pressure Row ---', {
    scheme: prRow.scheme_name,
    village: prRow.village_name,
    esr: prRow.esr_name,
    p7: prRow.pressure_value_7,
    w7: prRow.w7
  });

  const prTimeline = [7, 6, 5, 4, 3, 2, 1].map((k, idx) => {
    const rawVal = prRow[`pressure_value_${k}`];
    const rawW = prRow[`w${k}`];
    const rawDate = prRow[`pressure_date_day_${k}`] || `${11 + k}-Oct`;
    const numVal = rawVal !== null && rawVal !== undefined ? parseFloat(String(rawVal)) : null;
    const numW = rawW !== null && rawW !== undefined ? parseFloat(String(rawW)) : null;

    const isBreach = numVal !== null && numW !== null && numW > 0 && (numVal < 0.2 && numVal >= 0);
    const alertType = !isBreach ? 'Compliant' : 'Low Pressure';
    const alertValue = numVal !== null ? `${numVal.toFixed(2)} Bar` : 'No Data';

    return {
      dayIndex: idx + 1,
      dateFormatted: `${rawDate} 2026`,
      alertValue,
      alertType,
      hasAlert: isBreach,
    };
  });

  console.log('Pressure Timeline:');
  console.table(prTimeline);

  process.exit(0);
}

testTelemetryHistory().catch(console.error);
