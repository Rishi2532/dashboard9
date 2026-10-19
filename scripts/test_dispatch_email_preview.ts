import { getDB } from '../server/db';
import { calculateAllAlertStreaksFromHistory } from '../server/services/streak-engine';
import { schemeStatuses, schemeEngineerDetails } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function previewDispatch() {
  const db = await getDB();
  console.log('--- PREVIEWING DAILY ALERTS DISPATCH WITH HISTORY STREAKS ---');

  const { allAlerts, alertsByScheme } = await calculateAllAlertStreaksFromHistory(db);
  console.log(`Loaded ${allAlerts.length} total active alerts across ${alertsByScheme.size} schemes.`);

  const engRows = await db.select().from(schemeEngineerDetails);
  const engMap = new Map<string, typeof engRows[0]>();
  engRows.forEach(e => {
    if (e.scheme_id) engMap.set(String(e.scheme_id).trim(), e);
  });

  // Calculate Cadence Filtering across the 5 Escalation Tiers:
  // 1. DE / AE (Civil): Level 1 Operational (all active alerts: streak >= 1)
  const deEligible = allAlerts.filter(a => (a.streak_days || 1) >= 1);

  // 2. EE (Civil): Level 2 Escalation (streak >= 3)
  const eeEligible = allAlerts.filter(a => (a.streak_days || 1) >= 3);

  // 3. SE & CE: Level 3 Escalation (streak >= 7)
  const ceSeEligible = allAlerts.filter(a => (a.streak_days || 1) >= 7);

  // 4. MS: Level 4 Escalation (streak >= 15)
  const msEligible = allAlerts.filter(a => (a.streak_days || 1) >= 15);

  // 5. PS: Level 5 Escalation (streak >= 15)
  const psEligible = allAlerts.filter(a => (a.streak_days || 1) >= 15);

  const getSchemeSet = (alerts: typeof allAlerts) => new Set(alerts.map(a => a.scheme_id));

  console.log('\n======================================================');
  console.log('OFFICIAL DISPATCH BREAKDOWN BASED ON HISTORY STREAKS:');
  console.log('======================================================');
  console.log(`Level 1 (DE / AE Civil): ${deEligible.length} alerts across ${getSchemeSet(deEligible).size} schemes -> ${getSchemeSet(deEligible).size} emails`);
  console.log(`Level 2 (EE Civil):       ${eeEligible.length} alerts across ${getSchemeSet(eeEligible).size} schemes -> ${getSchemeSet(eeEligible).size} emails`);
  console.log(`Level 3 (SE & CE):        ${ceSeEligible.length} alerts across ${getSchemeSet(ceSeEligible).size} schemes -> ${getSchemeSet(ceSeEligible).size * 2} emails (${getSchemeSet(ceSeEligible).size} SE + ${getSchemeSet(ceSeEligible).size} CE)`);
  console.log(`Level 4 (MS MJP):         ${msEligible.length} alerts across ${getSchemeSet(msEligible).size} schemes -> ${getSchemeSet(msEligible).size} emails`);
  console.log(`Level 5 (PS WSSD):        ${psEligible.length} alerts across ${getSchemeSet(psEligible).size} schemes -> ${getSchemeSet(psEligible).size} emails`);

  console.log('\n--- Category Breakdown for Level 2 (EE Civil, streak >= 3) ---');
  console.log({
    lpcd: eeEligible.filter(a => a.category === 'lpcd').length,
    chlorine: eeEligible.filter(a => a.category === 'chlorine').length,
    pressure: eeEligible.filter(a => a.category === 'pressure').length,
    offline: eeEligible.filter(a => a.category === 'offline').length,
    total: eeEligible.length,
  });

  console.log('\n--- Category Breakdown for Level 3 (SE & CE, streak >= 7) ---');
  console.log({
    lpcd: ceSeEligible.filter(a => a.category === 'lpcd').length,
    chlorine: ceSeEligible.filter(a => a.category === 'chlorine').length,
    pressure: ceSeEligible.filter(a => a.category === 'pressure').length,
    offline: ceSeEligible.filter(a => a.category === 'offline').length,
    total: ceSeEligible.length,
  });

  process.exit(0);
}

previewDispatch().catch(console.error);
