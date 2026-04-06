import { Router, Request, Response, NextFunction } from "express";
import { getDB } from "../db";
import {
    issueReports,
    insertIssueReportSchema,
    schemeStatuses,
    waterSchemeData,
    waterConsumption,
    waterConsumptionHistory,
    users
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// 1. Get unique schemes
router.get("/schemes", async (req, res) => {
    try {
        const db = await getDB();
        const schemes = await db
            .select({
                scheme_id: schemeStatuses.scheme_id,
                scheme_name: schemeStatuses.scheme_name,
                region: schemeStatuses.region,
            })
            .from(schemeStatuses)
            .groupBy(schemeStatuses.scheme_id, schemeStatuses.scheme_name, schemeStatuses.region)
            .orderBy(schemeStatuses.scheme_name);

        res.json(schemes);
    } catch (error) {
        console.error("Error fetching schemes:", error);
        res.status(500).json({ message: "Failed to fetch schemes" });
    }
});

// 2. Get villages for a scheme
router.get("/villages/:schemeId", async (req, res) => {
    const { schemeId } = req.params;
    try {
        const db = await getDB();
        const villagesList = await db
            .select({
                village_name: waterSchemeData.village_name,
            })
            .from(waterSchemeData)
            .where(eq(waterSchemeData.scheme_id, schemeId))
            .groupBy(waterSchemeData.village_name)
            .orderBy(waterSchemeData.village_name);

        res.json(villagesList);
    } catch (error) {
        console.error("Error fetching villages:", error);
        res.status(500).json({ message: "Failed to fetch villages" });
    }
});

// 3. Get ESRs for a village
router.get("/esrs", async (req, res) => {
    const { schemeId, villageName, schemeName } = req.query as { 
        schemeId?: string, 
        villageName?: string, 
        schemeName?: string 
    };
    
    console.log(`[ESR-FETCH] Received request: schemeId=${schemeId}, villageName=${villageName}, schemeName=${schemeName}`);

    if (!schemeId || !villageName) {
        console.warn("[ESR-FETCH] Missing required parameters: schemeId or villageName");
        return res.json([]);
    }

    try {
        const db = await getDB();
        
        // Prepare base names for fuzzy matching
        const schemeBase = schemeName ? schemeName.split(' ')[0] : '';
        const villageBase = villageName ? villageName.split(' ')[0] : '';

        // Tiered Matching Strategy
        const result: any = await db.execute(sql`
            WITH unioned_data AS (
                SELECT esr_name, scheme_id, scheme_name, village_name FROM water_consumption
                UNION ALL
                SELECT esr_name, scheme_id, scheme_name, village_name FROM water_consumption_history
                UNION ALL
                SELECT esr_name, scheme_id, scheme_name, village_name FROM communication_status
                UNION ALL
                SELECT esr_name, scheme_id, scheme_name, village_name FROM chlorine_data
                UNION ALL
                SELECT esr_name, scheme_id, scheme_name, village_name FROM pressure_data
            ),
            matching_esrs AS (
                -- Level 1: Match by ID and Village Name (Exact or Prefix)
                SELECT esr_name, 1 as priority FROM unioned_data 
                WHERE (TRIM(LOWER(scheme_id)) = TRIM(LOWER(${schemeId})) OR TRIM(LOWER(scheme_id)) = TRIM(LOWER(REPLACE(${schemeId}, ' ', ''))))
                AND (TRIM(LOWER(village_name)) = TRIM(LOWER(${villageName})) OR TRIM(LOWER(village_name)) ILIKE TRIM(LOWER(${villageName})) || '%')
                
                UNION ALL
                
                -- Level 2: Match by Scheme Name and Village Name
                SELECT esr_name, 2 as priority FROM unioned_data 
                WHERE (TRIM(LOWER(scheme_name)) = TRIM(LOWER(${schemeName || ""})) OR scheme_name ILIKE ${schemeName || ""} || '%')
                AND (TRIM(LOWER(village_name)) = TRIM(LOWER(${villageName})) OR TRIM(LOWER(village_name)) ILIKE TRIM(LOWER(${villageName})) || '%')

                UNION ALL
                
                -- Level 3: Fuzzy Scheme Match (using first word of scheme)
                SELECT esr_name, 3 as priority FROM unioned_data 
                WHERE scheme_name ILIKE '%' || ${schemeBase} || '%'
                AND (TRIM(LOWER(village_name)) = TRIM(LOWER(${villageName})) OR TRIM(LOWER(village_name)) ILIKE TRIM(LOWER(${villageName})) || '%')
                
                UNION ALL

                -- Level 4: Village Base Name Fallback (Matches first word of village)
                SELECT esr_name, 4 as priority FROM unioned_data 
                WHERE (TRIM(LOWER(village_name)) = TRIM(LOWER(${villageName})) OR village_name ILIKE ${villageBase} || '%')
            )
            SELECT DISTINCT esr_name FROM matching_esrs 
            WHERE esr_name IS NOT NULL AND esr_name <> ''
            ORDER BY esr_name
        `);

        console.log(`[ESR-FETCH] Found ${result.rows.length} ESRs for ${villageName}`);

        const esrs = result.rows.map((row: any) => ({
            esr_name: row.esr_name,
        }));

        res.json(esrs);
    } catch (error) {
        console.error("Error fetching ESRs:", error);
        res.status(500).json({ message: "Failed to fetch ESRs" });
    }
});

// 4. Get current status (LPCD or Water Consumption)
router.get("/status", async (req, res) => {
    const { level, schemeId, villageName, esrName } = req.query;

    try {
        const db = await getDB();
        if (level === "Scheme") {
            // Aggregate LPCD for the whole scheme using deduplicated village data
            // Use subquery to deduplicate villages (pick latest row per village/block)
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
                // LPCD = (Total Water * 100000) / Total Population
                const lpcdValue = Math.round((totalWater * 100000) / totalPop * 100) / 100;
                const achieved = lpcdValue >= 55;

                const statusStr = achieved ? `[VERIFIED] Achieved: ${lpcdValue} LPCD ✅` : `[VERIFIED] Not Achieved: ${lpcdValue} LPCD ❌`;
                res.json({
                    status: statusStr,
                    value: lpcdValue,
                    should_require_reason: Boolean(!achieved)
                });
            } else {
                res.json({ status: "No Data Available ❌", value: 0, should_require_reason: true });
            }
        }
        else if (level === "Village" && villageName) {
            console.log(`[STATUS-DEBUG] Fetching for Village: ${villageName}`);
            // Fetch Day 7 LPCD from waterSchemeData for specific village
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
                const statusStr = achieved ? `[VERIFIED] Achieved: ${lpcdValue} LPCD ✅` : `[VERIFIED] Not Achieved: ${lpcdValue} LPCD ❌`;
                console.log(`[STATUS-DEBUG] Village LPCD=${lpcdValue}, Achieved=${achieved}`);

                res.json({
                    status: statusStr,
                    value: lpcdValue,
                    should_require_reason: Boolean(!achieved)
                });
            } else {
                res.json({
                    status: "Status: No Record for Village ❌",
                    value: 0,
                    should_require_reason: true
                });
            }
        }
        else if (level === "ESR" && esrName) {
            console.log(`[STATUS-DEBUG] Fetching for ESR: ${esrName} in Village: ${villageName}`);
            // Fetch Day 7 Water Consumption and Capacity from water_consumption table
            const results = await db
                .select({
                    water_value: waterConsumption.water_value_day7,
                    esr_capacity: waterConsumption.esr_capacity,
                })
                .from(waterConsumption)
                .where(
                    and(
                        eq(waterConsumption.scheme_id, schemeId as string),
                        eq(waterConsumption.village_name, villageName as string),
                        eq(waterConsumption.esr_name, esrName as string)
                    )
                )
                .limit(1);

            if (results.length > 0) {
                const consumption = results[0].water_value ? parseFloat(results[0].water_value.toString()) : 0;
                const capacity = results[0].esr_capacity ? parseFloat(results[0].esr_capacity.toString()) : 0;

                let statusText = "";
                let should_require_reason = false;

                if (consumption === 0) {
                    statusText = "No Water ❌";
                    should_require_reason = true;
                } else if (capacity > 0 && consumption < (0.5 * capacity)) {
                    const percentage = Math.round((consumption / capacity) * 1000) / 10;
                    statusText = `Low Water (${consumption} LL / ${capacity} LL - ${percentage}%) ⚠️`;
                    should_require_reason = true;
                } else {
                    statusText = `Sufficient (${consumption} LL) ✅`;
                    should_require_reason = false;
                }

                console.log(`[STATUS-DEBUG] ESR Status: ${statusText}, Consumption=${consumption}, Capacity=${capacity}`);

                res.json({
                    status: statusText,
                    value: consumption,
                    capacity: capacity,
                    should_require_reason: should_require_reason
                });
            } else {
                res.json({
                    status: "Status: No ESR Data found ❌",
                    value: 0,
                    should_require_reason: true
                });
            }
        }
        else {
            res.status(400).json({ message: "Invalid level or parameters" });
        }
    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ message: "Failed to fetch status" });
    }
});

