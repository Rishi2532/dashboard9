import { getDB } from "../server/db";
import { schemeLpcd } from "../shared/schema";
import { sql } from "drizzle-orm";

async function populateVillageStats() {
  console.log("Starting to populate village stats in scheme_lpcd...");
  const db = await getDB();

  try {
    // This query calculates the stats from water_scheme_data for Day 7 
    // and updates the scheme_lpcd table.
    // We use the same logic as the importer.
    
    await db.execute(sql`
      WITH stats AS (
        SELECT 
          scheme_id, 
          block,
          COUNT(DISTINCT CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN village_name END) as below_55,
          COUNT(DISTINCT CASE WHEN lpcd_value_day7 >= 55 THEN village_name END) as above_55,
          COUNT(DISTINCT CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN village_name END) as zero_supply
        FROM water_scheme_data
        GROUP BY scheme_id, block
      )
      UPDATE scheme_lpcd sl
      SET 
        villages_below_55 = stats.below_55,
        villages_above_55 = stats.above_55,
        villages_zero_supply = stats.zero_supply
      FROM stats
      WHERE sl.scheme_id = stats.scheme_id AND sl.block = stats.block
    `);

    console.log("Successfully populated village stats in scheme_lpcd!");
  } catch (error) {
    console.error("Error populating village stats:", error);
  } finally {
    process.exit(0);
  }
}

populateVillageStats();
