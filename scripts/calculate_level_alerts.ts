import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/escalation/summary').then(r => r.json());
    const schemes = res.schemes || [];

    console.log(`=== CALCULATING QUALIFYING ALERTS & SCHEMES PER LEVEL ===\n`);

    // We have 5 levels:
    // Level 1: streak >= 1
    // Level 2: streak >= 3
    // Level 3: streak >= 7
    // Level 4: streak >= 15
    // Level 5: streak >= 15

    const levels = [
      { level: 1, minStreak: 1, name: 'Level 1: DE / AE' },
      { level: 2, minStreak: 3, name: 'Level 2: EE' },
      { level: 3, minStreak: 7, name: 'Level 3: SE / CE' },
      { level: 4, minStreak: 15, name: 'Level 4: MS' },
      { level: 5, minStreak: 15, name: 'Level 5: PS' }
    ];

    levels.forEach(lvl => {
      let lpcdCount = 0;
      let chlorineCount = 0;
      let pressureCount = 0;
      let offlineCount = 0;

      const lpcdSchemes = new Set();
      const chlorineSchemes = new Set();
      const pressureSchemes = new Set();
      const offlineSchemes = new Set();
      const allSchemes = new Set();

      schemes.forEach((s: any) => {
        // LPCD
        (s.lpcd_villages || []).forEach((v: any) => {
          if (v.days_count >= lvl.minStreak) {
            lpcdCount++;
            lpcdSchemes.add(s.scheme_id);
            allSchemes.add(s.scheme_id);
          }
        });

        // Chlorine
        (s.chlorine_low_esrs || []).forEach((e: any) => {
          if (e.days_count >= lvl.minStreak) {
            chlorineCount++;
            chlorineSchemes.add(s.scheme_id);
            allSchemes.add(s.scheme_id);
          }
        });
        (s.chlorine_high_esrs || []).forEach((e: any) => {
          if (e.days_count >= lvl.minStreak) {
            chlorineCount++;
            chlorineSchemes.add(s.scheme_id);
            allSchemes.add(s.scheme_id);
          }
        });

        // Pressure
        (s.pressure_low_esrs || []).forEach((e: any) => {
          if (e.days_count >= lvl.minStreak) {
            pressureCount++;
            pressureSchemes.add(s.scheme_id);
            allSchemes.add(s.scheme_id);
          }
        });

        // Offline
        (s.offline_esrs || []).forEach((e: any) => {
          if (e.days_count >= lvl.minStreak) {
            offlineCount++;
            offlineSchemes.add(s.scheme_id);
            allSchemes.add(s.scheme_id);
          }
        });
      });

      console.log(`--- ${lvl.name} (min streak >= ${lvl.minStreak} days) ---`);
      console.log(`Total Schemes Qualifying: ${allSchemes.size}`);
      console.log(`LPCD: ${lpcdCount} alerts across ${lpcdSchemes.size} schemes`);
      console.log(`Chlorine: ${chlorineCount} alerts across ${chlorineSchemes.size} schemes`);
      console.log(`Pressure: ${pressureCount} alerts across ${pressureSchemes.size} schemes`);
      console.log(`Offline: ${offlineCount} alerts across ${offlineSchemes.size} schemes`);
      console.log(`Total Alerts: ${lpcdCount + chlorineCount + pressureCount + offlineCount}\n`);
    });

  } catch (e: any) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
