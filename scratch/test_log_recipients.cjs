const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkLogRecipients() {
  const sanitize = (raw) => {
    if (!raw || raw === 'NULL') return [];
    return String(raw).split(/[,;\/\s]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@'));
  };

  const rows = await pool.query(`
    SELECT alert_type, de_ae_civil_email, de_ae_mech_email, ee_civil_email, ee_mech_email, se_email, chief_engineer_email, member_secretary_email, principal_secretary_email
    FROM email_alert_logs
    WHERE sent_date = CURRENT_DATE
  `);

  const categoryMap = {
    lpcd: { all: new Set(), de: new Set(), ee: new Set(), se: new Set(), ce: new Set() },
    chlorine: { all: new Set(), de: new Set(), ee: new Set(), se: new Set(), ce: new Set() },
    pressure: { all: new Set(), de: new Set(), ee: new Set(), se: new Set(), ce: new Set() },
    offline: { all: new Set(), de: new Set(), ee: new Set(), se: new Set(), ce: new Set() },
    total: { all: new Set(), de: new Set(), ee: new Set(), se: new Set(), ce: new Set() }
  };

  for (const r of rows.rows) {
    const at = (r.alert_type || '').toLowerCase();
    let cat = 'offline';
    if (at.includes('lpcd')) cat = 'lpcd';
    else if (at.includes('chlorine')) cat = 'chlorine';
    else if (at.includes('pressure')) cat = 'pressure';

    const de = [...sanitize(r.de_ae_civil_email), ...sanitize(r.de_ae_mech_email)];
    const ee = [...sanitize(r.ee_civil_email), ...sanitize(r.ee_mech_email)];
    const se = sanitize(r.se_email);
    const ce = sanitize(r.chief_engineer_email);

    for (const target of [categoryMap[cat], categoryMap.total]) {
      de.forEach(e => { target.de.add(e); target.all.add(e); });
      ee.forEach(e => { target.ee.add(e); target.all.add(e); });
      se.forEach(e => { target.se.add(e); target.all.add(e); });
      ce.forEach(e => { target.ce.add(e); target.all.add(e); });
    }
  }

  console.log('--- RECIPIENT COUNTS DERIVED DIRECTLY FROM EMAIL_ALERT_LOGS ---');
  for (const [k, v] of Object.entries(categoryMap)) {
    console.log(`${k.toUpperCase().padEnd(10)} | ALL: ${String(v.all.size).padEnd(4)} | DE: ${String(v.de.size).padEnd(4)} | EE: ${String(v.ee.size).padEnd(4)} | SE: ${String(v.se.size).padEnd(4)} | CE: ${String(v.ce.size).padEnd(4)}`);
  }

  await pool.end();
}
checkLogRecipients();
