
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

  console.log("Analyzing data for regions...");

  for (const region of regions) {
    const totalSchemesRaw = await db.select({ count: sql<number>`count(distinct scheme_id)` }).from(schemeStatuses).where(eq(schemeStatuses.region, region));
    const integratedSchemesRaw = await db.select({ count: sql<number>`count(distinct scheme_id)` }).from(schemeStatuses).where(and(eq(schemeStatuses.region, region), sql`LOWER(TRIM(water_supply)) = 'yes'`));
    
    // 100% Civil? Maybe fully_completion_scheme_status = 'Completed'
    const civilCompletedRaw = await db.select({ count: sql<number>`count(distinct scheme_id)` }).from(schemeStatuses).where(and(eq(schemeStatuses.region, region), sql`TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed')`));

    // Operational/Non-Operational?
    // In getRegionSummary (line 8097), schemes_fully_completed uses water_supply_status = 'Full'
    const operationalRaw = await db.select({ count: sql<number>`count(distinct scheme_id)` }).from(schemeStatuses).where(and(eq(schemeStatuses.region, region), sql`TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'in progress') AND water_supply_status = 'Full'`));
    
    console.log(`Region: ${region}`);
    console.log(`  Total: ${totalSchemesRaw[0].count}`);
    console.log(`  Integrated: ${integratedSchemesRaw[0].count}`);
    console.log(`  100% Civil: ${civilCompletedRaw[0].count}`);
    console.log(`  Operational: ${operationalRaw[0].count}`);
  }

  // Check unique values for statuses to be sure
  const civilStatusesRaw = await db.select({ status: schemeStatuses.fully_completion_scheme_status }).from(schemeStatuses).groupBy(schemeStatuses.fully_completion_scheme_status);
  console.log("Unique fully_completion_scheme_status:", civilStatusesRaw.map(s => s.status));

  const waterSupplyStatusesRaw = await db.select({ status: schemeStatuses.water_supply_status }).from(schemeStatuses).groupBy(schemeStatuses.water_supply_status);
  console.log("Unique water_supply_status:", waterSupplyStatusesRaw.map(s => s.status));

  process.exit(0);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
