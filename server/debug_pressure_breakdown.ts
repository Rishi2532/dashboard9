
import { storage } from "./storage";

async function main() {
  try {
    console.log("Testing getPressureDayWiseBreakdown...");
    // Initialize storage first? Usually storage.initialized promise handles it.
    // But let's verify.
    
    const result = await storage.getPressureDayWiseBreakdown();
    console.log("Result length:", result.length);
    if (result.length > 0) {
        console.log("First row:", result[0]);
    } else {
        console.log("Result is empty array.");
    }
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
  }
}

main().catch(console.error);
