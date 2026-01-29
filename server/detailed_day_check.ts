import { storage } from "./storage";

async function detailedDayCheck() {
  console.log("🔍 DETAILED Day-Wise Check\n");
  
  try {
    const data = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
    
    console.log("Complete breakdown (showing first 15 days):\n");
    console.log("Day | Offline | <0.2 | >0.5 | Optimal | Total | Status");
    console.log("----|---------|------|------|---------|-------|--------");
    
    let daysWithData = 0;
    const firstFifteen = data.slice(0, 15);
    
    firstFifteen.forEach(row => {
      const total = row.offline + row.below_0_2 + row.above_0_5 + row.optimal_0_2_0_5;
      const hasData = total > 0;
      if (hasData) daysWithData++;
      
      console.log(
        `${String(row.days).padStart(3)} | ` +
        `${String(row.offline).padStart(7)} | ` +
        `${String(row.below_0_2).padStart(4)} | ` +
        `${String(row.above_0_5).padStart(4)} | ` +
        `${String(row.optimal_0_2_0_5).padStart(7)} | ` +
        `${String(total).padStart(5)} | ` +
        `${hasData ? '✓ HAS DATA' : '  (empty)'}`
      );
    });
    
    console.log(`\n📊 Days with data (in first 15): ${daysWithData}`);
    
    // Also show total
    const allDaysWithData = data.filter(r => 
      r.offline > 0 || r.below_0_2 > 0 || r.above_0_5 > 0 || r.optimal_0_2_0_5 > 0
    );
    
    console.log(`📊 Days with data (total): ${allDaysWithData.length}`);
    console.log(`\nDays that have data: ${allDaysWithData.map(r => r.days).join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

detailedDayCheck();
