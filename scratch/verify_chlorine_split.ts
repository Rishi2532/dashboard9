import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDB();

  // Let's get the 41 operational scheme IDs
  const opSchemes: any = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIdSet = new Set(opSchemes.rows.map((r: any) => String(r.scheme_id).trim()));

  // Let's check how many sensors in storage.getChlorineSensorsByDayWiseCriteria are in opIdSet vs not
  const { storage } = await import('../server/storage');
  
  console.log("Fetching sensors below 0.2 for 20 days from storage...");
  const sensorsBelow20 = await storage.getChlorineSensorsByDayWiseCriteria('below_0_2', 20);
  console.log(`Total sensors returned for below_0_2 for 20 days: ${sensorsBelow20.length}`);
  
  const opBelow20 = sensorsBelow20.filter((s: any) => opIdSet.has(String(s.scheme_id).trim()));
  const nonOpBelow20 = sensorsBelow20.filter((s: any) => !opIdSet.has(String(s.scheme_id).trim()));
  console.log(`- In Operational schemes (water_supply = 'Yes'): ${opBelow20.length}`);
  console.log(`- In Non-Operational schemes: ${nonOpBelow20.length}`);

  console.log("\nFetching sensors above 0.5 for 20 days from storage...");
  const sensorsAbove20 = await storage.getChlorineSensorsByDayWiseCriteria('above_0_5', 20);
  console.log(`Total sensors returned for above_0_5 for 20 days: ${sensorsAbove20.length}`);
  const opAbove20 = sensorsAbove20.filter((s: any) => opIdSet.has(String(s.scheme_id).trim()));
  const nonOpAbove20 = sensorsAbove20.filter((s: any) => !opIdSet.has(String(s.scheme_id).trim()));
  console.log(`- In Operational schemes (water_supply = 'Yes'): ${opAbove20.length}`);
  console.log(`- In Non-Operational schemes: ${nonOpAbove20.length}`);
}

run();
