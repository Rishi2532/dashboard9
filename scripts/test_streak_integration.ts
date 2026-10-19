import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function run() {
  const db = await getDB();
  const { allAlerts, alertsByScheme } = await calculateAllAlertStreaksFromHistory(db);

  console.log(`Total alerts from history: ${allAlerts.length}`);
  console.log(`Total schemes with alerts: ${alertsByScheme.size}`);

  const countsByCat: Record<string, { total: number; s1: number; s3: number; s7: number; s15: number }> = {
    lpcd: { total: 0, s1: 0, s3: 0, s7: 0, s15: 0 },
    chlorine: { total: 0, s1: 0, s3: 0, s7: 0, s15: 0 },
    pressure: { total: 0, s1: 0, s3: 0, s7: 0, s15: 0 },
    offline: { total: 0, s1: 0, s3: 0, s7: 0, s15: 0 },
  };

  allAlerts.forEach(a => {
    const c = countsByCat[a.category];
    c.total++;
    if (a.streak_days >= 1) c.s1++;
    if (a.streak_days >= 3) c.s3++;
    if (a.streak_days >= 7) c.s7++;
    if (a.streak_days >= 15) c.s15++;
  });

  console.log('\n--- Breakdown by category & streak thresholds ---');
  console.table(countsByCat);

  // Check scheme-level escalation levels
  let lvl1 = 0, lvl2 = 0, lvl3 = 0, lvl4 = 0;
  alertsByScheme.forEach((alerts, sId) => {
    const maxStreak = Math.max(...alerts.map(a => a.streak_days));
    if (maxStreak >= 15) lvl4++;
    else if (maxStreak >= 7) lvl3++;
    else if (maxStreak >= 3) lvl2++;
    else lvl1++;
  });

  console.log('\n--- Schemes by Highest Active Escalation Level ---');
  console.log({
    level_1: lvl1,
    level_2: lvl2,
    level_3: lvl3,
    level_4_5: lvl4,
    total: alertsByScheme.size,
  });

  process.exit(0);
}

run().catch(console.error);
