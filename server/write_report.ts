import { storage } from "./storage";
import fs from "fs";

async function writeDetailedReport() {
  console.log("Writing detailed report...");
  
  try {
    const data = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
    
    let output = "DAY-WISE BREAKDOWN REPORT\n";
    output += "=" .repeat(80) + "\n\n";
    output += "Day | Offline | <0.2 | >0.5 | Optimal | Total | Status\n";
    output += "----|---------|------|------|---------|-------|--------\n";
    
    const firstFifteen = data.slice(0, 15);
    
    firstFifteen.forEach(row => {
      const total = row.offline + row.below_0_2 + row.above_0_5 + row.optimal_0_2_0_5;
      const hasData = total > 0;
      
      output += `${String(row.days).padStart(3)} | ` +
        `${String(row.offline).padStart(7)} | ` +
        `${String(row.below_0_2).padStart(4)} | ` +
        `${String(row.above_0_5).padStart(4)} | ` +
        `${String(row.optimal_0_2_0_5).padStart(7)} | ` +
        `${String(total).padStart(5)} | ` +
        `${hasData ? '✓ HAS DATA' : '  (empty)'}\n`;
    });
    
    const allDaysWithData = data.filter(r => 
      r.offline > 0 || r.below_0_2 > 0 || r.above_0_5 > 0 || r.optimal_0_2_0_5 > 0
    );
    
    output += `\n${"=".repeat(80)}\n`;
    output += `Total days with data: ${allDaysWithData.length}\n`;
    output += `Days: ${allDaysWithData.map(r => r.days).join(', ')}\n`;
    
    fs.writeFileSync('day_wise_report.txt', output);
    console.log("✅ Report written to day_wise_report.txt");
    console.log(`\nFound ${allDaysWithData.length} days with data: ${allDaysWithData.map(r => r.days).join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

writeDetailedReport();
