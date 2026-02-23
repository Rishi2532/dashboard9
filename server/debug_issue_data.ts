import { getDB } from "./db";
import { waterSchemeData } from "../shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";

async function simulateStatusApi(query: any) {
    const { level, schemeId, villageName, esrName } = query;
    const db = await getDB();

    if (level === "Scheme") {
        const results: any = await db.execute(sql`
            WITH deduplicated_villages AS (
                SELECT DISTINCT ON (scheme_id, block, village_name)
                    population,
                    water_value_day7
                FROM water_scheme_data
                WHERE scheme_id = ${schemeId as string}
                ORDER BY scheme_id, block, village_name, water_date_day7 DESC NULLS LAST
            )
            SELECT 
                SUM(population) as total_pop,
                SUM(water_value_day7) as total_water
            FROM deduplicated_villages
        `);

        if (results.rows.length > 0 && results.rows[0].total_pop && Number(results.rows[0].total_pop) > 0) {
            const totalPop = Number(results.rows[0].total_pop);
            const totalWater = Number(results.rows[0].total_water || 0);
            const lpcdValue = Math.round((totalWater * 100000) / totalPop * 100) / 100;
            const achieved = lpcdValue >= 55;
            return {
                status: achieved ? `Achieved (${lpcdValue} LPCD) ✅` : `Not Achieved (${lpcdValue} LPCD) ❌`,
                value: lpcdValue,
                should_require_reason: !achieved
            };
        } else {
            return { status: "No Data Available ❌", value: 0, should_require_reason: true };
        }
    } else if (level === "Village") {
        const results = await db
            .select({
                lpcd: waterSchemeData.lpcd_value_day7,
            })
            .from(waterSchemeData)
            .where(
                and(
                    eq(waterSchemeData.scheme_id, schemeId as string),
                    eq(waterSchemeData.village_name, villageName as string)
                )
            )
            .orderBy(desc(waterSchemeData.water_date_day7))
            .limit(1);

        if (results.length > 0) {
            const lpcdValue = results[0].lpcd ? parseFloat(results[0].lpcd.toString()) : 0;
            const achieved = lpcdValue >= 55;
            return {
                status: achieved ? `Achieved (${lpcdValue} LPCD) ✅` : `Not Achieved (${lpcdValue} LPCD) ❌`,
                value: lpcdValue,
                should_require_reason: !achieved
            };
        } else {
            return { status: "Status: 0 LPCD ❌", value: 0, should_require_reason: true };
        }
    }
}

async function runDebug() {
    console.log("--- SIMULATING SCHEME LEVEL (105 Villages RRWSS) ---");
    const schemeResult = await simulateStatusApi({ level: "Scheme", schemeId: "20003791" });
    console.log(JSON.stringify(schemeResult, null, 2));

    console.log("\n--- SIMULATING VILLAGE LEVEL (Ashti) ---");
    const villageResult = await simulateStatusApi({ level: "Village", schemeId: "20003791", villageName: "Ashti" });
    console.log(JSON.stringify(villageResult, null, 2));
}

runDebug();
