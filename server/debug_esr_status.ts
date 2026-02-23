import { getDB } from "./db";
import { waterConsumption } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function debugESRStatus() {
    const db = await getDB();
    const schemeId = "20003791"; // Example scheme ID
    const villageName = "Ashti";

    console.log(`Checking ESR data for Scheme: ${schemeId}, Village: ${villageName}`);

    const results = await db
        .select({
            esr_name: waterConsumption.esr_name,
            water_value_day7: waterConsumption.water_value_day7,
            esr_capacity: waterConsumption.esr_capacity,
        })
        .from(waterConsumption)
        .where(
            and(
                eq(waterConsumption.scheme_id, schemeId),
                eq(waterConsumption.village_name, villageName)
            )
        );

    console.log("ESR Results found:", JSON.stringify(results, null, 2));

    if (results.length > 0) {
        for (const esr of results) {
            const consumption = esr.water_value_day7 ? parseFloat(esr.water_value_day7.toString()) : 0;
            const capacity = esr.esr_capacity ? parseFloat(esr.esr_capacity.toString()) : 0;

            let statusText = "";
            if (consumption === 0) {
                statusText = "No Water ❌";
            } else if (capacity > 0 && consumption < (0.5 * capacity)) {
                statusText = `Low Water (${consumption} LL / ${capacity} LL) ⚠️`;
            } else {
                statusText = `Sufficient (${consumption} LL) ✅`;
            }
            console.log(`ESR: ${esr.esr_name} | Status: ${statusText}`);
        }
    } else {
        console.log("No ESR data found for this village.");
    }

    process.exit(0);
}

debugESRStatus().catch(err => {
    console.error(err);
    process.exit(1);
});
