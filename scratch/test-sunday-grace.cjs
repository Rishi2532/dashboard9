const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Check pastAlertsMap if we skip Sunday or count consecutive dispatch days
    const pastAlertsRes = await client.query(`
      SELECT 
        scheme_id, 
        alert_type, 
        COALESCE(NULLIF(TRIM(village_name), ''), '-') as village_name, 
        COALESCE(NULLIF(TRIM(esr_name), ''), '-') as esr_name, 
        ARRAY_AGG(DISTINCT sent_date::text ORDER BY sent_date::text DESC) as past_dates 
      FROM email_alert_logs 
      WHERE sent_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days' 
        AND sent_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      GROUP BY scheme_id, alert_type, COALESCE(NULLIF(TRIM(village_name), ''), '-'), COALESCE(NULLIF(TRIM(esr_name), ''), '-')
    `);

    let countWithSundayBridged7 = 0;
    let countWithSundayBridged3 = 0;
    const today = new Date();

    // Check each alert
    pastAlertsRes.rows.forEach(r => {
      const pastDates = r.past_dates || [];
      // If yesterday was Sunday and not in pastDates, check if Saturday is present
      let streak = 1;
      let graceUsed = false;
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay(); // 0 is Sunday
        const dStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);

        if (pastDates.includes(dStr)) {
          streak++;
        } else if (dayOfWeek === 0 && !graceUsed) { // Sunday grace
          graceUsed = true;
          streak++;
        } else {
          break;
        }
      }

      if (streak >= 7) countWithSundayBridged7++;
      if (streak >= 3) countWithSundayBridged3++;
    });

    console.log(`With Sunday grace:`);
    console.log(`Alerts with streak >= 3: ${countWithSundayBridged3}`);
    console.log(`Alerts with streak >= 7: ${countWithSundayBridged7}`);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
