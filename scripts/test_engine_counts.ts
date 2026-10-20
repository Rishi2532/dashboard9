import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function testUpdatedEngine() {
  const db = await getDB();
  const { allAlerts: alerts } = await calculateAllAlertStreaksFromHistory(db);

  console.log(`Total Active Alerts: ${alerts.length}`);

  const prAlerts = alerts.filter(a => a.category === 'pressure');
  const clAlerts = alerts.filter(a => a.category === 'chlorine');
  const lpAlerts = alerts.filter(a => a.category === 'lpcd');
  const offAlerts = alerts.filter(a => a.category === 'offline');

  console.log(`Pressure: ${prAlerts.length} | Chlorine: ${clAlerts.length} | LPCD: ${lpAlerts.length} | Offline: ${offAlerts.length}`);

  console.log('\nLevel 1 (>= 1d):');
  console.log(`  Pressure: ${prAlerts.filter(a => a.streak_days >= 1).length}`);
  console.log(`  Chlorine: ${clAlerts.filter(a => a.streak_days >= 1).length}`);
  console.log(`  LPCD:     ${lpAlerts.filter(a => a.streak_days >= 1).length}`);
  console.log(`  Offline:  ${offAlerts.filter(a => a.streak_days >= 1).length}`);
  console.log(`  Total:    ${alerts.filter(a => a.streak_days >= 1).length}`);

  console.log('\nLevel 2 (>= 3d):');
  console.log(`  Pressure: ${prAlerts.filter(a => a.streak_days >= 3).length}`);
  console.log(`  Chlorine: ${clAlerts.filter(a => a.streak_days >= 3).length}`);
  console.log(`  LPCD:     ${lpAlerts.filter(a => a.streak_days >= 3).length}`);
  console.log(`  Offline:  ${offAlerts.filter(a => a.streak_days >= 3).length}`);
  console.log(`  Total:    ${alerts.filter(a => a.streak_days >= 3).length}`);

  console.log('\nLevel 3 (>= 7d):');
  console.log(`  Pressure: ${prAlerts.filter(a => a.streak_days >= 7).length}`);
  console.log(`  Chlorine: ${clAlerts.filter(a => a.streak_days >= 7).length}`);
  console.log(`  LPCD:     ${lpAlerts.filter(a => a.streak_days >= 7).length}`);
  console.log(`  Offline:  ${offAlerts.filter(a => a.streak_days >= 7).length}`);
  console.log(`  Total:    ${alerts.filter(a => a.streak_days >= 7).length}`);

  process.exit(0);
}

testUpdatedEngine().catch(console.error);
