import { storage } from "./storage";

async function checkDayWiseDistribution() {
  console.log("📊 Checking Day-Wise Data Distribution\n");
  
  try {
    const data = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
    
    console.log("Days with NON-ZERO data:\n");
    
    const nonZeroRows = data.filter(row => 
      row.offline > 0 || row.below_0_2 > 0 || row.above_0_5 > 0 || row.optimal_0_2_0_5 > 0
    );
    
    console.log("Day | Offline | <0.2 | >0.5 | Optimal | Total");
    console.log("-----|---------|----- |------|---------|------");
    
    nonZeroRows.forEach(row => {
      const total = row.offline + row.below_0_2 + row.above_0_5 + row.optimal_0_2_0_5;
      console.log(
        `${String(row.days).padStart(3)} | ` +
        `${String(row.offline).padStart(7)} | ` +
        `${String(row.below_0_2).padStart(4)} | ` +
        `${String(row.above_0_5).padStart(4)} | ` +
        `${String(row.optimal_0_2_0_5).padStart(7)} | ` +
        `${String(total).padStart(5)}`
      );
    });
    
    console.log(`\n✅ Total days with data: ${nonZeroRows.length} out of 30`);
    
    if (nonZeroRows.length <= 5) {
      console.log("\n⚠️  CONFIRMED: Only " + nonZeroRows.length + " days have non-zero data!");
      console.log("This explains why the user sees '5 days of data'.");
      console.log("\nThe issue is that sensors don't have history beyond " + Math.max(...nonZeroRows.map(r => r.days)) + " consecutive days.");
    } else {
      console.log("\n✅ There are " + nonZeroRows.length + " days with data.");
      console.log("The UI issue might be that the user needs to SCROLL DOWN to see all rows.");
      console.log("The container has max-h-[320px] which limits the visible height.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDayWiseDistribution();
