import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDB();
  const { calculateAllAlertStreaksFromHistory } = await import('../server/services/streak-engine');
  const streaks = await calculateAllAlertStreaksFromHistory(db, true);
  const lpcd20Plus = streaks.allAlerts.filter(a => a.category === 'lpcd' && a.streak_days >= 20);
  
  console.log(`Streak Engine count >= 20 days: ${lpcd20Plus.length}`);

  // Let's inspect a few of these 149 villages to see their LPCD values over the 20 days:
  // e.g. how many have exclusively 0 LPCD, how many have exclusively 0 < lpcd < 55, and how many have a mix of 0 and >0!
}

run();
