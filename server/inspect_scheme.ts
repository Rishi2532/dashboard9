import { getDB } from "./db";
import { waterSchemeData } from "../shared/schema";
import { eq } from "drizzle-orm";

async function inspectAllVillages() {
    const db = await getDB();
    const rows = await db.select().from(waterSchemeData).where(
        eq(waterSchemeData.scheme_id, "20003791")
    );

    console.log(`Found ${rows.length} rows for Scheme 20003791.`);
    const uniqueVillages = new Set(rows.map(r => r.village_name));
    console.log(`Unique Villages: ${uniqueVillages.size}`);

    rows.forEach((r, i) => {
        if (r.lpcd_value_day7 === "0.12" || r.lpcd_value_day1 === "0.12" || r.water_value_day7 === "0.12" || i < 10) {
            console.log(`Row ${i + 1}: Village=${r.village_name}, WaterDay7=${r.water_value_day7}, LPCDDay7=${r.lpcd_value_day7}, LPCDDay1=${r.lpcd_value_day1}`);
        }
    });
}

inspectAllVillages();
