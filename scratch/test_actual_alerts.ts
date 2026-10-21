import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function testAlerts() {
  const db = await getDB();
  const res = await calculateAllAlertStreaksFromHistory(db, true);
  console.log("Total allAlerts:", res.allAlerts.length);
  
  const byCat: Record<string, number> = {};
  res.allAlerts.forEach(a => {
    byCat[a.category] = (byCat[a.category] || 0) + 1;
  });
  console.log("Alerts by category:", byCat);

  // Check sample alert of each category
  ['lpcd', 'chlorine', 'pressure', 'offline'].forEach(cat => {
    const sample = res.allAlerts.find(a => a.category === cat);
    if (sample) {
      console.log(`Sample ${cat}:`, {
        scheme_id: sample.scheme_id,
        scheme_name: sample.scheme_name,
        village: sample.village_name,
        esr: sample.esr_name,
        streak_days: sample.streak_days,
        telemetry_date: sample.telemetry_date,
        val: sample.parameter_value
      });
    } else {
      console.log(`No alerts found for category: ${cat}`);
    }
  });

  process.exit(0);
}

testAlerts().catch(console.error);
