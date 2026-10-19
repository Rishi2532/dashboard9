import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== EXACT SCHEME-WISE AUDIT OF EE RECEIPT ===\n');

      // 1. Get all schemes from scheme_engineer_details
      const sedRes = await client.query(`
        SELECT sed.scheme_id, sed.scheme, sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile
        FROM scheme_engineer_details sed
        ORDER BY sed.scheme
      `);

      // 2. Get dispatches from consolidated_email_dispatches for EE on 17-Oct (or 16-Oct UTC)
      const cedRes = await client.query(`
        SELECT id, dispatch_date, engineer_name, engineer_email, scheme_ids, scheme_names,
               lpcd_alerts_count, total_alerts
        FROM consolidated_email_dispatches
        WHERE (engineer_role ILIKE '%EE%' OR engineer_role ILIKE '%Executive%')
          AND (dispatch_date = '2026-10-17' OR dispatch_date = '2026-10-16' OR (dispatch_date AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17')
      `);

      // Build a map of scheme_id -> dispatch info for EE
      const eeDispatchMap = new Map();
      cedRes.rows.forEach(r => {
        (r.scheme_ids || []).forEach(id => {
          eeDispatchMap.set(String(id), r);
        });
      });

      // 3. Get LPCD alerts logged on 17-Oct from email_alert_logs
      const ealRes = await client.query(`
        SELECT scheme_id, scheme_name, count(*) as lpcd_alerts
        FROM email_alert_logs
        WHERE (sent_date = '2026-10-17' OR (sent_date AT TIME ZONE 'Asia/Kolkata')::date = '2026-10-17')
          AND alert_type ILIKE '%lpcd%'
        GROUP BY scheme_id, scheme_name
      `);
      const ealMap = new Map();
      ealRes.rows.forEach(r => {
        ealMap.set(String(r.scheme_id), parseInt(r.lpcd_alerts, 10));
      });

      console.log(`Total Schemes in Master: ${sedRes.rows.length}`);
      console.log(`Schemes with LPCD alerts logged on 17-Oct: ${ealRes.rows.length}`);
      console.log(`Schemes where EE received email dispatch on 17-Oct: ${eeDispatchMap.size}\n`);

      let receivedLpcdCount = 0;
      let receivedAnyCount = 0;
      let notReceivedCount = 0;

      const results = [];

      sedRes.rows.forEach(s => {
        const sid = String(s.scheme_id);
        const lpcdAlerts = ealMap.get(sid) || 0;
        const eeDispatch = eeDispatchMap.get(sid);

        const hasEeEmail = Boolean(s.ee_civil_email && s.ee_civil_email.includes('@'));
        let status = 'NOT SENT';
        let lpcdInEmail = 0;

        if (eeDispatch) {
          receivedAnyCount++;
          lpcdInEmail = eeDispatch.lpcd_alerts_count || 0;
          if (lpcdInEmail > 0) {
            receivedLpcdCount++;
            status = 'RECEIVED (LPCD Included)';
          } else {
            status = 'RECEIVED (Other Alerts Only, LPCD=0)';
          }
        } else {
          notReceivedCount++;
          status = 'NOT SENT (Filtered/Off-cadence)';
        }

        results.push({
          scheme_id: sid,
          scheme_name: s.scheme,
          ee_name: s.ee_civil_name || 'Unassigned',
          ee_email: s.ee_civil_email || 'None',
          lpcd_alerts_in_system: lpcdAlerts,
          ee_received: Boolean(eeDispatch),
          lpcd_in_ee_email: lpcdInEmail,
          status
        });
      });

      console.log('--- DETAILED SCHEME-WISE LIST ---');
      results.forEach((r, idx) => {
        console.log(`${idx + 1}. [${r.status}]`);
        console.log(`   Scheme: ${r.scheme_id} - ${r.scheme_name}`);
        console.log(`   EE Assigned: ${r.ee_name} (${r.ee_email})`);
        console.log(`   LPCD Alerts: in system=${r.lpcd_alerts_in_system}, in EE email=${r.lpcd_in_ee_email}`);
      });

      console.log('\n=== SUMMARY COUNT (SCHEME-WISE) ===');
      console.log(`Total Schemes Checked: ${results.length}`);
      console.log(`Schemes with LPCD Alerts in System: ${results.filter(r => r.lpcd_alerts_in_system > 0).length}`);
      console.log(`Schemes where EE received email with LPCD alerts: ${receivedLpcdCount}`);
      console.log(`Schemes where EE received email (all categories): ${receivedAnyCount}`);
      console.log(`Schemes where EE did NOT receive email: ${notReceivedCount}`);

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
