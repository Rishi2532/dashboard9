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
    const requestedDate = (req.query.date as string) || new Date().toISOString().slice(0, 10);
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
      // 1. Partial Schemes
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(ss.number_of_village, ss.total_villages_integrated, 0) as total_villages,
          COALESCE(ss.total_number_of_esr, ss.total_esr_integrated, 0) as total_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number
        FROM scheme_status ss
        LEFT JOIN (
          SELECT scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id
        ) sp ON sp.scheme_id = ss.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = ss.scheme_id
        WHERE (ss.water_supply IS NULL OR TRIM(LOWER(ss.water_supply)) != 'yes')
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      // 2. Fully Completed Schemes (water_supply = Yes in scheme_status)
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(ss.fully_completed_villages, ss.number_of_village, ss.total_villages_integrated, 0) as total_villages,
          COALESCE(ss.no_fully_completed_esr, ss.total_number_of_esr, ss.total_esr_integrated, 0) as total_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number
        FROM scheme_status ss
        LEFT JOIN (
          SELECT scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id
        ) sp ON sp.scheme_id = ss.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = ss.scheme_id
        WHERE TRIM(LOWER(ss.water_supply)) = 'yes'
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      // 3. Partial Villages
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(ve.esr_count, 0) as total_esrs,
          COALESCE(ws.population, 0) as population,
          'In Progress' as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number
        FROM village v
        JOIN scheme_status ss ON ss.scheme_id = v.scheme_id AND (LOWER(ss.fully_completion_scheme_status) LIKE '%progress%' OR LOWER(ss.fully_completion_scheme_status) LIKE '%partial%')
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT scheme_id, LOWER(TRIM(village_name)) as v_name, COUNT(DISTINCT esr_name) as esr_count
          FROM communication_status
          WHERE esr_name IS NOT NULL AND esr_name != '-'
          GROUP BY scheme_id, LOWER(TRIM(village_name))
        ) ve ON ve.scheme_id = v.scheme_id AND ve.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)))
            scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = v.scheme_id AND sod.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON sod_sch.scheme_id = v.scheme_id
        WHERE 1=1
          ${regionVillageFilter}
          ${agencySchemeStatusFilter}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name));
      `),
      // 4. Fully Completed Villages
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(ve.esr_count, 0) as total_esrs,
          COALESCE(ws.population, 0) as population,
          'Fully Completed' as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number
        FROM village v
        JOIN scheme_status ss ON ss.scheme_id = v.scheme_id AND (TRIM(LOWER(ss.fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') OR TRIM(LOWER(ss.mjp_fully_completed)) = 'yes')
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT scheme_id, LOWER(TRIM(village_name)) as v_name, COUNT(DISTINCT esr_name) as esr_count
          FROM communication_status
          WHERE esr_name IS NOT NULL AND esr_name != '-'
          GROUP BY scheme_id, LOWER(TRIM(village_name))
        ) ve ON ve.scheme_id = v.scheme_id AND ve.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)))
            scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = v.scheme_id AND sod.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON sod_sch.scheme_id = v.scheme_id
        WHERE 1=1
          ${regionVillageFilter}
          ${agencySchemeStatusFilter}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name));
      `),
      // 5. Partial ESRs
      db.execute(sql`
        SELECT DISTINCT ON (cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name)))
          cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name, cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
          COALESCE(cs.chlorine_connected, 'Not') as chlorine_connected,
          COALESCE(cs.pressure_connected, 'Not') as pressure_connected,
          COALESCE(cs.flow_meter_connected, 'Not') as flow_meter_connected,
          COALESCE(ss.residual_chlorine_analyzer_connected, 0) as scheme_chlorine,
          COALESCE(ss.pressure_transmitter_connected, 0) as scheme_pressure,
          COALESCE(ss.flow_meters_connected, 0) as scheme_flow_meters,
          cs.overall_status as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND (LOWER(ss.fully_completion_scheme_status) LIKE '%progress%' OR LOWER(ss.fully_completion_scheme_status) LIKE '%partial%')
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)))
            scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = cs.scheme_id AND sod.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON sod_sch.scheme_id = cs.scheme_id
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
      // 6. Fully Completed ESRs
      db.execute(sql`
        SELECT DISTINCT ON (cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name)))
          cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name, cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
          COALESCE(cs.chlorine_connected, 'Not') as chlorine_connected,
          COALESCE(cs.pressure_connected, 'Not') as pressure_connected,
          COALESCE(cs.flow_meter_connected, 'Not') as flow_meter_connected,
          COALESCE(ss.residual_chlorine_analyzer_connected, 0) as scheme_chlorine,
          COALESCE(ss.pressure_transmitter_connected, 0) as scheme_pressure,
          COALESCE(ss.flow_meters_connected, 0) as scheme_flow_meters,
          cs.overall_status as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND (TRIM(LOWER(ss.fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed') OR TRIM(LOWER(ss.mjp_fully_completed)) = 'yes')
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)))
            scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = cs.scheme_id AND sod.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON sod_sch.scheme_id = cs.scheme_id
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
      // 7. Operational Connected Schemes
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(ss.number_of_village, ss.total_villages_integrated, 0) as total_villages,
          COALESCE(ss.total_number_of_esr, ss.total_esr_integrated, 0) as total_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.water_supply as status, ss.agency_type,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number
        FROM scheme_status ss
        LEFT JOIN (
          SELECT scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id
        ) sp ON sp.scheme_id = ss.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = ss.scheme_id
        WHERE ss.water_supply = 'Yes'
          AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      // 8. Operational Connected Villages
      db.execute(sql`
        SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
          ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
          COALESCE(ve.esr_count, 0) as total_esrs,
          COALESCE(ws.population, 0) as population,
          'Yes' as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number
        FROM water_scheme_data ws
        JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        LEFT JOIN (
          SELECT scheme_id, LOWER(TRIM(village_name)) as v_name, COUNT(DISTINCT esr_name) as esr_count
          FROM communication_status
          WHERE esr_name IS NOT NULL AND esr_name != '-'
          GROUP BY scheme_id, LOWER(TRIM(village_name))
        ) ve ON ve.scheme_id = ws.scheme_id AND ve.v_name = LOWER(TRIM(ws.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)))
            scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = ws.scheme_id AND sod.v_name = LOWER(TRIM(ws.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON sod_sch.scheme_id = ws.scheme_id
        WHERE ws.village_name IS NOT NULL
          ${regionWaterFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name));
      `),
      // 9. Operational Connected ESRs
      db.execute(sql`
        SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
          c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.region, c.circle, c.division, c.sub_division, c.block,
          COALESCE(cs.chlorine_connected, 'Connected') as chlorine_connected,
          COALESCE(cs.pressure_connected, 'Connected') as pressure_connected,
          COALESCE(cs.flow_meter_connected, 'Connected') as flow_meter_connected,
          COALESCE(ss.residual_chlorine_analyzer_connected, 0) as scheme_chlorine,
          COALESCE(ss.pressure_transmitter_connected, 0) as scheme_pressure,
          COALESCE(ss.flow_meters_connected, 0) as scheme_flow_meters,
          'Yes' as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number
        FROM chlorine_data c
        JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        LEFT JOIN communication_status cs ON cs.scheme_id = c.scheme_id AND LOWER(TRIM(cs.village_name)) = LOWER(TRIM(c.village_name)) AND LOWER(TRIM(cs.esr_name)) = LOWER(TRIM(c.esr_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)))
            scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = c.scheme_id AND sod.v_name = LOWER(TRIM(c.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (scheme_id)
            scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY scheme_id, (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON sod_sch.scheme_id = c.scheme_id
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
    const dryRun = req.body?.dryRun === true || req.query?.dryRun === "true";
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
