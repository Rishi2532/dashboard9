
import { getDB } from "./db";
import { sql } from "drizzle-orm";
import { schemeLpcd } from "../shared/schema";

async function repopulateStats() {
  console.log("Repopulating village stats for scheme_lpcd table...");
  const db = await getDB();
  
  // Fetch all schemes
  const schemes = await db.select().from(schemeLpcd);
  console.log(`Found ${schemes.length} schemes to update.`);
  
  let updated = 0;
  for (const scheme of schemes) {
    try {
      const villageStatsResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN village_name END) as below_55_day7,
          COUNT(DISTINCT CASE WHEN lpcd_value_day7 >= 55 THEN village_name END) as above_55_day7,
          COUNT(DISTINCT CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN village_name END) as zero_day7
        FROM water_scheme_data 
        WHERE scheme_id = ${scheme.scheme_id} AND block = ${scheme.block}
      `);
      
      const stats = villageStatsResult.rows[0] || {};
      
      await db.update(schemeLpcd)
        .set({
          villages_below_55: Number(stats.below_55_day7) || 0,
          villages_above_55: Number(stats.above_55_day7) || 0,
          villages_zero_supply: Number(stats.zero_day7) || 0,
        })
        .where(sql`scheme_id = ${scheme.scheme_id} AND block = ${scheme.block}`);
      
      updated++;
      if (updated % 20 === 0) console.log(`Updated ${updated}/${schemes.length} schemes...`);
    } catch (err) {
      console.error(`Error updating scheme ${scheme.scheme_id}:`, err);
    }
  }
  
  console.log(`Successfully updated ${updated} schemes.`);
  process.exit(0);
}

repopulateStats().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
