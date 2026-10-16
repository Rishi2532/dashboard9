const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        ea.engineer_name, 
        ea.engineer_email,
        COUNT(DISTINCT ea.scheme_id) as schemes_count,
        BOOL_OR(ea.alert_type ILIKE '%lpcd%') as has_lpcd,
        BOOL_OR(ea.alert_type ILIKE '%chlorine%') as has_chlorine,
        BOOL_OR(ea.alert_type ILIKE '%pressure%') as has_pressure,
        BOOL_OR(ea.alert_type ILIKE '%offline%') as has_offline
      FROM email_acknowledgements ea
      WHERE ea.sent_date = CURRENT_DATE
      GROUP BY ea.engineer_name, ea.engineer_email
      ORDER BY ea.engineer_name
    `);
    console.log('Total distinct engineers in email_acknowledgements today:', res.rows.length);
    console.table(res.rows.map(r => ({
      name: r.engineer_name,
      schemes: r.schemes_count,
      lpcd: r.has_lpcd,
      cl: r.has_chlorine,
      pr: r.has_pressure,
      off: r.has_offline
    })));

    // Now check consolidated_email_dispatches
    const res2 = await client.query(`
      SELECT 
        engineer_name,
        engineer_email,
        total_schemes,
        lpcd_alerts_count > 0 as has_lpcd,
        chlorine_alerts_count > 0 as has_chlorine,
        pressure_alerts_count > 0 as has_pressure,
        offline_alerts_count > 0 as has_offline,
        status
      FROM consolidated_email_dispatches
      WHERE dispatch_date = CURRENT_DATE
      ORDER BY engineer_name
    `);
    console.log('\nTotal rows in consolidated_email_dispatches today:', res2.rows.length);
    let lpcdEmails = 0, clEmails = 0, prEmails = 0, offEmails = 0;
    res2.rows.forEach(r => {
      if (r.has_lpcd) lpcdEmails++;
      if (r.has_chlorine) clEmails++;
      if (r.has_pressure) prEmails++;
      if (r.has_offline) offEmails++;
    });
    console.log(`Actual Consolidated Emails Sent by Category:`);
    console.log(`  LPCD:     ${lpcdEmails} emails`);
    console.log(`  Chlorine: ${clEmails} emails`);
    console.log(`  Pressure: ${prEmails} emails`);
    console.log(`  Offline:  ${offEmails} emails`);

  } finally {
    client.release();
    pool.end();
  }
}

run();
