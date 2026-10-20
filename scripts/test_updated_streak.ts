import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testUpdatedStreak() {
  const db = await getDB();

  // Active pressure alerts on Day 7:
  // p7 < 0.2 AND w7 > 0
  const q = await db.execute(sql`
    SELECT 
      p.scheme_id, p.scheme_name, p.village_name, p.esr_name,
      p.pressure_value_7 as p7, p.pressure_value_6 as p6, p.pressure_value_5 as p5,
      p.pressure_value_4 as p4, p.pressure_value_3 as p3, p.pressure_value_2 as p2,
      p.pressure_value_1 as p1,
      p.number_of_consistent_zero_value_in_pressure,
      wc.water_value_day7 as w7
    FROM pressure_data p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    JOIN communication_status cs ON (
      p.scheme_id = cs.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(cs.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(cs.esr_name, '')))
    )
    JOIN water_consumption wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE (cs.pressure_connected = 'Connected' OR cs.pressure_connected = 'connected')
      AND (cs.pressure_status = 'Online' OR cs.pressure_status = 'online')
      AND p.pressure_value_7 IS NOT NULL
      AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
      AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) >= 0
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7::numeric > 0
  `);

  console.log(`Total active Day 7 pressure alerts in PressureDashboard ("Below Range" on Day 7): ${q.rows.length}`);

  let streakGte1 = 0;
  let streakGte3 = 0;
  let streakGte7 = 0;

  for (const r of q.rows) {
    const pVals = [r.p7, r.p6, r.p5, r.p4, r.p3, r.p2, r.p1];
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const pv = pVals[i] !== null && pVals[i] !== undefined ? parseFloat(String(pVals[i])) : null;
      if (pv !== null && !isNaN(pv) && pv < 0.2 && pv >= 0) {
        streak++;
      } else {
        break;
      }
    }
    if (streak >= 1) streakGte1++;
    if (streak >= 3) streakGte3++;
    if (streak >= 7) streakGte7++;
  }

  console.log(`Streak >= 1 (Level 1): ${streakGte1}`);
  console.log(`Streak >= 3 (Level 2): ${streakGte3}`);
  console.log(`Streak >= 7 (Level 3): ${streakGte7}`);

  process.exit(0);
}

testUpdatedStreak().catch(console.error);
