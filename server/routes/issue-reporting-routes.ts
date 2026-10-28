import { Router, Request, Response, NextFunction } from "express";
import { getDB } from "../db";
import {
    issueReports,
    insertIssueReportSchema,
    issueActionTaken,
    issueResolutionDateHistory,
    schemeStatuses,
    waterSchemeData,
    waterConsumption,
    waterConsumptionHistory,
    users
} from "@shared/schema";
import { evaluateIssueDeadline, getIstDateStr, formatReadableDate } from "../../shared/issue-deadline-utils";
import { eq, and, desc, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

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
    const { schemeId, villageName } = req.query;

    if (!schemeId || !villageName) {
        return res.status(400).json({ message: "schemeId and villageName are required" });
    }

    try {
        const db = await getDB();
        const esrs = await db
            .select({
                esr_name: waterConsumptionHistory.esr_name,
            })
            .from(waterConsumptionHistory)
            .where(
                and(
                    eq(waterConsumptionHistory.scheme_id, schemeId as string),
                    eq(waterConsumptionHistory.village_name, villageName as string)
                )
            )
            .groupBy(waterConsumptionHistory.esr_name)
            .orderBy(waterConsumptionHistory.esr_name);

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

                const statusStr = `${lpcdValue} LPCD`;
                res.json({
                    status: statusStr,
                    value: lpcdValue,
                    should_require_reason: Boolean(!achieved)
                });
            } else {
                res.json({ status: "No Data Available", value: 0, should_require_reason: true });
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
                const statusStr = `${lpcdValue} LPCD`;
                console.log(`[STATUS-DEBUG] Village LPCD=${lpcdValue}, Achieved=${achieved}`);

                res.json({
                    status: statusStr,
                    value: lpcdValue,
                    should_require_reason: Boolean(!achieved)
                });
            } else {
                res.json({
                    status: "No Record for Village",
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
                    statusText = "0 LL (No Water)";
                    should_require_reason = true;
                } else if (capacity > 0 && consumption < (0.5 * capacity)) {
                    const percentage = Math.round((consumption / capacity) * 1000) / 10;
                    statusText = `${consumption} LL / ${capacity} LL (${percentage}%)`;
                    should_require_reason = true;
                } else {
                    statusText = `${consumption} LL`;
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
                    status: "No ESR Data found",
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

        const agencyIssue = req.body.agency_issue?.trim() || null;
        const departmentIssue = req.body.department_issue?.trim() || null;

        // Build human-readable reason from agency and department issues
        let derivedReason = req.body.reason?.trim();
        if (!derivedReason) {
            const parts = [];
            if (agencyIssue) parts.push(`[Agency]: ${agencyIssue}`);
            if (departmentIssue) parts.push(`[Department]: ${departmentIssue}`);
            derivedReason = parts.join(" | ") || "Issue reported";
        }

        const rawExpectedDate = typeof req.body.expected_resolution_date === "string"
            ? req.body.expected_resolution_date.trim()
            : null;
        const validExpectedDate = rawExpectedDate && /^\d{4}-\d{2}-\d{2}$/.test(rawExpectedDate)
            ? rawExpectedDate
            : null;

        const payload = insertIssueReportSchema.parse({
            ...req.body,
            agency_issue: agencyIssue,
            department_issue: departmentIssue,
            reason: derivedReason,
            expected_resolution_date: validExpectedDate,
            created_by: userId,
            creator_name: creatorName,
            status: "Active"
        });

        const [newReport] = await db
            .insert(issueReports)
            .values(payload)
            .returning();

        // If an initial Expected Resolution Date was selected, create initial audit record
        if (validExpectedDate) {
            await db.insert(issueResolutionDateHistory).values({
                issue_id: newReport.id,
                previous_date: null,
                new_date: validExpectedDate,
                changed_by: userId,
                changer_name: creatorName,
            }).catch((err: any) => console.error("Could not record initial deadline history:", err));
        }

        res.json(newReport);
    } catch (error: any) {
        console.error("Error submitting issue report:", error);
        res.status(400).json({ message: error.message || "Failed to submit report" });
    }
});

// 6. Get ONLY active (non-resolved) issues for dashboard remark columns
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
                agency_issue: issueReports.agency_issue,
                department_issue: issueReports.department_issue,
                status_value: issueReports.status_value,
                status: issueReports.status,
                resolution_remark: issueReports.resolution_remark,
                resolved_at: issueReports.resolved_at,
                created_at: issueReports.created_at,
                created_by: issueReports.created_by,
                creator_name: sql`COALESCE(${issueReports.creator_name}, ${users.name}, ${users.username})`,
                sensor_type: issueReports.sensor_type,
                expected_resolution_date: issueReports.expected_resolution_date
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

// 6.5 Get ALL issues (Active and Resolved) for dashboard visualization and history
router.get("/all", async (req, res) => {
    try {
        const db = await getDB();

        const allIssues = await db
            .select({
                id: issueReports.id,
                problem_level: issueReports.problem_level,
                region: issueReports.region,
                scheme_id: issueReports.scheme_id,
                scheme_name: issueReports.scheme_name,
                village_name: issueReports.village_name,
                esr_name: issueReports.esr_name,
                reason: issueReports.reason,
                agency_issue: issueReports.agency_issue,
                department_issue: issueReports.department_issue,
                status_value: issueReports.status_value,
                status: issueReports.status,
                resolution_remark: issueReports.resolution_remark,
                created_at: issueReports.created_at,
                resolved_at: issueReports.resolved_at,
                created_by: issueReports.created_by,
                // Prefer stored name, fallback to join if null
                creator_name: sql`COALESCE(${issueReports.creator_name}, ${users.name}, ${users.username})`,
                sensor_type: issueReports.sensor_type,
                expected_resolution_date: issueReports.expected_resolution_date
            })
            .from(issueReports)
            .leftJoin(users, eq(issueReports.created_by, users.id))
            .orderBy(desc(issueReports.created_at));

        res.json(allIssues);
    } catch (error) {
        console.error("Error fetching all issues:", error);
        res.status(500).json({ message: "Failed to fetch all issues" });
    }
});

// 7. Get list of issues (Filtered by current user or all if admin, and optional region)
router.get("/list", async (req: any, res) => {
    try {
        const db = await getDB();
        const userId = req.session.userId;
        const regionFilter = req.query.region as string;
        const requestedAll = req.query.all === "true";

        if (!userId && !req.session?.isAdmin) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let isAdmin = Boolean(req.session?.isAdmin);
        if (!isAdmin && userId) {
            const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
            if (u && (u.role === "admin" || (u as any).isAdmin)) {
                isAdmin = true;
            }
        }

        const showAll = isAdmin || requestedAll;

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
                agency_issue: issueReports.agency_issue,
                department_issue: issueReports.department_issue,
                status: issueReports.status,
                resolution_remark: issueReports.resolution_remark,
                created_at: issueReports.created_at,
                resolved_at: issueReports.resolved_at,
                created_by: issueReports.created_by,
                // Prefer stored name, fallback to join if null (backward compatibility)
                creator_name: sql`COALESCE(${issueReports.creator_name}, ${users.name}, ${users.username})`,
                sensor_type: issueReports.sensor_type,
                expected_resolution_date: issueReports.expected_resolution_date
            })
            .from(issueReports)
            .leftJoin(users, eq(issueReports.created_by, users.id))
            .where(
                showAll
                    ? (regionFilter && regionFilter !== "All Regions" ? eq(issueReports.region, regionFilter) : undefined)
                    : and(
                        eq(issueReports.created_by, userId),
                        regionFilter && regionFilter !== "All Regions" ? eq(issueReports.region, regionFilter) : undefined
                    )
            )
            .orderBy(desc(issueReports.created_at));

        const list = await query;

        res.json(list);
    } catch (error) {
        console.error("Error fetching issues:", error);
        res.status(500).json({ message: "Failed to fetch issues" });
    }
});

