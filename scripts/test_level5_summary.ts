import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function testLevel5SummaryEndpoint() {
  const db = await getDB();
  const { allAlerts } = await calculateAllAlertStreaksFromHistory(db);

  console.log('--- Streak summary for >= 20 days ---');
  const lpcd20Villages = allAlerts.filter(s => s.category === 'lpcd' && s.streak_days >= 20);
  const lpcd20Schemes = new Set(lpcd20Villages.map(s => s.scheme_id));
  const pressure20 = allAlerts.filter(s => s.category === 'pressure' && s.streak_days >= 20);
  const chlorine20 = allAlerts.filter(s => s.category === 'chlorine' && s.streak_days >= 20);

  console.log(`Low LPCD Schemes (>= 20d): ${lpcd20Schemes.size}`);
  console.log(`Low LPCD Villages (>= 20d): ${lpcd20Villages.length}`);
  console.log(`Low Pressure ESRs (>= 20d): ${pressure20.length}`);
  console.log(`Residual Chlorine Out of Range ESRs (>= 20d): ${chlorine20.length}`);

  // Reference with >= 7 days on local DB:
  const lpcd7Villages = allAlerts.filter(s => s.category === 'lpcd' && s.streak_days >= 7);
  const lpcd7Schemes = new Set(lpcd7Villages.map(s => s.scheme_id));
  const pressure7 = allAlerts.filter(s => s.category === 'pressure' && s.streak_days >= 7);
  const chlorine7 = allAlerts.filter(s => s.category === 'chlorine' && s.streak_days >= 7);
  console.log('\n--- Streak summary for >= 7 days (reference on local 7d data) ---');
  console.log(`Low LPCD Schemes (>= 7d): ${lpcd7Schemes.size}`);
  console.log(`Low LPCD Villages (>= 7d): ${lpcd7Villages.length}`);
  console.log(`Low Pressure ESRs (>= 7d): ${pressure7.length}`);
  console.log(`Residual Chlorine Out of Range ESRs (>= 7d): ${chlorine7.length}`);

  process.exit(0);
}

testLevel5SummaryEndpoint().catch(console.error);
