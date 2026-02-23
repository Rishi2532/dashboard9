import { getDB } from "./db";
import { waterSchemeData } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function inspectAshti() {
    const db = await getDB();
    const rows = await db.select().from(waterSchemeData).where(
        and(
            eq(waterSchemeData.scheme_id, "20003791"),
            eq(waterSchemeData.village_name, "Ashti")
        )
    );

    console.log(`Found ${rows.length} rows for Ashti.`);
    rows.forEach((r, i) => {
        console.log(`Row ${i + 1}: Block=${r.block}, Pop=${r.population}, WaterDay7=${r.water_value_day7}, LPCDDay7=${r.lpcd_value_day7}, Date=${r.water_date_day7}`);
    });
}

inspectAshti();
