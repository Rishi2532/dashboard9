import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDB();
  
  // 1. Schemes with water_supply = 'Yes'
  const opSchemes: any = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIds: string[] = opSchemes.rows.map((r: any) => r.scheme_id);
  console.log('Total operational schemes (water_supply = Yes):', opIds.length);

  const formattedIds = opIds.map(id => `'${id}'`).join(',');

  // 2. Total distinct villages in history for these schemes
  const totalVillages: any = await db.execute(sql.raw(`
    SELECT 
      count(DISTINCT (scheme_id || '_' || LOWER(TRIM(village_name)))) as scheme_village_count
    FROM water_scheme_data_history
    WHERE scheme_id IN (${formattedIds})
  `));
  console.log('Total operational scheme-villages in history:', totalVillages.rows[0]);

  // 3. How many distinct villages are tracked in the 35-day window by streak-engine?
  const streakEngineTotal: any = await db.execute(sql.raw(`
    SELECT 
      count(DISTINCT (h.scheme_id || '_' || LOWER(TRIM(h.village_name)))) as count
    FROM water_scheme_data_history h
    WHERE h.scheme_id IN (${formattedIds})
      AND (
        h.data_date LIKE '%-Oct%' OR h.data_date LIKE '%-Sep%'
      )
  `));
  console.log('Villages with data in Sept/Oct:', streakEngineTotal.rows[0]);

  // 4. Commissioned filter on scheme_status:
  const commRes: any = await db.execute(sql`
    SELECT count(DISTINCT (h.scheme_id || '_' || LOWER(TRIM(h.village_name)))) as count
    FROM water_scheme_data_history h
    JOIN scheme_status s ON s.scheme_id = h.scheme_id
    WHERE s.water_supply = 'Yes' 
      AND TRIM(LOWER(s.fully_completion_scheme_status)) IN ('fully completed', 'completed', 'in progress')
  `);
  console.log('Villages under Commissioned filter (all history):', commRes.rows[0]);

  // 5. Let's run streak engine logic and inspect total processed villages
  const { calculateAllAlertStreaksFromHistory } = await import('../server/services/streak-engine');
  const streaks = await calculateAllAlertStreaksFromHistory(db, true);
  const lpcdAlerts = streaks.allAlerts.filter(a => a.category === 'lpcd');
  console.log('Streak Engine total Low LPCD alerts (streak >= 1):', lpcdAlerts.length);
  console.log('Streak Engine Low LPCD alerts with streak >= 20:', lpcdAlerts.filter(a => a.streak_days >= 20).length);
  console.log('Streak Engine Low LPCD alerts with streak >= 7:', lpcdAlerts.filter(a => a.streak_days >= 7).length);
}

run();
