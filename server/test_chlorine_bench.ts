
import { storage } from "./storage";

async function testChlorineFix() {
  try {
    console.log("Testing Chlorine Day Wise Breakdown Calculation...");
    // Call the function with no region to test broadly, or a dummy region
    const result = await storage.getChlorineDayWiseBreakdown();
    console.log(`Success! Retrieved breakdown for ${result.length} buckets.`);
    if (result.length > 0) {
        console.log("Sample bucket:", result[0]);
    }
  } catch (error) {
    console.error("FAILED: Chlorine calculation error:", error);
  }
  process.exit(0);
}

testChlorineFix();
