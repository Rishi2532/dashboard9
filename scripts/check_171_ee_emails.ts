import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== CHECKING IF EE RECEIVED EMAILS FOR THE 171 CONSISTENT VILLAGES ===\n');

      // 1. Fetch escalation summary data
      const res = await fetch('http://localhost:5000/api/escalation/summary').then(r => r.json());
      const schemes = res.schemes || [];

      // Find all villages with days_count >= 3
      const consistentVillages = [];
      schemes.forEach((s: any) => {
        (s.lpcd_villages || []).forEach((v: any) => {
          if (v.days_count >= 3) {
            consistentVillages.push({
              scheme_id: String(s.scheme_id),
              scheme_name: s.scheme_name,
              village_name: v.village_name,
              streak: v.days_count,
              val: v.avg_val
            });
          }
        });
      });

      console.log(`Total Consistent LPCD Villages (streak >= 3): ${consistentVillages.length}`);

      // 2. Fetch EE dispatches from consolidated_email_dispatches
      const cedRes = await client.query(`
        SELECT id, dispatch_date, engineer_name, engineer_email, scheme_ids, scheme_names,
               lpcd_alerts_count, total_alerts
        FROM consolidated_email_dispatches
        WHERE engineer_role ILIKE '%EE%' OR engineer_role ILIKE '%Executive%'
      `);

      // Schemes that ever had an EE email
      const allEeSchemesWithLpcd = new Map(); // scheme_id -> dispatch
      cedRes.rows.forEach(r => {
        if (r.lpcd_alerts_count > 0) {
          (r.scheme_ids || []).forEach(id => {
            allEeSchemesWithLpcd.set(String(id), r);
          });
        }
      });

      // Schemes that had an EE email on 17-Oct specifically
      const oct17EeSchemesWithLpcd = new Map();
      cedRes.rows.forEach(r => {
        const dStr = r.dispatch_date?.toISOString().slice(0, 10);
        if (r.lpcd_alerts_count > 0 && (dStr === '2026-10-16' || dStr === '2026-10-17')) {
          (r.scheme_ids || []).forEach(id => {
            oct17EeSchemesWithLpcd.set(String(id), r);
          });
        }
      });

      // 3. Scheme by scheme breakdown of the 171 villages
      const schemeBreakdown = new Map();
      consistentVillages.forEach(v => {
        if (!schemeBreakdown.has(v.scheme_id)) {
          schemeBreakdown.set(v.scheme_id, {
            scheme_id: v.scheme_id,
            scheme_name: v.scheme_name,
            villages: [],
            oct17Dispatched: oct17EeSchemesWithLpcd.has(v.scheme_id),
            anyDispatched: allEeSchemesWithLpcd.has(v.scheme_id),
            lpcdInEmail17: oct17EeSchemesWithLpcd.get(v.scheme_id)?.lpcd_alerts_count || 0
          });
        }
        schemeBreakdown.get(v.scheme_id).villages.push(v);
      });

      console.log(`The ${consistentVillages.length} villages are distributed across ${schemeBreakdown.size} schemes:\n`);

      let villagesInOct17EmailedSchemes = 0;
      let villagesInAnyEmailedSchemes = 0;
      let villagesInNeverEmailedSchemes = 0;

      let actualLpcdCountInOct17Emails = 0;

      schemeBreakdown.forEach(s => {
        const count = s.villages.length;
        if (s.oct17Dispatched) {
          villagesInOct17EmailedSchemes += count;
          actualLpcdCountInOct17Emails += s.lpcdInEmail17;
        } else if (s.anyDispatched) {
          villagesInAnyEmailedSchemes += count;
        } else {
          villagesInNeverEmailedSchemes += count;
        }

        console.log(`Scheme: ${s.scheme_id} - ${s.scheme_name}`);
        console.log(`  Consistent Villages: ${count}`);
        console.log(`  EE Email on 17-Oct: ${s.oct17Dispatched ? `YES (lpcd count in email: ${s.lpcdInEmail17})` : 'NO'}`);
      });

      console.log('\n=========================================');
      console.log('SUMMARY OF THE 171 CONSISTENT VILLAGES:');
      console.log('=========================================');
      console.log(`Total Consistent Villages: ${consistentVillages.length}`);
      console.log(`1. Villages in schemes where EE received an email on 17-Oct: ${villagesInOct17EmailedSchemes}`);
      console.log(`   (Note: the email summary count only sampled ${actualLpcdCountInOct17Emails} villages due to the milestone filter)`);
      console.log(`2. Villages in schemes where EE received an email on 15-Oct: ${villagesInAnyEmailedSchemes}`);
      console.log(`3. Villages in schemes where EE was NEVER sent an email: ${villagesInNeverEmailedSchemes}`);

    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
