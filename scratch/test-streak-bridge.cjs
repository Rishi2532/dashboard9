const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const rawRes = await client.query(`
      SELECT 
        e.scheme_id,
        e.scheme_name,
        e.alert_type,
        ARRAY_AGG(DISTINCT (e.sent_date::date)::text ORDER BY (e.sent_date::date)::text DESC) as dates_seen,
        BOOL_OR(e.sent_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR e.sent_date = CURRENT_DATE) as is_today_alert
      FROM email_alert_logs e
      WHERE e.sent_date >= CURRENT_DATE - 30 * INTERVAL '1 day'
      GROUP BY e.scheme_id, e.scheme_name, e.village_name, e.esr_name, e.alert_type
    `);

    const formatIST = (d) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);

    let countOldStreak7 = 0;
    let countNewStreak7 = 0;
    let countNewStreak3 = 0;

    const today = new Date();

    rawRes.rows.forEach(row => {
      const datesSeen = (row.dates_seen || []).map(d => String(d).split('T')[0].trim());
      const hasToday = Boolean(row.is_today_alert) || datesSeen.includes(formatIST(today));

      // Old streak logic
      let oldConsecutive = 0;
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (datesSeen.includes(formatIST(d))) {
          oldConsecutive++;
        } else {
          break;
        }
      }
      const oldDays = hasToday ? (1 + oldConsecutive) : (oldConsecutive > 0 ? oldConsecutive : 1);
      if (oldDays >= 7) countOldStreak7++;

      // New streak logic bridging Sunday / non-dispatch days
      let newConsecutive = 0;
      let sundayBridged = false;
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = formatIST(d);
        if (datesSeen.includes(dStr)) {
          newConsecutive++;
        } else if (d.getDay() === 0 && !sundayBridged) {
          // Sunday is a non-dispatch weekend day; bridge it
          sundayBridged = true;
          newConsecutive++;
        } else {
          break;
        }
      }
      const newDays = hasToday ? (1 + newConsecutive) : (newConsecutive > 0 ? newConsecutive : 1);
      if (newDays >= 7) countNewStreak7++;
      if (newDays >= 3) countNewStreak3++;
    });

    console.log(`Total alert rows: ${rawRes.rows.length}`);
    console.log(`Old Streak >= 7: ${countOldStreak7}`);
    console.log(`New Streak >= 7 (with Sunday bridge): ${countNewStreak7}`);
    console.log(`New Streak >= 3 (with Sunday bridge): ${countNewStreak3}`);

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
