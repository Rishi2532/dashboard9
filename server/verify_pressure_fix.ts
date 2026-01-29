
import { storage } from "./storage";

async function verifyPressureFix() {
  try {
    console.log("Starting verification of Pressure Logic Fix...");

    // Test 1: Offline Sensors (Limit check, Data validation)
    console.log("\nTest 1: Fetching Offline sensors (>= 1 day)...");
    const offlineSensors = await storage.getPressureSensorsByDayWiseCriteria(
      "offline",
      1
    );
    console.log(`count: ${offlineSensors.length}`);
    if (offlineSensors.length > 0) {
      console.log("Sample Metric (Offline):", offlineSensors[0]);
      if (offlineSensors[0].consecutive_days >= 1) {
          console.log("PASS: consecutive_days check");
      } else {
          console.log("FAIL: consecutive_days check");
      }
    } else {
        console.log("No offline sensors found (might be expected)");
    }

    // Test 2: Metric Sensors (Optimal, Gap detection check)
    console.log("\nTest 2: Fetching Optimal sensors (>= 7 days)...");
    const optimalSensors = await storage.getPressureSensorsByDayWiseCriteria(
      "optimal_0_2_0_7",
      7
    );
    console.log(`count: ${optimalSensors.length}`);
    if (optimalSensors.length > 0) {
      console.log("Sample Metric (Optimal):", optimalSensors[0]);
       if (optimalSensors[0].consecutive_days >= 7) {
          console.log("PASS: consecutive_days check");
      } else {
          console.log("FAIL: consecutive_days check");
      }
    } else {
         console.log("No optimal sensors found > 7 days");
    }

    console.log("\nVerification Complete.");
    process.exit(0);
  } catch (error) {
    console.error("Verification Failed:", error);
    process.exit(1);
  }
}

verifyPressureFix();