// 8. Export all issue reports to Excel (.xlsx)
router.get("/export-excel", async (req: any, res) => {
    try {
        const db = await getDB();
        const regionFilter = req.query.region as string;

        const allIssues = await db
            .select({
                id: issueReports.id,
                problem_level: issueReports.problem_level,
                region: issueReports.region,
                scheme_id: issueReports.scheme_id,
                scheme_name: issueReports.scheme_name,
                village_name: issueReports.village_name,
                esr_name: issueReports.esr_name,
                reason: issueReports.reason,
                agency_issue: issueReports.agency_issue,
                department_issue: issueReports.department_issue,
                status_value: issueReports.status_value,
                status: issueReports.status,
                resolution_remark: issueReports.resolution_remark,
                created_at: issueReports.created_at,
                resolved_at: issueReports.resolved_at,
                creator_name: sql`COALESCE(${issueReports.creator_name}, ${users.name}, ${users.username})`,
                sensor_type: issueReports.sensor_type,
                expected_resolution_date: issueReports.expected_resolution_date
            })
            .from(issueReports)
            .leftJoin(users, eq(issueReports.created_by, users.id))
            .where(
                regionFilter && regionFilter !== "All Regions" && regionFilter !== "all"
                    ? eq(issueReports.region, regionFilter)
                    : undefined
            )
            .orderBy(desc(issueReports.created_at));

        const rows = allIssues.map((item, idx) => {
            const createdDate = item.created_at
                ? new Date(item.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : "-";
            const resolvedDate = item.resolved_at
                ? new Date(item.resolved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : "-";

            return {
                "Sr No": idx + 1,
                "Report ID": `#${item.id}`,
                "Problem Level": item.problem_level,
                "Region": item.region || "-",
                "Scheme ID": item.scheme_id,
                "Scheme Name": item.scheme_name,
                "Village Name": item.village_name || "-",
                "ESR / Location Name": item.esr_name || "-",
                "Sensor Type": item.sensor_type || "-",
                "Status / Value": item.status_value || "-",
                "Agency Issue": item.agency_issue || "-",
                "Department Issue": item.department_issue || "-",
                "Issue Reason / Justification": item.reason || "-",
                "Issue Status": item.status || "Active",
                "Submitted By": item.creator_name || "Unknown",
                "Submitted At": createdDate,
                "Expected Resolution Date": item.expected_resolution_date ? (formatReadableDate(item.expected_resolution_date) || item.expected_resolution_date) : "-",
                "Resolution Status": item.status === "Resolved" ? "Resolved" : "Pending",
                "Resolution Remark": item.resolution_remark || "-",
                "Resolved At": resolvedDate
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Issue Reports");

        ws["!cols"] = [
            { wch: 6 },
            { wch: 11 },
            { wch: 14 },
            { wch: 18 },
            { wch: 14 },
            { wch: 32 },
            { wch: 22 },
            { wch: 22 },
            { wch: 16 },
            { wch: 25 },
            { wch: 38 },
            { wch: 14 },
            { wch: 22 },
            { wch: 22 },
            { wch: 16 },
            { wch: 30 },
            { wch: 22 },
        ];

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `MJP_Issue_Reports_${dateStr}.xlsx`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
    } catch (error) {
        console.error("Error exporting issue reports to Excel:", error);
        res.status(500).json({ message: "Failed to export issue reports" });
    }
});

// 9. Get unique regions for filtering
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

// 10. Mark as resolved (Creator or Admin)
router.patch("/resolve/:id", async (req: any, res) => {
    const { id } = req.params;
    const { resolution_remark } = req.body;
    const userId = req.session.userId;

    if (!userId && !req.session?.isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const db = await getDB();

        let isAdmin = Boolean(req.session?.isAdmin);
        if (!isAdmin && userId) {
            const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
            if (u && (u.role === "admin" || (u as any).isAdmin)) {
                isAdmin = true;
            }
        }

        // Check ownership or admin
        const [report] = await db
            .select()
            .from(issueReports)
            .where(eq(issueReports.id, parseInt(id)))
            .limit(1);

        if (!report) {
            return res.status(404).json({ message: "Issue report not found" });
        }

        if (!isAdmin && report.created_by !== userId) {
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

// 11. Get Action Taken history for an issue (Chronological, newest first)
router.get("/:id/actions", async (req: any, res) => {
    try {
        const db = await getDB();
        const issueId = parseInt(req.params.id);
        if (isNaN(issueId)) {
            return res.status(400).json({ message: "Invalid issue ID" });
        }

        const actions = await db
            .select({
                id: issueActionTaken.id,
                issue_id: issueActionTaken.issue_id,
                action_description: issueActionTaken.action_description,
                created_by: issueActionTaken.created_by,
                creator_name: sql`COALESCE(${issueActionTaken.creator_name}, ${users.name}, ${users.username}, 'Authorized User')`,
                created_at: issueActionTaken.created_at,
            })
            .from(issueActionTaken)
            .leftJoin(users, eq(issueActionTaken.created_by, users.id))
            .where(eq(issueActionTaken.issue_id, issueId))
            .orderBy(desc(issueActionTaken.created_at));

        res.json(actions);
    } catch (error) {
        console.error("Error fetching action history:", error);
        res.status(500).json({ message: "Failed to fetch action history" });
    }
});

// 12. Add Action Taken entry (Enforcing strict deadline in Asia/Kolkata timezone)
router.post("/:id/actions", async (req: any, res) => {
    try {
        const db = await getDB();
        const userId = req.session.userId;

        if (!userId && !req.session?.isAdmin) {
            return res.status(401).json({ message: "Unauthorized. Please log in to record an action." });
        }

        const issueId = parseInt(req.params.id);
        if (isNaN(issueId)) {
            return res.status(400).json({ message: "Invalid issue ID" });
        }

        const actionDescription = typeof req.body.action_description === "string"
            ? req.body.action_description.trim()
            : "";

        if (!actionDescription) {
            return res.status(400).json({ message: "Action description cannot be empty or whitespace only." });
        }

        // Authoritative issue lookup from DB
        const [issue] = await db
            .select()
            .from(issueReports)
            .where(eq(issueReports.id, issueId))
            .limit(1);

        if (!issue) {
            return res.status(404).json({ message: "Issue report not found" });
        }

        // CRITICAL BUSINESS RULE: Only the person who submitted this issue can input Action Taken
        if (issue.created_by && Number(issue.created_by) !== Number(userId)) {
            return res.status(403).json({
                message: "Only the person who submitted this issue can record actions taken.",
                code: "FORBIDDEN_NOT_REPORTER"
            });
        }

        // CRITICAL BUSINESS RULE: Evaluate deadline using authoritative DB date in Asia/Kolkata
        const deadlineEval = evaluateIssueDeadline(issue.expected_resolution_date);

        if (deadlineEval.status === "not_set") {
            return res.status(422).json({
                message: "Set an Expected Resolution Date before recording an action.",
                code: "MISSING_DEADLINE"
            });
        }

        if (deadlineEval.isExpired) {
            return res.status(409).json({
                message: "The expected resolution date has passed. Adding or modifying actions for this issue is no longer permitted.",
                code: "DEADLINE_PASSED",
                expected_resolution_date: issue.expected_resolution_date,
            });
        }

        // Fetch user name
        const [u] = await db
            .select({ name: users.name, username: users.username })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        const creatorName = u ? (u.name || u.username) : (req.session?.username || "Authorized User");

        const [newAction] = await db
            .insert(issueActionTaken)
            .values({
                issue_id: issueId,
                action_description: actionDescription,
                created_by: userId,
                creator_name: creatorName,
            })
            .returning();

        res.status(201).json(newAction);
    } catch (error: any) {
        console.error("Error recording action taken:", error);
        res.status(500).json({ message: error.message || "Failed to record action" });
    }
});

// 13. Get Expected Resolution Date details & audit history for an issue
router.get("/:id/deadline", async (req: any, res) => {
    try {
        const db = await getDB();
        const issueId = parseInt(req.params.id);
        if (isNaN(issueId)) {
            return res.status(400).json({ message: "Invalid issue ID" });
        }

        const [issue] = await db
            .select()
            .from(issueReports)
            .where(eq(issueReports.id, issueId))
            .limit(1);

        if (!issue) {
            return res.status(404).json({ message: "Issue report not found" });
        }

        const deadlineEval = evaluateIssueDeadline(issue.expected_resolution_date);

        const history = await db
            .select({
                id: issueResolutionDateHistory.id,
                issue_id: issueResolutionDateHistory.issue_id,
                previous_date: issueResolutionDateHistory.previous_date,
                new_date: issueResolutionDateHistory.new_date,
                changed_by: issueResolutionDateHistory.changed_by,
                changer_name: sql`COALESCE(${issueResolutionDateHistory.changer_name}, ${users.name}, ${users.username}, 'Authorized User')`,
                created_at: issueResolutionDateHistory.created_at,
            })
            .from(issueResolutionDateHistory)
            .leftJoin(users, eq(issueResolutionDateHistory.changed_by, users.id))
            .where(eq(issueResolutionDateHistory.issue_id, issueId))
            .orderBy(desc(issueResolutionDateHistory.created_at));

        res.json({
            ...deadlineEval,
            history,
        });
    } catch (error) {
        console.error("Error fetching deadline details:", error);
        res.status(500).json({ message: "Failed to fetch deadline details" });
    }
});

// 14. Update Expected Resolution Date (Blocked: immutable once issue is reported)
router.patch("/:id/expected-resolution-date", async (req: any, res) => {
    return res.status(403).json({
        message: "Expected Resolution Date cannot be modified once the issue has been reported.",
        code: "DEADLINE_IMMUTABLE"
    });
});

export default router;
