import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkThe6() {
  const db = await getDB();

  const q = await db.execute(sql`
    SELECT 
      pd.scheme_id, pd.village_name, pd.esr_name,
      pd.pressure_value_7 as p7, pd.pressure_value_6 as p6, pd.pressure_value_5 as p5,
      pd.pressure_value_4 as p4, pd.pressure_value_3 as p3, pd.pressure_value_2 as p2,
      pd.pressure_value_1 as p1,
      pd.number_of_consistent_zero_value_in_pressure,
      cs.pressure_connected, cs.pressure_status,
      wc.water_value_day7 as w7
    FROM pressure_data pd
    LEFT JOIN communication_status cs ON (
      pd.scheme_id = cs.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(cs.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(cs.esr_name))
    )
    LEFT JOIN water_consumption wc ON (
      pd.scheme_id = wc.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    JOIN scheme_status ss ON ss.scheme_id = pd.scheme_id AND ss.water_supply = 'Yes'
    WHERE (cs.pressure_connected = 'Connected' OR cs.pressure_connected = 'connected')
      AND (cs.pressure_status = 'Online' OR cs.pressure_status = 'online')
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7 > 0
  `);

  const results: any[] = [];
  for (const r of q.rows) {
    const isZero = Number(r.number_of_consistent_zero_value_in_pressure) === 7;
    const vals = [
      parseFloat(String(r.p1 || 0)),
      parseFloat(String(r.p2 || 0)),
      parseFloat(String(r.p3 || 0)),
      parseFloat(String(r.p4 || 0)),
      parseFloat(String(r.p5 || 0)),
      parseFloat(String(r.p6 || 0)),
      parseFloat(String(r.p7 || 0)),
    ];
    const isBelow = vals.every(v => v > 0 && v < 0.2);

    if (isZero || isBelow) {
      // Calculate streak backwards from Day 7 (index 6 to 0)
      const pReverse = [r.p7, r.p6, r.p5, r.p4, r.p3, r.p2, r.p1];
      let streak = 0;
      for (let i = 0; i < 7; i++) {
        const pv = pReverse[i] !== null && pReverse[i] !== undefined ? parseFloat(String(pReverse[i])) : null;
        if (pv !== null && !isNaN(pv) && pv < 0.2 && pv >= 0) {
          streak++;
        } else {
          break;
        }
      }
      results.push({
        scheme_id: r.scheme_id,
        village: r.village_name,
        esr: r.esr_name,
        isZero,
        isBelow,
        p7: r.p7,
        streak,
        pReverse
      });
    }
  }

  console.log(`Total Consistent Low in PressureDashboard: ${results.length}`);
  const streak7 = results.filter(r => r.streak === 7);
  const streakLess7 = results.filter(r => r.streak < 7);

  console.log(`Streak = 7: ${streak7.length}`);
  console.log(`Streak < 7: ${streakLess7.length}`);
  console.table(streakLess7);

  process.exit(0);
}

checkThe6().catch(console.error);
