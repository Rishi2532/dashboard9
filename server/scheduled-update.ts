
import { updateRegionSummaries } from "./db";

async function runDailyUpdate() {
  try {
    await updateRegionSummaries();
    console.log("Daily database update completed successfully");
  } catch (error) {
    console.error("Error during daily update:", error);
    process.exit(1);
  }
  process.exit(0);
}

runDailyUpdate();
