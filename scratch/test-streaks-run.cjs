const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Get pastAlertsMap exactly like daily-alerts.ts
    const pastAlertsMap = new Map();
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
    (pastAlertsRes.rows || []).forEach(r => {
      const key = `${r.scheme_id}|${r.alert_type}|${r.village_name}|${r.esr_name}`.toLowerCase();
      pastAlertsMap.set(key, r.past_dates || []);
    });

    console.log(`Loaded ${pastAlertsMap.size} past alert history entries.`);

    // Test a few entries in pastAlertsMap
    let sampleCount = 0;
    for (const [k, v] of pastAlertsMap.entries()) {
      if (v.length >= 3 && sampleCount < 5) {
        console.log(`Sample pastDates for ${k}:`, v);
        sampleCount++;
      }
    }

    // Now test getAlertStreak for today's date
    const today = new Date();
    console.log('Today is:', today.toISOString());
    console.log('Yesterday dStr should be:', new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(today.getTime() - 24 * 3600 * 1000)));

    // Let's see what streak is returned for those keys!
    for (const [k, pastDates] of pastAlertsMap.entries()) {
      let streak = 1;
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
        if (pastDates.includes(dStr)) {
          streak++;
        } else {
          break;
        }
      }
      if (streak >= 7) {
        console.log(`FOUND STREAK >= 7! Key: ${k}, streak: ${streak}`);
      }
    }
    console.log('Finished testing streaks.');

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
