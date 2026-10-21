import { getDB } from '../server/db';
import { getEscalationStatus } from '../server/services/escalation-service';

async function checkAccurateCounts() {
  const db = await getDB();
  const { schemes } = await getEscalationStatus();

  console.log(`Loaded ${schemes.length} schemes.\n`);

  const thresholds = [1, 3, 7, 15, 20];

  for (const t of thresholds) {
    let lpcdVillages = 0;
    const lpcdSchemes = new Set<string>();

    let chlorineEsrs = 0;
    const chlorineSchemes = new Set<string>();

    let pressureEsrs = 0;
    const pressureSchemes = new Set<string>();

    let offlineSensors = 0;
    const offlineSchemes = new Set<string>();

    const allTierSchemes = new Set<string>();

    // BUGGY LOGIC (current in level5-summary):
    // filtering scheme by s.max_streak_days >= t, then including all items
    let buggyLpcdVillages = 0;
    let buggyChlorineEsrs = 0;
    let buggyPressureEsrs = 0;
    const buggySchemes = schemes.filter(s => (s.max_streak_days || 0) >= t);
    buggySchemes.forEach(s => {
      buggyLpcdVillages += (s.lpcd_villages || []).length;
      buggyChlorineEsrs += (s.chlorine_low_esrs || []).length + (s.chlorine_high_esrs || []).length;
      buggyPressureEsrs += (s.pressure_low_esrs || []).length;
    });

    // CORRECT LOGIC:
    // filtering each village / ESR by its own days_count >= t
    schemes.forEach(s => {
      const sid = String(s.scheme_id);

      (s.lpcd_villages || []).forEach(v => {
        if ((v.days_count || 1) >= t) {
          lpcdVillages++;
          lpcdSchemes.add(sid);
          allTierSchemes.add(sid);
        }
      });

      (s.chlorine_low_esrs || []).forEach(c => {
        if ((c.days_count || 1) >= t) {
          chlorineEsrs++;
          chlorineSchemes.add(sid);
          allTierSchemes.add(sid);
        }
      });
      (s.chlorine_high_esrs || []).forEach(c => {
        if ((c.days_count || 1) >= t) {
          chlorineEsrs++;
          chlorineSchemes.add(sid);
          allTierSchemes.add(sid);
        }
      });

      (s.pressure_low_esrs || []).forEach(p => {
        if ((p.days_count || 1) >= t) {
          pressureEsrs++;
          pressureSchemes.add(sid);
          allTierSchemes.add(sid);
        }
      });

      (s.offline_esrs || []).forEach(o => {
        if ((o.days_count || 1) >= t) {
          offlineSensors++;
          offlineSchemes.add(sid);
          allTierSchemes.add(sid);
        }
      });
    });

    console.log(`=== STREAK >= ${t} DAYS ===`);
    console.log(`CURRENT BUGGY LEVEL 5 PORTAL (scheme-level max_streak >= ${t}):`);
    console.log(`  LPCD Villages: ${buggyLpcdVillages} (across ${buggySchemes.length} schemes)`);
    console.log(`  Chlorine ESRs: ${buggyChlorineEsrs}`);
    console.log(`  Pressure ESRs: ${buggyPressureEsrs}`);

    console.log(`CORRECT (each item's own streak days_count >= ${t}):`);
    console.log(`  LPCD Villages: ${lpcdVillages} (across ${lpcdSchemes.size} schemes)`);
    console.log(`  Chlorine ESRs: ${chlorineEsrs} (across ${chlorineSchemes.size} schemes)`);
    console.log(`  Pressure ESRs: ${pressureEsrs} (across ${pressureSchemes.size} schemes)`);
    console.log(`  Offline ESRs:  ${offlineSensors} (across ${offlineSchemes.size} schemes)`);
    console.log(`  Total qualifying schemes: ${allTierSchemes.size}\n`);
  }

  process.exit(0);
}

checkAccurateCounts().catch(console.error);
