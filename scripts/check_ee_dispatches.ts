import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== ALL EE DISPATCHES IN consolidated_email_dispatches ===');
      const eeDispatches = await client.query(`
        SELECT id, dispatch_date, engineer_name, engineer_email, engineer_role, total_alerts,
               lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count, offline_alerts_count,
               scheme_ids, scheme_names, created_at
        FROM consolidated_email_dispatches
        WHERE engineer_role ILIKE '%Executive%' OR engineer_role ILIKE '%EE%'
        ORDER BY dispatch_date DESC, engineer_name ASC
      `);
      console.log('Total EE dispatches count:', eeDispatches.rows.length);
      eeDispatches.rows.forEach((r, idx) => {
        console.log(`${idx + 1}. [Date: ${r.dispatch_date?.toISOString().slice(0, 10)}] ${r.engineer_name} (${r.engineer_email})`);
        console.log(`   Role: ${r.engineer_role}`);
        console.log(`   Schemes (${(r.scheme_names || []).length}): ${JSON.stringify(r.scheme_names)}`);
        console.log(`   Scheme IDs: ${JSON.stringify(r.scheme_ids)}`);
        console.log(`   Alerts: total=${r.total_alerts}, lpcd=${r.lpcd_alerts_count}, chlorine=${r.chlorine_alerts_count}, pressure=${r.pressure_alerts_count}, offline=${r.offline_alerts_count}`);
      });

      console.log('\n=== SUMMARY OF EE DISPATCHES BY CATEGORY ===');
      const lpcdSchemes = new Set();
      const clSchemes = new Set();
      const prSchemes = new Set();
      const offSchemes = new Set();
      const allSchemes = new Set();

      let lpcdEmails = 0;
      let clEmails = 0;
      let prEmails = 0;
      let offEmails = 0;

      eeDispatches.rows.forEach(r => {
        (r.scheme_ids || []).forEach(id => allSchemes.add(String(id)));
        if (r.lpcd_alerts_count > 0) {
          lpcdEmails++;
          (r.scheme_ids || []).forEach(id => lpcdSchemes.add(String(id)));
        }
        if (r.chlorine_alerts_count > 0) {
          clEmails++;
          (r.scheme_ids || []).forEach(id => clSchemes.add(String(id)));
        }
        if (r.pressure_alerts_count > 0) {
          prEmails++;
          (r.scheme_ids || []).forEach(id => prSchemes.add(String(id)));
        }
        if (r.offline_alerts_count > 0) {
          offEmails++;
          (r.scheme_ids || []).forEach(id => offSchemes.add(String(id)));
        }
      });

      console.log(`Total EE Email Dispatches: ${eeDispatches.rows.length}`);
      console.log(`Total Unique Schemes in EE Dispatches: ${allSchemes.size}`);
      console.log(`- LPCD: ${lpcdEmails} emails across ${lpcdSchemes.size} schemes`);
      console.log(`- Chlorine: ${clEmails} emails across ${clSchemes.size} schemes`);
      console.log(`- Pressure: ${prEmails} emails across ${prSchemes.size} schemes`);
      console.log(`- Offline: ${offEmails} emails across ${offSchemes.size} schemes`);

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
