import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('--- Checking consolidated_email_dispatches ---');
      const cedRes = await client.query(`
        SELECT id, dispatch_date, engineer_name, engineer_email, engineer_role, total_alerts, 
               lpcd_alerts_count, chlorine_alerts_count, pressure_alerts_count, offline_alerts_count,
               scheme_ids, scheme_names, status, created_at
        FROM consolidated_email_dispatches
        ORDER BY created_at DESC
        LIMIT 50
      `);
      console.log('Total consolidated_email_dispatches rows:', cedRes.rows.length);
      cedRes.rows.forEach(r => {
        console.log(`[${r.dispatch_date}] ${r.engineer_role} | ${r.engineer_name} (${r.engineer_email}): ${r.total_alerts} alerts (lpcd:${r.lpcd_alerts_count}, cl:${r.chlorine_alerts_count}, pr:${r.pressure_alerts_count}, off:${r.offline_alerts_count}) | schemes: ${JSON.stringify(r.scheme_names)}`);
      });

      console.log('\n--- Checking scheme_engineer_details EE assignments ---');
      const eeRes = await client.query(`
        SELECT scheme_id, scheme, ee_civil_name, ee_civil_email, ee_civil_mobile, ee_mech_name, ee_mech_email
        FROM scheme_engineer_details
        ORDER BY scheme
      `);
      console.log('Total schemes in scheme_engineer_details:', eeRes.rows.length);
      let missingEe = 0;
      let hasEe = 0;
      eeRes.rows.forEach(r => {
        const hasEmail = Boolean(r.ee_civil_email && r.ee_civil_email.includes('@'));
        if (!hasEmail) {
          missingEe++;
          console.log(`Scheme without EE email: ${r.scheme_id} - ${r.scheme} (Name: ${r.ee_civil_name || 'NONE'})`);
        } else {
          hasEe++;
        }
      });
      console.log(`Schemes with EE email: ${hasEe}, without EE email: ${missingEe}`);

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
