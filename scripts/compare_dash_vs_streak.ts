import { getDB } from '../server/db';
import { storage } from '../server/storage';
import { sql } from 'drizzle-orm';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function compareDashboardVsEscalation() {
  const db = await getDB();

  // 1. Get the 121 "Sensors with Water" as fetched by PressureDashboard
  const withWaterRes = await storage.getPressureSensorsWithWater();
  console.log('Total withWaterSensors from storage:', withWaterRes.totalWithWaterSensors);

  // Get pressure_data for all these 121 sensors
  const allPressureData = await storage.getPressureData({});
  
  // Replicate PressureDashboard location keys
  const withWaterKeys = new Set(
    withWaterRes.withWaterSensors.map(
      (s: any) => `${s.region}|${s.circle}|${s.division}|${s.sub_division}|${s.block}|${s.village_name}|${s.esr_name}`.toLowerCase()
    )
  );

  const matched121 = allPressureData.filter((item: any) => {
    const key = `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`.toLowerCase();
    return withWaterKeys.has(key);
  });
  console.log('Matched items in PressureDashboard:', matched121.length);

  // In matched121, replicate PressureDashboard logic:
  const consistentZeroInDash: any[] = [];
  const consistentBelowInDash: any[] = [];

  for (const item of matched121) {
    const isZero = (item.number_of_consistent_zero_value_in_pressure || 0) === 7;
    const values = [
      parseFloat(String(item.pressure_value_1 || 0)),
      parseFloat(String(item.pressure_value_2 || 0)),
      parseFloat(String(item.pressure_value_3 || 0)),
      parseFloat(String(item.pressure_value_4 || 0)),
      parseFloat(String(item.pressure_value_5 || 0)),
      parseFloat(String(item.pressure_value_6 || 0)),
      parseFloat(String(item.pressure_value_7 || 0)),
    ];
    const isBelow = values.every((val) => val > 0 && val < 0.2);

    if (isZero) consistentZeroInDash.push(item);
    if (isBelow) consistentBelowInDash.push(item);
  }

  console.log(`PressureDashboard Consistent Zero: ${consistentZeroInDash.length}`);
  console.log(`PressureDashboard Consistent Below: ${consistentBelowInDash.length}`);
  console.log(`PressureDashboard Total Low (37 + 14): ${consistentZeroInDash.length + consistentBelowInDash.length}`);

  const dash51 = [...consistentZeroInDash, ...consistentBelowInDash];
  const dash51Keys = new Set(dash51.map((item: any) => `${item.scheme_id}|${item.village_name}|${item.esr_name}`.toLowerCase()));

  // Schemes represented in the 121 sensors:
  const schemesInDash = new Set(matched121.map((item: any) => item.scheme_id));
  console.log(`Number of schemes in PressureDashboard (Sensors with Water): ${schemesInDash.size}`);

  // 2. Get the streak engine alerts for pressure with streak >= 7
  const streakEngineResult = await calculateAllAlertStreaksFromHistory(db);
  const pressureStreaks = streakEngineResult.filter((a: any) => a.category === 'pressure');
  console.log(`Total active pressure alerts on Day 7 in streak engine: ${pressureStreaks.length}`);

  const pressureStreak7 = pressureStreaks.filter((a: any) => a.streak_days >= 7);
  console.log(`Total pressure alerts with streak >= 7 (Level 3) in streak engine: ${pressureStreak7.length}`);

  const streak44Keys = new Set(pressureStreak7.map((a: any) => `${a.scheme_id}|${a.village_name}|${a.esr_name}`.toLowerCase()));

  // 3. Compare dash51 vs streak44
  // In dash51 but NOT in streak44:
  const inDashNotInStreak: any[] = [];
  for (const item of dash51) {
    const key = `${item.scheme_id}|${item.village_name}|${item.esr_name}`.toLowerCase();
    if (!streak44Keys.has(key)) {
      // Find in pressureStreaks to see its streak_days or why it's not >= 7
      const alert = pressureStreaks.find((a: any) => `${a.scheme_id}|${a.village_name}|${a.esr_name}`.toLowerCase() === key);
      inDashNotInStreak.push({
        scheme_id: item.scheme_id,
        scheme_name: item.scheme_name,
        village: item.village_name,
        esr: item.esr_name,
        isZero: (item.number_of_consistent_zero_value_in_pressure || 0) === 7,
        streak_days: alert ? alert.streak_days : 'NOT_AN_ALERT',
        reason: alert ? `Streak is ${alert.streak_days}` : 'No active alert on Day 7'
      });
    }
  }

  // In streak44 but NOT in dash51:
  const inStreakNotInDash: any[] = [];
  for (const alert of pressureStreak7) {
    const key = `${alert.scheme_id}|${alert.village_name}|${alert.esr_name}`.toLowerCase();
    if (!dash51Keys.has(key)) {
      inStreakNotInDash.push({
        scheme_id: alert.scheme_id,
        village: alert.village_name,
        esr: alert.esr_name,
        streak_days: alert.streak_days
      });
    }
  }

  console.log(`\nIn PressureDashboard 51 but NOT in Streak 44: ${inDashNotInStreak.length}`);
  console.table(inDashNotInStreak);

  console.log(`\nIn Streak 44 but NOT in PressureDashboard 51: ${inStreakNotInDash.length}`);
  console.table(inStreakNotInDash);

  // Let's inspect the water consumption and communication status for the sensors in inDashNotInStreak:
  for (const item of inDashNotInStreak) {
    const q = await db.execute(sql`
      SELECT p.pressure_value_7, p.pressure_value_6, p.pressure_value_5, p.pressure_value_4,
             p.pressure_value_3, p.pressure_value_2, p.pressure_value_1,
             wc.water_value_day7, wc.water_value_day6, wc.water_value_day5, wc.water_value_day4,
             wc.water_value_day3, wc.water_value_day2, wc.water_value_day1,
             cs.pressure_connected, cs.pressure_status
      FROM pressure_data p
      LEFT JOIN water_consumption wc ON (
        p.scheme_id = wc.scheme_id AND
        LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
        LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
      )
      LEFT JOIN communication_status cs ON (
        p.scheme_id = cs.scheme_id AND
        LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
        LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
      )
      WHERE p.scheme_id = ${item.scheme_id}
        AND LOWER(TRIM(p.village_name)) = LOWER(TRIM(${item.village}))
        AND LOWER(TRIM(p.esr_name)) = LOWER(TRIM(${item.esr}))
      LIMIT 1
    `);
    console.log(`\nDetail for ${item.scheme_id} - ${item.village} - ${item.esr}:`);
    console.log(q.rows[0]);
  }

  process.exit(0);
}

compareDashboardVsEscalation().catch(console.error);
