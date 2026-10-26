import { Router, Request, Response } from "express";
import { getDB } from "../db";
import { sql } from "drizzle-orm";
import {
  getAlertTrackerMetrics,
  runDailyAlertTrackerEscalation,
  getAlertTrackerCronStatus,
  getTelemetryDayIndex,
} from "../services/alert-tracker-service";

const router = Router();

// Cache for alert tracker summary to provide sub-second responses
const trackerCache = new Map<string, { timestamp: number; payload: any }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const selectedRegion = (req.query.region as string) || "All";
    const requestedDate = (req.query.date as string) || "2026-10-22";
    const rawAgency = (req.query.agency as string) || "ALL";
    const forceRefresh = req.query.refresh === "true";

    const isAllRegion = !selectedRegion || selectedRegion.toLowerCase() === "all";
    const isAllAgency = !rawAgency || rawAgency.trim().toUpperCase() === "ALL" || rawAgency.trim().toUpperCase() === "ALL AGENCY" || rawAgency.trim().toLowerCase() === "all agencies";
    const agency = isAllAgency ? "ALL" : rawAgency.trim();
    const { isoDate, displayDate } = getTelemetryDayIndex(requestedDate);

    const cacheKey = `${selectedRegion.toLowerCase()}:::${isoDate}:::${agency.toUpperCase()}`;
    if (!forceRefresh) {
      const cached = trackerCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json(cached.payload);
      }
    }

    const db = await getDB();

    // Common WHERE filters for Region & Agency matching Level 5 Portal exactly
    const regionSchemeStatusFilter = isAllRegion
      ? sql``
      : sql`AND ss.region ILIKE ${`%${selectedRegion}%`}`;

    const regionVillageFilter = isAllRegion
      ? sql``
      : sql`AND v.region ILIKE ${`%${selectedRegion}%`}`;

    const regionCommFilter = isAllRegion
      ? sql``
      : sql`AND cs.region ILIKE ${`%${selectedRegion}%`}`;

    const regionWaterFilter = isAllRegion
      ? sql``
      : sql`AND ws.region ILIKE ${`%${selectedRegion}%`}`;

    const regionChlorineFilter = isAllRegion
      ? sql``
      : sql`AND c.region ILIKE ${`%${selectedRegion}%`}`;

    let agencySchemeStatusFilter = sql``;
    if (!isAllAgency) {
      const a = agency.toLowerCase();
      if (a === "zp") {
        agencySchemeStatusFilter = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE 'ZP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%ZP%')`;
      } else if (a.includes("shikhar") || a.includes("shikar")) {
        agencySchemeStatusFilter = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%shikhar%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%shikar%')`;
      } else if (a.includes("gram") || a === "gp") {
        agencySchemeStatusFilter = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE 'GP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%gram%')`;
      } else if (a.includes("mjp")) {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE '%MJP%'`;
      } else if (a.includes("contractor")) {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE '%Contractor%'`;
      } else {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE ${`%${agency}%`}`;
      }
    }

    // 1. Project Scope (Dynamic region-wise when region filter is selected, default statewide)
    let projectScope = {
      schemes: 389,
      villages: 5993,
      esr: 10319,
    };

    if (!isAllRegion) {
      try {
        const scopeRes: any = await db.execute(sql`
          SELECT
            COUNT(DISTINCT sp.scheme_id)::bigint AS schemes,
            COALESCE(SUM(sp.number_of_villages), 0)::bigint AS villages,
            COALESCE(SUM(COALESCE(sp.number_of_esr,0) + COALESCE(sp.number_of_gsr,0) + COALESCE(sp.number_of_mbr,0)), 0)::bigint AS esr
          FROM scheme_progress_summary sp
          LEFT JOIN (
            SELECT DISTINCT scheme_id::text as scheme_id, region FROM scheme_status
          ) ss ON ss.scheme_id = sp.scheme_id::text
          WHERE (
            sp.region ILIKE ${`%${selectedRegion}%`} 
            OR ss.region ILIKE ${`%${selectedRegion}%`}
          );
        `);
        const r = scopeRes.rows ? scopeRes.rows[0] : scopeRes[0];
        if (r && Number(r.schemes) > 0) {
          projectScope = {
            schemes: Number(r.schemes || 0),
            villages: Number(r.villages || 0),
            esr: Number(r.esr || 0),
          };
        }
      } catch (err) {
        console.warn("Could not query region project scope:", err);
      }
    }

    // 2. Physical Progress (Partial Completed Schemes / Villages / ESRs vs Fully Completed)
    const [
      iotSchemesTotalRes,
      iotSchemesFullyRes,
      iotVillagesTotalRes,
      iotVillagesFullyRes,
      iotEsrTotalRes,
      iotEsrFullyRes,
      opSchemesRes,
      opVillagesRes,
      opEsrsRes,
    ]: any = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          ss.total_villages_integrated, ss.total_esr_integrated,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type
        FROM scheme_status ss
        WHERE (LOWER(ss.fully_completion_scheme_status) LIKE '%progress%' OR LOWER(ss.fully_completion_scheme_status) LIKE '%partial%')
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          ss.fully_completed_villages, ss.no_fully_completed_esr,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type
        FROM scheme_status ss
        WHERE (TRIM(LOWER(ss.fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') OR TRIM(LOWER(ss.mjp_fully_completed)) = 'yes')
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(ws.population, 0) as population,
          COALESCE(ws.lpcd_value_day7::text, ws.lpcd_value_day1::text, '-') as lpcd_value,
          'In Progress' as status, ss.agency_type
        FROM village v
        JOIN scheme_status ss ON ss.scheme_id = v.scheme_id AND (LOWER(ss.fully_completion_scheme_status) LIKE '%progress%' OR LOWER(ss.fully_completion_scheme_status) LIKE '%partial%')
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        WHERE 1=1
          ${regionVillageFilter}
          ${agencySchemeStatusFilter}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name));
      `),
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(ws.population, 0) as population,
          COALESCE(ws.lpcd_value_day7::text, ws.lpcd_value_day1::text, '-') as lpcd_value,
          'Fully Completed' as status, ss.agency_type
        FROM village v
        JOIN scheme_status ss ON ss.scheme_id = v.scheme_id AND (TRIM(LOWER(ss.fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') OR TRIM(LOWER(ss.mjp_fully_completed)) = 'yes')
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        WHERE 1=1
          ${regionVillageFilter}
          ${agencySchemeStatusFilter}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name));
      `),
      db.execute(sql`
        SELECT DISTINCT ON (cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name)))
          cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name, cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
          cs.chlorine_connected, cs.pressure_connected, cs.flow_meter_connected,
          cs.overall_status as status, ss.agency_type
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND (LOWER(ss.fully_completion_scheme_status) LIKE '%progress%' OR LOWER(ss.fully_completion_scheme_status) LIKE '%partial%')
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
      db.execute(sql`
        SELECT DISTINCT ON (cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name)))
          cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name, cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
          cs.chlorine_connected, cs.pressure_connected, cs.flow_meter_connected,
          cs.overall_status as status, ss.agency_type
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND (TRIM(LOWER(ss.fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') OR TRIM(LOWER(ss.mjp_fully_completed)) = 'yes')
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          ss.water_supply as status, ss.agency_type
        FROM scheme_status ss
        WHERE ss.water_supply = 'Yes'
          AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      db.execute(sql`
        SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
          ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
          ws.population, ws.lpcd_value_day7 as lpcd_value, 'Yes' as status, ss.agency_type
        FROM water_scheme_data ws
        JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        WHERE ws.village_name IS NOT NULL
          ${regionWaterFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name));
      `),
      db.execute(sql`
        SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
          c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.region, c.circle, c.division, c.sub_division, c.block,
          'Yes' as status, ss.agency_type
        FROM chlorine_data c
        JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        WHERE c.esr_name IS NOT NULL AND c.esr_name != '-'
          ${regionChlorineFilter}
          ${agencySchemeStatusFilter}
        ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name));
      `),
    ]);

    const iotSchemesTotalList = iotSchemesTotalRes.rows || [];
    const iotSchemesFullyList = iotSchemesFullyRes.rows || [];
    const iotVillagesTotalList = iotVillagesTotalRes.rows || [];
    const iotVillagesFullyList = iotVillagesFullyRes.rows || [];
    const iotEsrTotalList = iotEsrTotalRes.rows || [];
    const iotEsrFullyList = iotEsrFullyRes.rows || [];
    const opSchemesList = opSchemesRes.rows || [];
    const opVillagesList = opVillagesRes.rows || [];
    const opEsrsList = opEsrsRes.rows || [];

    const physicalProgress = {
      schemes: {
        partial: iotSchemesTotalList.length,
        fully: iotSchemesFullyList.length,
        totalIntegrated: iotSchemesTotalList.length,
        fullyIntegrated: iotSchemesFullyList.length,
      },
      villages: {
        partial: iotVillagesTotalList.length,
        fully: iotVillagesFullyList.length,
        totalIntegrated: iotVillagesTotalList.length,
        fullyIntegrated: iotVillagesFullyList.length,
      },
      esr: {
        partial: iotEsrTotalList.length,
        fully: iotEsrFullyList.length,
        totalIntegrated: iotEsrTotalList.length,
        fullyIntegrated: iotEsrFullyList.length,
      },
    };

    const operational = {
      schemes: opSchemesList.length,
      villages: opVillagesList.length,
      esr: opEsrsList.length,
    };

    // 3. Query Daily Alerts Data for the Selected Date
    const metricsResult = await getAlertTrackerMetrics({
      date: isoDate,
      region: selectedRegion,
      agency,
    });

    // 4. Return Full Summary Payload with Clickable Datasets
    const payload = {
      success: true,
      selectedRegion,
      agency,
      asOfDate: displayDate,
      isoDate,
      dateMeta: metricsResult.dateMeta,
      projectScope,
      physicalProgress,
      operational,
      alertMatrix: {
        lpcd: metricsResult.lpcd,
        pressure: metricsResult.pressure,
        chlorine: metricsResult.chlorine,
      },
      allAlerts: metricsResult.allAlerts,
      totalDispatchedCount: metricsResult.totalDispatchedCount,
      details: {
        iotSchemesTotal: iotSchemesTotalList,
        iotSchemesFully: iotSchemesFullyList,
        iotVillagesTotal: iotVillagesTotalList,
        iotVillagesFully: iotVillagesFullyList,
        iotEsrTotal: iotEsrTotalList,
        iotEsrFully: iotEsrFullyList,
        operationalSchemes: opSchemesList,
        operationalVillages: opVillagesList,
        operationalEsr: opEsrsList,
        lpcdAlerts: metricsResult.lpcd.items,
        pressureAlerts: metricsResult.pressure.items,
        chlorineAlerts: metricsResult.chlorine.items,
        unresolvedEEAlerts: metricsResult.allAlerts.filter((i) => i.escalated_to_ee),
      },
    };

    trackerCache.set(cacheKey, { timestamp: Date.now(), payload });
    return res.json(payload);
  } catch (error) {
    console.error("Error in alert tracker summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate alert tracker summary",
      error: String(error),
    });
  }
});

/**
 * Triggers daily alert evaluation and dispatches SMS / Email notifications
 */
router.post("/escalate", async (req: Request, res: Response) => {
  try {
    const targetDate = (req.body?.date as string) || (req.query?.date as string);
    const dryRun = req.body?.dryRun === true;
    trackerCache.clear(); // Invalidate cache so newly dispatched logs appear immediately
    const result = await runDailyAlertTrackerEscalation({ targetDate, dryRun });
    return res.json(result);
  } catch (error: any) {
    console.error("Error triggering alert tracker escalation:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Returns current schedule status for Alert Tracker
 */
router.get("/cron-status", async (_req: Request, res: Response) => {
  try {
    const status = await getAlertTrackerCronStatus();
    return res.json(status);
  } catch (error: any) {
    console.error("Error retrieving alert tracker cron status:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
