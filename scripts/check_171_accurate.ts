import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  try {
    const client = await pool.connect();
    try {
      // 1. Fetch EE dispatches from consolidated_email_dispatches
      const cedRes = await client.query(`
        SELECT id, dispatch_date, engineer_name, engineer_email, scheme_ids, scheme_names,
               lpcd_alerts_count, total_alerts
        FROM consolidated_email_dispatches
        WHERE (engineer_role ILIKE '%EE%' OR engineer_role ILIKE '%Executive%')
      `);
      console.log('Total EE dispatches in DB:', cedRes.rows.length);

      // Create a map: scheme_id -> dispatch records
      const schemeToDispatches = new Map();
      cedRes.rows.forEach(r => {
        const sids = Array.isArray(r.scheme_ids) ? r.scheme_ids : JSON.parse(r.scheme_ids || '[]');
        sids.forEach(id => {
          const sid = String(id).trim();
          if (!schemeToDispatches.has(sid)) schemeToDispatches.set(sid, []);
          schemeToDispatches.get(sid).push(r);
        });
      });
      console.log('Distinct scheme IDs covered in EE dispatches:', schemeToDispatches.size);

      // 2. Fetch escalation summary from running server
      const res = await fetch('http://localhost:5000/api/escalation/summary').then(r => r.json());
      const schemes = res.schemes || [];

      // Find all villages with days_count >= 3
      const consistentVillages = [];
      schemes.forEach((s: any) => {
        (s.lpcd_villages || []).forEach((v: any) => {
          if (v.days_count >= 3) {
            consistentVillages.push({
              scheme_id: String(s.scheme_id).trim(),
              scheme_name: s.scheme_name,
              village_name: v.village_name,
              streak: v.days_count,
              val: v.avg_val
            });
          }
        });
      });

      console.log(`Total Consistent LPCD Villages (streak >= 3): ${consistentVillages.length}`);

      // Scheme stats
      const schemeStats = new Map();
      let countWithLpcdEmail = 0;
      let countWithOtherEmail = 0;
      let countWithNoEmail = 0;

      consistentVillages.forEach(v => {
        const dispatches = schemeToDispatches.get(v.scheme_id) || [];
        const hasLpcd = dispatches.some(d => d.lpcd_alerts_count > 0);
        const hasAny = dispatches.length > 0;

        if (!schemeStats.has(v.scheme_id)) {
          schemeStats.set(v.scheme_id, {
            scheme_id: v.scheme_id,
            scheme_name: v.scheme_name,
            village_count: 0,
            dispatches
          });
        }
        schemeStats.get(v.scheme_id).village_count++;

        if (hasLpcd) {
          countWithLpcdEmail++;
        } else if (hasAny) {
          countWithOtherEmail++;
        } else {
          countWithNoEmail++;
        }
      });

      console.log('\n=== SCHEME-BY-SCHEME BREAKDOWN OF 171 VILLAGES ===');
      schemeStats.forEach(s => {
        const lpcdDispatches = s.dispatches.filter(d => d.lpcd_alerts_count > 0);
        const otherDispatches = s.dispatches.filter(d => d.lpcd_alerts_count === 0);
        let status = 'NO EMAIL TO EE';
        if (lpcdDispatches.length > 0) {
          const details = lpcdDispatches.map(d => `${d.dispatch_date?.toISOString().slice(0,10)} (${d.lpcd_alerts_count} lpcd)`).join(', ');
          status = `EE RECEIVED EMAIL -> ${details}`;
        } else if (otherDispatches.length > 0) {
          status = `EE RECEIVED EMAIL BUT LPCD=0 (Only Chlorine/Pressure sent)`;
        }
        console.log(`- ${s.scheme_id}: ${s.scheme_name} (${s.village_count} villages) -> ${status}`);
      });

      console.log('\n=========================================');
      console.log('FINAL AUDIT: DID EE RECEIVE EMAILS FOR 171?');
      console.log('=========================================');
      console.log(`Total Consistent Villages (streak >= 3): ${consistentVillages.length}`);
      console.log(`1. In schemes where EE received an email with LPCD alerts: ${countWithLpcdEmail} villages`);
      console.log(`2. In schemes where EE received an email for OTHER alerts (LPCD omitted): ${countWithOtherEmail} villages`);
      console.log(`3. In schemes where EE was NEVER emailed: ${countWithNoEmail} villages`);

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
