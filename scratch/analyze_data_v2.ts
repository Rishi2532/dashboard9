
import { getDB } from "../server/db";
import { schemeStatuses } from "../shared/schema";
import { sql, and, eq } from "drizzle-orm";

async function analyze() {
  const db = await getDB();
  
  const regions = [
    "Amravati",
    "Nashik",
    "Chhatrapati Sambhajinagar",
    "Nagpur",
    "Pune",
    "Konkan"
  ];

  console.log("Analyzing data for regions (Instrumented view)...");

  for (const regionName of regions) {
    const data = await db.select({
      total_schemes: sql<number>`count(distinct scheme_id)`,
      integrated_schemes: sql<number>`count(distinct scheme_id) filter (where LOWER(TRIM(water_supply)) = 'yes')`,
      civil_100: sql<number>`count(distinct scheme_id) filter (where TRIM(LOWER(fully_completion_scheme_status)) = 'fully completed')`,
      operational: sql<number>`count(distinct scheme_id) filter (where LOWER(TRIM(water_supply)) = 'yes' AND water_supply_status = 'Full')`,
      non_operational: sql<number>`count(distinct scheme_id) filter (where LOWER(TRIM(water_supply)) = 'yes' AND water_supply_status != 'Full')`,
      total_villages: sql<number>`sum(number_of_village) filter (where LOWER(TRIM(water_supply)) = 'yes')`,
      integrated_villages: sql<number>`sum(total_villages_integrated) filter (where LOWER(TRIM(water_supply)) = 'yes')`,
      villages_operational: sql<number>`sum(fully_completed_villages) filter (where LOWER(TRIM(water_supply)) = 'yes')`
    }).from(schemeStatuses).where(eq(schemeStatuses.region, regionName));

    const item = data[0];
    console.log(`Region: ${regionName}`);
    console.log(`  Total Schemes: ${item.total_schemes}`);
    console.log(`  Integrated Schemes: ${item.integrated_schemes}`);
    console.log(`  100% Civil: ${item.civil_100}`);
    console.log(`  Operational: ${item.operational}`);
    console.log(`  Non-Operational: ${item.non_operational}`);
    console.log(`  Total Villages: ${item.total_villages}`);
    console.log(`  Integrated Villages: ${item.integrated_villages}`);
    console.log(`  Villages Operational: ${item.villages_operational}`);
  }

  process.exit(0);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
