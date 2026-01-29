import { storage } from "./storage";

async function checkDays1to7() {
  console.log("Checking Days 1-7 in detail:\n");
  
  try {
    const data = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
    
    // Get days 1-7
    const days1to7 = data.filter(r => r.days >= 1 && r.days <= 7);
    
    console.log("Day | Offline | <0.2 | >0.5 | Optimal | Total");
    console.log("----|---------|------|------|---------|------");
    
    days1to7.forEach(row => {
      const total = row.offline + row.below_0_2 + row.above_0_5 + row.optimal_0_2_0_5;
      console.log(
        `  ${row.days} | ` +
        `${String(row.offline).padStart(7)} | ` +
        `${String(row.below_0_2).padStart(4)} | ` +
        `${String(row.above_0_5).padStart(4)} | ` +
        `${String(row.optimal_0_2_0_5).padStart(7)} | ` +
        `${String(total).padStart(5)}`
      );
    });
    
    const nonZero = days1to7.filter(r => 
      r.offline > 0 || r.below_0_2 > 0 || r.above_0_5 > 0 || r.optimal_0_2_0_5 > 0
    );
    
    console.log(`\n✅ Days 1-7 with non-zero data: ${nonZero.length}`);
    console.log(`   Which days: ${nonZero.map(r => r.days).join(', ')}`);
    
    if (nonZero.length === 5) {
      console.log("\n⚠️  FOUND THE ISSUE: Only 5 days have non-zero data!");
      console.log("   User is correct - there are only 5 days of actual data visible.");
    } else if (nonZero.length === 6) {
      console.log("\n   User should see 6 days, but reports seeing only 5.");
      console.log("   They may be missing one day in the UI.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDays1to7();
