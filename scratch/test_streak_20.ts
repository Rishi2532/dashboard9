import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function run() {
  const db = await getDB();
  console.log("Calculating streaks as of 20-Oct...");
  const res20 = await calculateAllAlertStreaksFromHistory(db, true, '20-Oct');
  
  const lpcd20 = res20.allAlerts.filter(a => a.category === 'lpcd');
  console.log("20-Oct LPCD alerts count (streak >= 1):", lpcd20.length);

  const lpcd20_gte3 = lpcd20.filter(a => a.streak_days >= 3);
  console.log("20-Oct LPCD alerts count (streak >= 3):", lpcd20_gte3.length);

  const lpcd20_gte7 = lpcd20.filter(a => a.streak_days >= 7);
  console.log("20-Oct LPCD alerts count (streak >= 7):", lpcd20_gte7.length);

  console.log("\nCalculating streaks as of 18-Oct...");
  const res18 = await calculateAllAlertStreaksFromHistory(db, true, '18-Oct');
  const lpcd18 = res18.allAlerts.filter(a => a.category === 'lpcd');
  console.log("18-Oct LPCD alerts count (streak >= 1):", lpcd18.length);

  process.exit(0);
}
run();
