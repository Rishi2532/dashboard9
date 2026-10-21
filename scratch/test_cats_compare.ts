import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';

async function run() {
  const db = await getDB();
  const res20 = await calculateAllAlertStreaksFromHistory(db, false, '20-Oct');
  
  const cats20 = {
    lpcd: res20.allAlerts.filter(a => a.category === 'lpcd').length,
    cl_low: res20.allAlerts.filter(a => a.category === 'chlorine' && a.alert_type.includes('Low')).length,
    cl_high: res20.allAlerts.filter(a => a.category === 'chlorine' && a.alert_type.includes('High')).length,
    pressure: res20.allAlerts.filter(a => a.category === 'pressure').length,
    offline: res20.allAlerts.filter(a => a.category === 'offline').length,
  };
  console.log("Streak engine as of 20-Oct:", cats20);

  const res18 = await calculateAllAlertStreaksFromHistory(db, false, '18-Oct');
  const cats18 = {
    lpcd: res18.allAlerts.filter(a => a.category === 'lpcd').length,
    cl_low: res18.allAlerts.filter(a => a.category === 'chlorine' && a.alert_type.includes('Low')).length,
    cl_high: res18.allAlerts.filter(a => a.category === 'chlorine' && a.alert_type.includes('High')).length,
    pressure: res18.allAlerts.filter(a => a.category === 'pressure').length,
    offline: res18.allAlerts.filter(a => a.category === 'offline').length,
  };
  console.log("Streak engine as of 18-Oct:", cats18);

  process.exit(0);
}
run();
