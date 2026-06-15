import { getDB } from '../server/db';
import { waterSchemeData } from '../shared/schema';
import { ilike } from 'drizzle-orm';

async function test() {
  const db = await getDB();
  const w = await db.select().from(waterSchemeData).where(ilike(waterSchemeData.village_name, "%Bale%")).limit(5);
  console.log("VILLAGES BALE:", JSON.stringify(w.map(x => ({ name: x.village_name, url: x.dashboard_url })), null, 2));
}

test().then(() => process.exit(0)).catch(console.error);