// 5. Submit issue report
router.post("/submit", async (req: any, res) => {
    try {
        const db = await getDB();
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Fetch user details to persist name
        const [user] = await db
            .select({
                name: users.name,
                username: users.username
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        const creatorName = user ? (user.name || user.username) : "Unknown";

        const payload = insertIssueReportSchema.parse({
            ...req.body,
            created_by: userId,
            creator_name: creatorName,
            status: "Active"
        });

        const [newReport] = await db
            .insert(issueReports)
            .values(payload)
            .returning();

        res.json(newReport);
    } catch (error: any) {
        console.error("Error submitting issue report:", error);
        res.status(400).json({ message: error.message || "Failed to submit report" });
    }
});

// 6. Get ALL active issues for dashboard visualization
router.get("/active", async (req, res) => {
    try {
        const db = await getDB();

        const activeIssues = await db
            .select({
                id: issueReports.id,
                problem_level: issueReports.problem_level,
                region: issueReports.region,
                scheme_id: issueReports.scheme_id,
                scheme_name: issueReports.scheme_name,
                village_name: issueReports.village_name,
                esr_name: issueReports.esr_name,
                reason: issueReports.reason,
                status_value: issueReports.status_value,
                created_at: issueReports.created_at,
                // Prefer stored name, fallback to join if null
                creator_name: sql`COALESCE(${issueReports.creator_name}, ${users.name}, ${users.username})`,
                sensor_type: issueReports.sensor_type
            })
            .from(issueReports)
            .leftJoin(users, eq(issueReports.created_by, users.id))
            .where(sql`LOWER(${issueReports.status}) = 'active'`)
            .orderBy(desc(issueReports.created_at));

        res.json(activeIssues);
    } catch (error) {
        console.error("Error fetching active issues:", error);
        res.status(500).json({ message: "Failed to fetch active issues" });
    }
});

// 7. Get list of issues (Filtered by current user and optional region)
router.get("/list", async (req: any, res) => {
    try {
        const db = await getDB();
        const userId = req.session.userId;
        const regionFilter = req.query.region as string;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let query = db
            .select({
                id: issueReports.id,
                problem_level: issueReports.problem_level,
                region: issueReports.region,
                scheme_id: issueReports.scheme_id,
                scheme_name: issueReports.scheme_name,
                village_name: issueReports.village_name,
                esr_name: issueReports.esr_name,
                status_value: issueReports.status_value,
                reason: issueReports.reason,
                status: issueReports.status,
                resolution_remark: issueReports.resolution_remark,
                created_at: issueReports.created_at,
                resolved_at: issueReports.resolved_at,
                // Prefer stored name, fallback to join if null (backward compatibility)
                creator_name: sql`COALESCE(${issueReports.creator_name}, ${users.name}, ${users.username})`,
                sensor_type: issueReports.sensor_type
            })
            .from(issueReports)
            .leftJoin(users, eq(issueReports.created_by, users.id))
            .where(and(
                eq(issueReports.created_by, userId),
                regionFilter && regionFilter !== "All Regions" ? eq(issueReports.region, regionFilter) : undefined
            ))
            .orderBy(desc(issueReports.created_at));

        const list = await query;

        res.json(list);
    } catch (error) {
        console.error("Error fetching issues:", error);
        res.status(500).json({ message: "Failed to fetch issues" });
    }
});

// 8. Get unique regions for filtering
router.get("/regions", async (req, res) => {
    try {
        const db = await getDB();
        const regions = await db
            .selectDistinct({ region: issueReports.region })
            .from(issueReports)
            .orderBy(issueReports.region);

        res.json(regions);
    } catch (error) {
        console.error("Error fetching regions:", error);
        res.status(500).json({ message: "Failed to fetch region list" });
    }
});

// 7. Mark as resolved (Creator only)
router.patch("/resolve/:id", async (req: any, res) => {
    const { id } = req.params;
    const { resolution_remark } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const db = await getDB();

        // Check ownership
        const [report] = await db
            .select()
            .from(issueReports)
            .where(and(eq(issueReports.id, parseInt(id)), eq(issueReports.created_by, userId)))
            .limit(1);

        if (!report) {
            return res.status(403).json({ message: "You can only resolve your own issue reports" });
        }

        const [updatedReport] = await db
            .update(issueReports)
            .set({
                status: "Resolved",
                resolution_remark,
                resolved_at: new Date(),
            })
            .where(eq(issueReports.id, parseInt(id)))
            .returning();

        res.json(updatedReport);
    } catch (error) {
        console.error("Error resolving issue:", error);
        res.status(500).json({ message: "Failed to resolve issue" });
    }
});

export default router;
