const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Get the 18 schemes dispatched to EE on 17 Oct 2026
    const ee17 = await client.query(`
      SELECT scheme_ids->>0 as scheme_id, scheme_names->>0 as scheme_name, engineer_name, engineer_email, total_alerts
      FROM consolidated_email_dispatches
      WHERE dispatch_date = '2026-10-17' AND engineer_role ILIKE '%EE%'
      ORDER BY scheme_ids->>0
    `);
    console.log(`Dispatched to EE on 17 Oct: ${ee17.rows.length} schemes`);
    console.table(ee17.rows);

    const eeSchemeIds = new Set(ee17.rows.map(r => r.scheme_id));

    // 2. Query alerts for these schemes from email_alert_logs with Sunday bridge
    const rawAlerts = await client.query(`
      SELECT 
        e.scheme_id,
        e.scheme_name,
        COALESCE(NULLIF(TRIM(e.village_name), ''), '-') as village_name,
        COALESCE(NULLIF(TRIM(e.esr_name), ''), '-') as esr_name,
        e.alert_type,
        ARRAY_AGG(DISTINCT (e.sent_date::date)::text ORDER BY (e.sent_date::date)::text DESC) as dates_seen,
        BOOL_OR(e.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR e.sent_date = CURRENT_DATE) as is_today_alert,
        MAX(e.alert_value) as latest_val
      FROM email_alert_logs e
      WHERE e.scheme_id = ANY($1)
      GROUP BY e.scheme_id, e.scheme_name, e.village_name, e.esr_name, e.alert_type
    `, [Array.from(eeSchemeIds)]);

    console.log(`Alert groups found for EE schemes: ${rawAlerts.rows.length}`);

    const formatIST = (d) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);

    const today = new Date();

    const alertsWithStreaks = rawAlerts.rows.map(row => {
      const datesSeen = (row.dates_seen || []).map(d => String(d).split('T')[0].trim());
      const hasToday = Boolean(row.is_today_alert) || datesSeen.includes(formatIST(today));

      let consecutivePastDays = 0;
      let sundayBridged = false;
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = formatIST(d);
        if (datesSeen.includes(dStr)) {
          consecutivePastDays++;
        } else if (d.getDay() === 0 && !sundayBridged) {
          sundayBridged = true;
          consecutivePastDays++;
        } else {
          break;
        }
      }
      const days = hasToday ? (1 + consecutivePastDays) : (consecutivePastDays > 0 ? consecutivePastDays : 1);
      return {
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        village_name: row.village_name,
        esr_name: row.esr_name,
        alert_type: row.alert_type,
        streak_days: days,
        latest_val: row.latest_val
      };
    });

    console.log(`Sample alerts for EE with new streak calculation:`);
    console.table(alertsWithStreaks.slice(0, 10));

    const schemesWithStreak3 = new Set(alertsWithStreaks.filter(a => a.streak_days >= 3).map(a => a.scheme_id));
    console.log(`Number of EE schemes with alerts streak >= 3: ${schemesWithStreak3.size} / 18`);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
