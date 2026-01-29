import { storage } from "./storage";
import fs from 'fs';

async function verifyDayWiseAPI() {
  console.log("🔍 Verifying Day-Wise API Response\n");
  
  try {
    // Test without region filter (All Regions)
    console.log("Fetching day-wise breakdown for All Regions...");
    const allRegionsData = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
    
    console.log(`\n✅ Returned ${allRegionsData.length} rows\n`);

    const lines: string[] = [];
    allRegionsData.forEach(row => {
        lines.push(`Day ${row.days}: Offline=${row.offline} Below=${row.below_0_2} Above=${row.above_0_5} Optimal=${row.optimal_0_2_0_5}`);
    });
    fs.writeFileSync('verification_result.txt', lines.join('\n'));
    console.log("Written to verification_result.txt");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyDayWiseAPI();
