
import { storage } from "./storage";

async function verifyFix() {
  console.log("Verifying Chlorine Day-Wise Breakdown Fix...");
  
  // We need to find a region or just run for 'All Regions' (undefined)
  // But to be specific, let's try to verify for a known region if possible, or just all.
  // The debug script used a specific scheme. 
  
  const result = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
  
  console.log("Result length:", result.length);
  const nonEmptyDays = result.filter(r => r.offline > 0 || r.below_0_2 > 0 || r.above_0_5 > 0 || r.optimal_0_2_0_5 > 0);
  console.log("Days with data:", nonEmptyDays.map(r => r.days));
  
  if (nonEmptyDays.length > 3) {
    console.log("SUCCESS: Found data for more than 3 days!");
  } else {
    console.log("WARNING: Still only found data for <= 3 days. This might be due to limited data or the fix didn't work.");
  }
}

verifyFix().catch(console.error);
