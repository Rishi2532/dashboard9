import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';
import { schemeEngineerDetails } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function test() {
  const db = await getDB();
  const { allAlerts } = await calculateAllAlertStreaksFromHistory(db);

  const engRows = await db.select().from(schemeEngineerDetails);
  const engMap = new Map<string, typeof engRows[0]>();
  engRows.forEach(e => {
    if (e.scheme_id) engMap.set(String(e.scheme_id).trim(), e);
    if (e.scheme) engMap.set(String(e.scheme).trim().toLowerCase(), e);
  });

  const schemeAgg = new Map();
  for (const alert of allAlerts) {
    const schemeId = String(alert.scheme_id || '').trim();
    if (!schemeId) continue;
    const schemeName = String(alert.scheme_name || schemeId).trim();

    if (!schemeAgg.has(schemeId)) {
      const eng = engMap.get(schemeId) || engMap.get(schemeName.toLowerCase());
      schemeAgg.set(schemeId, {
        scheme_id: schemeId,
        scheme_name: schemeName,
        max_streak_days: 0,
        lpcd_villages: [],
        chlorine_low_esrs: [],
        chlorine_high_esrs: [],
        pressure_low_esrs: [],
        offline_esrs: [],
        total_issues_count: 0,
      });
    }

    const item = schemeAgg.get(schemeId);
    const days = alert.streak_days;
    item.total_issues_count++;
    if (days > item.max_streak_days) item.max_streak_days = days;

    if (alert.category === 'lpcd') {
      item.lpcd_villages.push({ village_name: alert.village_name, days_count: days, avg_val: alert.parameter_value });
    } else if (alert.category === 'chlorine') {
      if (alert.alert_type === 'High Chlorine') {
        item.chlorine_high_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, val: alert.parameter_value });
      } else {
        item.chlorine_low_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, val: alert.parameter_value });
      }
    } else if (alert.category === 'pressure') {
      item.pressure_low_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, val: alert.parameter_value });
    } else if (alert.category === 'offline') {
      item.offline_esrs.push({ village_name: alert.village_name, esr_name: alert.esr_name, days_count: days, sensors: alert.offline_sensors });
    }
  }

  console.log(`Aggregated ${schemeAgg.size} schemes from ${allAlerts.length} alerts.`);
  
  // Test computing tier stats like the frontend does:
  [1, 3, 7, 15].forEach(minStreak => {
    let lpcd = 0, cl = 0, pr = 0, off = 0;
    const schemes = new Set();
    schemeAgg.forEach(s => {
      s.lpcd_villages.forEach((v: any) => { if (v.days_count >= minStreak) { lpcd++; schemes.add(s.scheme_id); } });
      s.chlorine_low_esrs.forEach((e: any) => { if (e.days_count >= minStreak) { cl++; schemes.add(s.scheme_id); } });
      s.chlorine_high_esrs.forEach((e: any) => { if (e.days_count >= minStreak) { cl++; schemes.add(s.scheme_id); } });
      s.pressure_low_esrs.forEach((e: any) => { if (e.days_count >= minStreak) { pr++; schemes.add(s.scheme_id); } });
      s.offline_esrs.forEach((e: any) => { if (e.days_count >= minStreak) { off++; schemes.add(s.scheme_id); } });
    });
    console.log(`Min Streak >= ${minStreak}d: Total ${lpcd + cl + pr + off} alerts (LPCD: ${lpcd}, Cl: ${cl}, Pr: ${pr}, Off: ${off}) across ${schemes.size} schemes`);
  });

  process.exit(0);
}

test().catch(console.error);
