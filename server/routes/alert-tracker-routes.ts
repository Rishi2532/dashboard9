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

// Cache for alert tracker summary to provide instant filter switching and prevent UI freezes
const trackerCache = new Map<string, { timestamp: number; payload: any }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds memory cache for snappy filter toggling

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
    const normRegion = selectedRegion && selectedRegion.includes("Sambhajinagar") ? "Sambhajinagar" : selectedRegion;

    const regionSchemeStatusFilter = isAllRegion
      ? sql``
      : sql`AND (ss.region ILIKE ${`%${normRegion}%`} OR ss.region ILIKE ${`%${selectedRegion}%`})`;

    const regionVillageFilter = isAllRegion
      ? sql``
      : sql`AND (v.region ILIKE ${`%${normRegion}%`} OR v.region ILIKE ${`%${selectedRegion}%`})`;

    const regionCommFilter = isAllRegion
      ? sql``
      : sql`AND (cs.region ILIKE ${`%${normRegion}%`} OR cs.region ILIKE ${`%${selectedRegion}%`})`;

    const regionMasterFilter = isAllRegion
      ? sql``
      : sql`AND (svem.region ILIKE ${`%${normRegion}%`} OR svem.region ILIKE ${`%${selectedRegion}%`})`;

    const regionWaterFilter = isAllRegion
      ? sql``
      : sql`AND (ws.region ILIKE ${`%${normRegion}%`} OR ws.region ILIKE ${`%${selectedRegion}%`})`;

    const regionChlorineFilter = isAllRegion
      ? sql``
      : sql`AND (c.region ILIKE ${`%${normRegion}%`} OR c.region ILIKE ${`%${selectedRegion}%`})`;

    let agencySchemeStatusFilter = sql``;
    if (!isAllAgency) {
      const a = agency.toLowerCase().trim();
      if (a === "zp-self" || a === "zpself" || a === "zp self") {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE '%ZP-Self%'`;
      } else if (a.includes("shikhar") || a.includes("shikar")) {
        agencySchemeStatusFilter = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE '%shikhar%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%shikar%')`;
      } else if (a === "zp") {
        agencySchemeStatusFilter = sql`AND (COALESCE(ss.agency, ss.agency_type) ILIKE 'ZP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%ZP%')`;
      } else if (a.includes("gram") || a === "gp") {
        agencySchemeStatusFilter = sql`AND (COALESCE(ss.agency, ss.agency_type) = 'GP' OR COALESCE(ss.agency, ss.agency_type) ILIKE 'GP%' OR COALESCE(ss.agency, ss.agency_type) ILIKE '%gram%')`;
      } else if (a.includes("mjp")) {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE '%MJP%'`;
      } else if (a.includes("contractor")) {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE '%Contractor%'`;
      } else {
        agencySchemeStatusFilter = sql`AND COALESCE(ss.agency, ss.agency_type) ILIKE ${`%${agency}%`}`;
      }
    }

    // Scheme ID mapping between scheme_status and scheme_progress_summary for the 14 historical variations
    const mappedSpsIdSql = sql`(
      CASE 
        WHEN TRIM(ss.scheme_id::text) = '20091847' THEN '7945938'
        WHEN TRIM(ss.scheme_id::text) = '20055901' THEN '20055900'
        WHEN TRIM(ss.scheme_id::text) = '20006165' THEN '20061165'
        WHEN TRIM(ss.scheme_id::text) = '456654' THEN '20031278'
        WHEN TRIM(ss.scheme_id::text) = '2009882' THEN '20009882'
        WHEN TRIM(ss.scheme_id::text) = '20040623' THEN '20028743'
        WHEN TRIM(ss.scheme_id::text) = '20027837' THEN '20027896'
        WHEN TRIM(ss.scheme_id::text) = '2003645' THEN '20003645'
        WHEN TRIM(ss.scheme_id::text) = '20036536' THEN '20036535'
        WHEN TRIM(ss.scheme_id::text) = '20046319' THEN '20046349'
        WHEN TRIM(ss.scheme_id::text) = '20091918' THEN '20054895'
        WHEN TRIM(ss.scheme_id::text) = '20093522' THEN '5348540'
        WHEN TRIM(ss.scheme_id::text) = '20030778' THEN '20028775'
        WHEN TRIM(ss.scheme_id::text) = '20028036' THEN '20013311'
        ELSE TRIM(ss.scheme_id::text)
      END
    )`;

    // 1. Project Scope (Directly aggregated live from scheme_progress_summary with deduplicated scheme_status metadata, matching dashboard.tsx)
    let projectScope = {
      schemes: 0,
      villages: 0,
      esr: 0,
    };

    try {
      const scopeRes: any = await db.execute(sql`
        WITH distinct_ss AS (
          SELECT DISTINCT ON (TRIM(ss.scheme_id::text))
            TRIM(ss.scheme_id::text) as scheme_id,
            ${mappedSpsIdSql} as mapped_sps_id,
            ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
            ss.agency, ss.agency_type,
            COALESCE(ss.agency, ss.agency_type) as final_agency,
            ss.number_of_village, ss.total_number_of_esr
          FROM scheme_status ss
          ORDER BY TRIM(ss.scheme_id::text)
        )
        SELECT
          COUNT(DISTINCT sps.scheme_id)::bigint AS schemes,
          COALESCE(SUM(sps.number_of_villages), 0)::bigint AS villages,
          COALESCE(SUM(COALESCE(sps.number_of_esr, 0) + COALESCE(sps.number_of_gsr, 0) + COALESCE(sps.number_of_mbr, 0)), 0)::bigint AS esr
        FROM scheme_progress_summary sps
        LEFT JOIN distinct_ss ss ON ss.mapped_sps_id = TRIM(sps.scheme_id::text)
        WHERE 1=1
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter};
      `);
      const r = scopeRes.rows ? scopeRes.rows[0] : scopeRes[0];
      if (r) {
        projectScope = {
          schemes: Number(r.schemes || 0),
          villages: Number(r.villages || 0),
          esr: Number(r.esr || 0),
        };
      }
    } catch (err) {
      console.warn("Could not query project scope:", err);
    }

    // 2. Physical Progress, Scope & Operational Details
    const [
      projectScopeSchemesRes,
      projectScopeVillagesRes,
      projectScopeEsrRes,
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
      // Scope 1: All Schemes in Scope (Sourced from scheme_progress_summary matching dashboard.tsx)
      db.execute(sql`
        WITH distinct_ss AS (
          SELECT DISTINCT ON (TRIM(ss.scheme_id::text))
            TRIM(ss.scheme_id::text) as scheme_id,
            ${mappedSpsIdSql} as mapped_sps_id,
            ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
            ss.agency, ss.agency_type,
            COALESCE(ss.agency, ss.agency_type) as final_agency,
            ss.total_villages_integrated, ss.total_esr_integrated, ss.no_fully_completed_esr,
            ss.fully_completion_scheme_status, ss.water_supply
          FROM scheme_status ss
          ORDER BY TRIM(ss.scheme_id::text)
        )
        SELECT
          sps.scheme_id,
          COALESCE(sps.scheme_name, ss.scheme_name) as scheme_name,
          COALESCE(ss.region, sps.region) as region,
          ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(sps.number_of_villages, 0) as total_villages,
          COALESCE(ss.total_villages_integrated, 0) as connected_villages,
          (COALESCE(sps.number_of_esr, 0) + COALESCE(sps.number_of_gsr, 0) + COALESCE(sps.number_of_mbr, 0)) as total_esrs,
          COALESCE(ss.no_fully_completed_esr, 0) as completed_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type,
          CASE 
            WHEN COALESCE(ss.fully_completion_scheme_status, '') = 'Not-Connected' THEN 'Not Connected'
            WHEN ss.fully_completion_scheme_status IN ('Fully Completed', 'In Progress', 'Connected') OR COALESCE(ss.total_villages_integrated, 0) > 0 OR COALESCE(ss.total_esr_integrated, 0) > 0 THEN 'Connected'
            ELSE 'Not Connected'
          END as is_connected,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, '-') as ee_email
        FROM scheme_progress_summary sps
        LEFT JOIN distinct_ss ss ON ss.mapped_sps_id = TRIM(sps.scheme_id::text)
        LEFT JOIN (
          SELECT scheme_id::text as scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id::text
        ) sp ON sp.scheme_id = TRIM(sps.scheme_id::text)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id::text))
            TRIM(scheme_id::text) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id::text), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON sod.scheme_id = TRIM(sps.scheme_id::text)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id::text))
            TRIM(scheme_id::text) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id::text), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON sod_ee.scheme_id = TRIM(sps.scheme_id::text)
        WHERE 1=1
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY sps.scheme_id;
      `),
      // Scope 2: All Villages in Scope
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(v.number_of_esr, 0) as total_esrs,
          COALESCE(v.no_of_fully_completion_esr, 0) as completed_esrs,
          COALESCE(v.connected_esr, 0) as connected_esrs,
          CASE 
            WHEN COALESCE(v.connected_esr, 0) > 0 THEN 'Connected' 
            ELSE 'Not Connected' 
          END as is_connected,
          COALESCE(ws.population, 0) as population,
          v.fully_completion_village_status as status,
          ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
        FROM village v
        JOIN scheme_status ss ON ss.scheme_id = v.scheme_id
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(v.scheme_id) AND sod.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(v.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(v.scheme_id) AND sod_ee.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(v.scheme_id)
        WHERE 1=1
          ${regionVillageFilter}
          ${agencySchemeStatusFilter}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name));
      `),
      // Scope 3: All ESRs in Scope
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
          CASE 
            WHEN (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%') THEN 'Connected'
            ELSE 'Not Connected'
          END as is_connected,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(cs.scheme_id) AND sod.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(cs.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(cs.scheme_id) AND sod_ee.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(cs.scheme_id)
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
      // 1. Partial Schemes
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(sps.number_of_villages, ss.number_of_village, 0) as total_villages,
          COALESCE(ss.total_villages_integrated, 0) as connected_villages,
          CASE
            WHEN sps.scheme_id IS NOT NULL THEN (COALESCE(sps.number_of_esr, 0) + COALESCE(sps.number_of_gsr, 0) + COALESCE(sps.number_of_mbr, 0))
            ELSE COALESCE(ss.total_number_of_esr, 0)
          END as total_esrs,
          COALESCE(ss.no_fully_completed_esr, 0) as completed_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type,
          CASE 
            WHEN COALESCE(ss.fully_completion_scheme_status, '') = 'Not-Connected' THEN 'Not Connected'
            WHEN ss.fully_completion_scheme_status IN ('Fully Completed', 'In Progress', 'Connected') OR COALESCE(ss.total_villages_integrated, 0) > 0 OR COALESCE(ss.total_esr_integrated, 0) > 0 THEN 'Connected'
            ELSE 'Not Connected'
          END as is_connected,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, '-') as ee_email
        FROM scheme_status ss
        LEFT JOIN scheme_progress_summary sps ON TRIM(sps.scheme_id::text) = ${mappedSpsIdSql}
        LEFT JOIN (
          SELECT scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id
        ) sp ON sp.scheme_id = ss.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(ss.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(ss.scheme_id)
        WHERE (ss.water_supply IS NULL OR TRIM(LOWER(ss.water_supply)) != 'yes')
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      // 2. Fully Completed Schemes (water_supply = Yes in scheme_status)
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(sps.number_of_villages, ss.number_of_village, 0) as total_villages,
          COALESCE(ss.total_villages_integrated, 0) as connected_villages,
          CASE
            WHEN sps.scheme_id IS NOT NULL THEN (COALESCE(sps.number_of_esr, 0) + COALESCE(sps.number_of_gsr, 0) + COALESCE(sps.number_of_mbr, 0))
            ELSE COALESCE(ss.total_number_of_esr, 0)
          END as total_esrs,
          COALESCE(ss.no_fully_completed_esr, 0) as completed_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.fully_completion_scheme_status as status,
          ss.water_supply, ss.agency_type,
          CASE 
            WHEN COALESCE(ss.fully_completion_scheme_status, '') = 'Not-Connected' THEN 'Not Connected'
            WHEN ss.fully_completion_scheme_status IN ('Fully Completed', 'In Progress', 'Connected') OR COALESCE(ss.total_villages_integrated, 0) > 0 OR COALESCE(ss.total_esr_integrated, 0) > 0 THEN 'Connected'
            ELSE 'Not Connected'
          END as is_connected,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, '-') as ee_email
        FROM scheme_status ss
        LEFT JOIN scheme_progress_summary sps ON TRIM(sps.scheme_id::text) = ${mappedSpsIdSql}
        LEFT JOIN (
          SELECT scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id
        ) sp ON sp.scheme_id = ss.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(ss.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(ss.scheme_id)
        WHERE TRIM(LOWER(ss.water_supply)) = 'yes'
          ${regionSchemeStatusFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ss.scheme_id, ss.region, ss.scheme_name;
      `),
      // 3. Partial Villages (From village table)
      db.execute(sql`
        SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
          v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
          COALESCE(v.number_of_esr, 0) as total_esrs,
          COALESCE(v.no_of_fully_completion_esr, 0) as completed_esrs,
          COALESCE(v.connected_esr, 0) as connected_esrs,
          CASE 
            WHEN COALESCE(v.connected_esr, 0) > 0 THEN 'Connected' 
            ELSE 'Not Connected' 
          END as is_connected,
          COALESCE(ws.population, 0) as population,
          'In Progress' as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
        FROM village v
        JOIN scheme_status ss ON ss.scheme_id = v.scheme_id AND (ss.water_supply IS NULL OR TRIM(LOWER(ss.water_supply)) != 'yes')
        LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(v.scheme_id) AND sod.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(v.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(v.scheme_id) AND sod_ee.v_name = LOWER(TRIM(v.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(v.scheme_id)
        WHERE 1=1
          ${regionVillageFilter}
          ${agencySchemeStatusFilter}
        ORDER BY v.scheme_id, LOWER(TRIM(v.village_name));
      `),
      // 4. Fully Completed Villages (From village table + any unconnected villages from scheme_village_esr_master)
      db.execute(sql`
        WITH all_fc_villages AS (
          SELECT
            v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
            COALESCE(v.number_of_esr, 0) as total_esrs,
            COALESCE(v.no_of_fully_completion_esr, 0) as completed_esrs,
            COALESCE(v.connected_esr, 0) as connected_esrs,
            CASE 
              WHEN COALESCE(v.connected_esr, 0) > 0 THEN 'Connected' 
              ELSE 'Not Connected' 
            END as is_connected,
            COALESCE(ws.population, 0) as population,
            'Fully Completed' as status, ss.agency_type,
            COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
            COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
            COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
            COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
            COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
          FROM village v
          JOIN scheme_status ss ON ss.scheme_id = v.scheme_id AND TRIM(LOWER(ss.water_supply)) = 'yes'
          LEFT JOIN water_scheme_data ws ON ws.scheme_id = v.scheme_id AND LOWER(TRIM(ws.village_name)) = LOWER(TRIM(v.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod ON TRIM(sod.scheme_id) = TRIM(v.scheme_id) AND sod.v_name = LOWER(TRIM(v.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(v.scheme_id)
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(v.scheme_id) AND sod_ee.v_name = LOWER(TRIM(v.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(v.scheme_id)
          WHERE 1=1
            ${regionVillageFilter}
            ${agencySchemeStatusFilter}

          UNION ALL

          SELECT DISTINCT ON (svem.scheme_id, LOWER(TRIM(svem.village_name)))
            svem.scheme_id, svem.scheme_name, svem.village_name, svem.region, ss.circle, ss.division, svem.sub_division, svem.block_name as block,
            0 as total_esrs,
            0 as completed_esrs,
            0 as connected_esrs,
            'Not Connected' as is_connected,
            0 as population,
            'Not Connected' as status, ss.agency_type,
            COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
            COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
            COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
            COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
            COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
          FROM scheme_village_esr_master svem
          JOIN scheme_status ss ON ss.scheme_id = svem.scheme_id AND TRIM(LOWER(ss.water_supply)) = 'yes'
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod ON TRIM(sod.scheme_id) = TRIM(svem.scheme_id) AND sod.v_name = LOWER(TRIM(svem.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(svem.scheme_id)
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(svem.scheme_id) AND sod_ee.v_name = LOWER(TRIM(svem.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(svem.scheme_id)
          WHERE NOT EXISTS (
            SELECT 1 FROM village v2
            WHERE TRIM(v2.scheme_id) = TRIM(svem.scheme_id) AND LOWER(TRIM(v2.village_name)) = LOWER(TRIM(svem.village_name))
          )
          ${regionMasterFilter}
          ${agencySchemeStatusFilter}
        )
        SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name))) *
        FROM all_fc_villages
        ORDER BY scheme_id, LOWER(TRIM(village_name));
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
          CASE 
            WHEN (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%') THEN 'Connected'
            ELSE 'Not Connected'
          END as is_connected,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND (ss.water_supply IS NULL OR TRIM(LOWER(ss.water_supply)) != 'yes')
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(cs.scheme_id) AND sod.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(cs.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(cs.scheme_id) AND sod_ee.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(cs.scheme_id)
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
      // 6. Fully Completed ESRs (From communication_status + any unconnected ESRs from scheme_village_esr_master)
      db.execute(sql`
        WITH all_fc_esrs AS (
          SELECT
            cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name, cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
            COALESCE(cs.chlorine_connected, 'Not') as chlorine_connected,
            COALESCE(cs.pressure_connected, 'Not') as pressure_connected,
            COALESCE(cs.flow_meter_connected, 'Not') as flow_meter_connected,
            COALESCE(ss.residual_chlorine_analyzer_connected, 0) as scheme_chlorine,
            COALESCE(ss.pressure_transmitter_connected, 0) as scheme_pressure,
            COALESCE(ss.flow_meters_connected, 0) as scheme_flow_meters,
            cs.overall_status as status, ss.agency_type,
            CASE 
              WHEN (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%') THEN 'Connected'
              ELSE 'Not Connected'
            END as is_connected,
            COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
            COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
            COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
            COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
            COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
          FROM communication_status cs
          JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND TRIM(LOWER(ss.water_supply)) = 'yes'
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod ON TRIM(sod.scheme_id) = TRIM(cs.scheme_id) AND sod.v_name = LOWER(TRIM(cs.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(cs.scheme_id)
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(cs.scheme_id) AND sod_ee.v_name = LOWER(TRIM(cs.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(cs.scheme_id)
          WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
            ${regionCommFilter}
            ${agencySchemeStatusFilter}

          UNION ALL

          SELECT DISTINCT ON (svem.scheme_id, LOWER(TRIM(svem.village_name)), LOWER(TRIM(svem.esr_name)))
            svem.scheme_id, svem.scheme_name, svem.village_name, svem.esr_name, svem.region, ss.circle, ss.division, svem.sub_division, svem.block_name as block,
            'Not' as chlorine_connected,
            'Not' as pressure_connected,
            'Not' as flow_meter_connected,
            COALESCE(ss.residual_chlorine_analyzer_connected, 0) as scheme_chlorine,
            COALESCE(ss.pressure_transmitter_connected, 0) as scheme_pressure,
            COALESCE(ss.flow_meters_connected, 0) as scheme_flow_meters,
            'Not Connected' as status, ss.agency_type,
            'Not Connected' as is_connected,
            COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
            COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
            COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
            COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
            COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
          FROM scheme_village_esr_master svem
          JOIN scheme_status ss ON ss.scheme_id = svem.scheme_id AND TRIM(LOWER(ss.water_supply)) = 'yes'
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod ON TRIM(sod.scheme_id) = TRIM(svem.scheme_id) AND sod.v_name = LOWER(TRIM(svem.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, operator_name, operator_number
            FROM scheme_operator_details
            WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
            ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
          ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(svem.scheme_id)
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
              TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(svem.scheme_id) AND sod_ee.v_name = LOWER(TRIM(svem.village_name))
          LEFT JOIN (
            SELECT DISTINCT ON (TRIM(scheme_id))
              TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
            FROM scheme_operator_details
            WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
            ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
          ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(svem.scheme_id)
          WHERE svem.esr_name IS NOT NULL AND svem.esr_name != '' AND svem.esr_name != '-'
            AND NOT EXISTS (
              SELECT 1 FROM communication_status cs2
              WHERE TRIM(cs2.scheme_id) = TRIM(svem.scheme_id) 
                AND (
                  LOWER(TRIM(cs2.esr_name)) = LOWER(TRIM(svem.esr_name))
                  OR LOWER(TRIM(svem.esr_name)) = LOWER(TRIM(cs2.village_name)) || '_' || LOWER(TRIM(cs2.esr_name))
                  OR LOWER(TRIM(svem.esr_name)) LIKE '%' || LOWER(TRIM(cs2.esr_name))
                  OR LOWER(TRIM(cs2.esr_name)) LIKE '%' || LOWER(TRIM(svem.esr_name))
                  OR regexp_replace(
                       regexp_replace(
                         regexp_replace(
                           regexp_replace(
                             regexp_replace(lower(cs2.esr_name), '^[\\(][ep][\\)]|\\y(existing|proposed|outlet|ol)\\y', '', 'g'),
                             '\\.([0-9])0+\\y', '.\\1', 'g'
                           ),
                           '\\.0+\\y', '', 'g'
                         ),
                         '0+([a-z])', '\\1', 'g'
                       ),
                       '[^a-z0-9]', '', 'g'
                     ) = regexp_replace(
                       regexp_replace(
                         regexp_replace(
                           regexp_replace(
                             regexp_replace(lower(svem.esr_name), '^[\\(][ep][\\)]|\\y(existing|proposed|outlet|ol)\\y', '', 'g'),
                             '\\.([0-9])0+\\y', '.\\1', 'g'
                           ),
                           '\\.0+\\y', '', 'g'
                         ),
                         '0+([a-z])', '\\1', 'g'
                       ),
                       '[^a-z0-9]', '', 'g'
                     )
                  OR (
                    (
                      regexp_replace(lower(cs2.village_name), '[^a-z0-9]', '', 'g') = regexp_replace(lower(svem.village_name), '[^a-z0-9]', '', 'g')
                      OR regexp_replace(lower(cs2.village_name), '[^a-z0-9]', '', 'g') LIKE '%' || regexp_replace(lower(svem.village_name), '[^a-z0-9]', '', 'g') || '%'
                      OR regexp_replace(lower(svem.village_name), '[^a-z0-9]', '', 'g') LIKE '%' || regexp_replace(lower(cs2.village_name), '[^a-z0-9]', '', 'g') || '%'
                    )
                    AND (
                      (lower(cs2.esr_name) LIKE '%mbr%' AND lower(svem.esr_name) LIKE '%mbr%')
                      OR (lower(cs2.esr_name) LIKE '%gsr%' AND lower(svem.esr_name) LIKE '%gsr%')
                      OR (lower(cs2.esr_name) LIKE '%esr%' AND lower(svem.esr_name) LIKE '%esr%')
                    )
                  )
                )
            )
            ${regionMasterFilter}
            ${agencySchemeStatusFilter}
        )
        SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))) *
        FROM all_fc_esrs
        ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name));
      `),
      // 7. Operational Connected Schemes
      db.execute(sql`
        SELECT DISTINCT ON (ss.scheme_id)
          ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division, ss.sub_division, ss.block,
          COALESCE(ss.number_of_village, ss.total_villages_integrated, 0) as total_villages,
          COALESCE(ss.total_villages_integrated, 0) as connected_villages,
          COALESCE(ss.total_number_of_esr, ss.total_esr_integrated, 0) as total_esrs,
          COALESCE(ss.no_fully_completed_esr, 0) as completed_esrs,
          COALESCE(sp.total_population, 0) as population,
          ss.water_supply as status, ss.agency_type,
          'Connected' as is_connected,
          COALESCE(sod.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, '-') as ee_email
        FROM scheme_status ss
        LEFT JOIN (
          SELECT scheme_id, SUM(COALESCE(population, 0)) as total_population
          FROM water_scheme_data
          GROUP BY scheme_id
        ) sp ON sp.scheme_id = ss.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(ss.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(ss.scheme_id)
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
          COALESCE(v.number_of_esr, ve.esr_count, 0) as total_esrs,
          COALESCE(v.no_of_fully_completion_esr, 0) as completed_esrs,
          COALESCE(v.connected_esr, ve.esr_count, 0) as connected_esrs,
          'Connected' as is_connected,
          COALESCE(ws.population, 0) as population,
          'Yes' as status, ss.agency_type,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
        FROM water_scheme_data ws
        JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        LEFT JOIN village v ON v.scheme_id = ws.scheme_id AND LOWER(TRIM(v.village_name)) = LOWER(TRIM(ws.village_name))
        LEFT JOIN (
          SELECT scheme_id, LOWER(TRIM(village_name)) as v_name, COUNT(DISTINCT esr_name) as esr_count
          FROM communication_status
          WHERE esr_name IS NOT NULL AND esr_name != '-'
          GROUP BY scheme_id, LOWER(TRIM(village_name))
        ) ve ON ve.scheme_id = ws.scheme_id AND ve.v_name = LOWER(TRIM(ws.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(ws.scheme_id) AND sod.v_name = LOWER(TRIM(ws.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(ws.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(ws.scheme_id) AND sod_ee.v_name = LOWER(TRIM(ws.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(ws.scheme_id)
        WHERE ws.village_name IS NOT NULL
          ${regionWaterFilter}
          ${agencySchemeStatusFilter}
        ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name));
      `),
      // 9. Operational Connected ESRs
      db.execute(sql`
        SELECT DISTINCT ON (cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name)))
          cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name, cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
          COALESCE(cs.chlorine_connected, 'Connected') as chlorine_connected,
          COALESCE(cs.pressure_connected, 'Connected') as pressure_connected,
          COALESCE(cs.flow_meter_connected, 'Connected') as flow_meter_connected,
          COALESCE(ss.residual_chlorine_analyzer_connected, 0) as scheme_chlorine,
          COALESCE(ss.pressure_transmitter_connected, 0) as scheme_pressure,
          COALESCE(ss.flow_meters_connected, 0) as scheme_flow_meters,
          'Yes' as status, ss.agency_type,
          CASE 
            WHEN (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%') THEN 'Connected'
            ELSE 'Not Connected'
          END as is_connected,
          COALESCE(sod.operator_name, sod_sch.operator_name, '-') as operator_name,
          COALESCE(sod.operator_number, sod_sch.operator_number, '-') as operator_number,
          COALESCE(sod_ee.ee_name, sod_ee_sch.ee_name, '-') as ee_name,
          COALESCE(sod_ee.ee_number, sod_ee_sch.ee_number, '-') as ee_number,
          COALESCE(sod_ee.ee_email, sod_ee_sch.ee_email, '-') as ee_email
        FROM communication_status cs
        JOIN scheme_status ss ON ss.scheme_id = cs.scheme_id AND ss.water_supply = 'Yes' AND (ss.total_villages_integrated > 0 OR ss.total_esr_integrated > 0)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod ON TRIM(sod.scheme_id) = TRIM(cs.scheme_id) AND sod.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, operator_name, operator_number
          FROM scheme_operator_details
          WHERE operator_name IS NOT NULL AND operator_name != '' AND operator_name != '-' AND LOWER(operator_name) != 'village operator'
          ORDER BY TRIM(scheme_id), (operator_number IS NOT NULL AND operator_number != '' AND operator_number != '-') DESC
        ) sod_sch ON TRIM(sod_sch.scheme_id) = TRIM(cs.scheme_id)
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id), LOWER(TRIM(village_name)))
            TRIM(scheme_id) as scheme_id, LOWER(TRIM(village_name)) as v_name, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), LOWER(TRIM(village_name)), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee ON TRIM(sod_ee.scheme_id) = TRIM(cs.scheme_id) AND sod_ee.v_name = LOWER(TRIM(cs.village_name))
        LEFT JOIN (
          SELECT DISTINCT ON (TRIM(scheme_id))
            TRIM(scheme_id) as scheme_id, ee_name, ee_number, ee_email
          FROM scheme_operator_details
          WHERE ee_name IS NOT NULL AND ee_name != '' AND ee_name != '-' AND LOWER(ee_name) != 'executive engineer'
          ORDER BY TRIM(scheme_id), (ee_number IS NOT NULL AND ee_number != '' AND ee_number != '-') DESC
        ) sod_ee_sch ON TRIM(sod_ee_sch.scheme_id) = TRIM(cs.scheme_id)
        WHERE cs.esr_name IS NOT NULL AND cs.esr_name != '-'
          AND (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%')
          ${regionCommFilter}
          ${agencySchemeStatusFilter}
        ORDER BY cs.scheme_id, LOWER(TRIM(cs.village_name)), LOWER(TRIM(cs.esr_name));
      `),
    ]);

    const projectScopeSchemesList = projectScopeSchemesRes.rows || [];
    const projectScopeVillagesList = projectScopeVillagesRes.rows || [];
    const projectScopeEsrList = projectScopeEsrRes.rows || [];
    const iotSchemesTotalList = iotSchemesTotalRes.rows || [];
    const iotSchemesFullyList = iotSchemesFullyRes.rows || [];
    const iotVillagesTotalList = iotVillagesTotalRes.rows || [];
    const iotVillagesFullyList = iotVillagesFullyRes.rows || [];
    const iotEsrTotalList = iotEsrTotalRes.rows || [];
    const iotEsrFullyList = iotEsrFullyRes.rows || [];
    const opSchemesList = opSchemesRes.rows || [];
    const opVillagesList = opVillagesRes.rows || [];
    const opEsrsList = opEsrsRes.rows || [];

    const totalVillagesPartial = iotSchemesTotalList.reduce((sum: number, item: any) => sum + (Number(item.total_villages) || 0), 0);
    const totalVillagesFully = iotSchemesFullyList.reduce((sum: number, item: any) => sum + (Number(item.total_villages) || 0), 0);
    const totalEsrPartial = iotSchemesTotalList.reduce((sum: number, item: any) => sum + (Number(item.total_esrs) || 0), 0);
    const totalEsrFully = iotSchemesFullyList.reduce((sum: number, item: any) => sum + (Number(item.total_esrs) || 0), 0);

    // If iotVillagesFullyList has fewer records than totalVillagesFully (e.g. missing villages for some schemes),
    // add placeholder rows with 'No Data Received' and 'Not Connected' for schemes missing physical records
    if (iotVillagesFullyList.length < totalVillagesFully) {
      const existingVilCountByScheme: Record<string, number> = {};
      for (const r of iotVillagesFullyList) {
        existingVilCountByScheme[r.scheme_id] = (existingVilCountByScheme[r.scheme_id] || 0) + 1;
      }

      for (const scheme of iotSchemesFullyList) {
        const target = Number(scheme.total_villages) || 0;
        const current = existingVilCountByScheme[scheme.scheme_id] || 0;
        if (target > current) {
          const missing = target - current;
          for (let i = 1; i <= missing; i++) {
            if (iotVillagesFullyList.length >= totalVillagesFully) break;
            iotVillagesFullyList.push({
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              village_name: 'No Data Received',
              region: scheme.region,
              circle: scheme.circle,
              division: scheme.division,
              sub_division: scheme.sub_division,
              block: scheme.block,
              total_esrs: 0,
              completed_esrs: 0,
              connected_esrs: 0,
              population: 0,
              status: 'Not Connected',
              agency_type: scheme.agency_type,
              is_connected: 'Not Connected',
              operator_name: scheme.operator_name || '-',
              operator_number: scheme.operator_number || '-',
              ee_name: scheme.ee_name || '-',
              ee_number: scheme.ee_number || '-',
              ee_email: scheme.ee_email || '-',
            });
          }
        }
      }
    }
    if (iotVillagesFullyList.length > totalVillagesFully) {
      iotVillagesFullyList.length = totalVillagesFully;
    }

    // If iotEsrFullyList has fewer records than totalEsrFully (e.g. 556 real records vs 612 target),
    // add placeholder rows with 'No Data Received' and 'Not Connected' for schemes missing physical records
    if (iotEsrFullyList.length < totalEsrFully) {
      const existingEsrCountByScheme: Record<string, number> = {};
      for (const r of iotEsrFullyList) {
        existingEsrCountByScheme[r.scheme_id] = (existingEsrCountByScheme[r.scheme_id] || 0) + 1;
      }

      for (const scheme of iotSchemesFullyList) {
        const target = Number(scheme.total_esrs) || 0;
        const current = existingEsrCountByScheme[scheme.scheme_id] || 0;
        if (target > current) {
          const missing = target - current;
          for (let i = 1; i <= missing; i++) {
            if (iotEsrFullyList.length >= totalEsrFully) break;
            iotEsrFullyList.push({
              scheme_id: scheme.scheme_id,
              scheme_name: scheme.scheme_name,
              village_name: 'No Data Received',
              esr_name: 'No Data Received',
              region: scheme.region,
              circle: scheme.circle,
              division: scheme.division,
              sub_division: scheme.sub_division,
              block: scheme.block,
              chlorine_connected: 'Not',
              pressure_connected: 'Not',
              flow_meter_connected: 'Not',
              scheme_chlorine: 0,
              scheme_pressure: 0,
              scheme_flow_meters: 0,
              status: 'Not Connected',
              agency_type: scheme.agency_type,
              is_connected: 'Not Connected',
              operator_name: scheme.operator_name || '-',
              operator_number: scheme.operator_number || '-',
              ee_name: scheme.ee_name || '-',
              ee_number: scheme.ee_number || '-',
              ee_email: scheme.ee_email || '-',
            });
          }
        }
      }
    }
    if (iotEsrFullyList.length > totalEsrFully) {
      iotEsrFullyList.length = totalEsrFully;
    }

    // Sort to place all genuine named records first, and all "No Data Received" / "Data Not Available" at the end of the list
    iotVillagesFullyList.sort((a: any, b: any) => {
      const aNoData = a.village_name === 'No Data Received' || a.village_name === 'Data Not Available' ? 1 : 0;
      const bNoData = b.village_name === 'No Data Received' || b.village_name === 'Data Not Available' ? 1 : 0;
      return aNoData - bNoData;
    });

    iotEsrFullyList.sort((a: any, b: any) => {
      const aNoData = a.esr_name === 'No Data Received' || a.esr_name === 'Data Not Available' ? 1 : 0;
      const bNoData = b.esr_name === 'No Data Received' || b.esr_name === 'Data Not Available' ? 1 : 0;
      return aNoData - bNoData;
    });

    // Difference datasets (Physical progress fully completed vs IoT Operational)
    const opSchemeIds = new Set(opSchemesList.map((s: any) => String(s.scheme_id)));
    const diffSchemes = iotSchemesFullyList.filter((s: any) => !opSchemeIds.has(String(s.scheme_id)));

    const opVillageKeys = new Set(opVillagesList.map((v: any) => `${String(v.scheme_id)}-${String(v.village_name).toLowerCase().trim()}`));
    const diffVillages = iotVillagesFullyList.filter((v: any) => !opVillageKeys.has(`${String(v.scheme_id)}-${String(v.village_name).toLowerCase().trim()}`));

    const opEsrKeys = new Set(opEsrsList.map((e: any) => `${String(e.scheme_id)}-${String(e.esr_name || e.reservoir_name).toLowerCase().trim()}`));
    const diffEsrs = iotEsrFullyList.filter((e: any) => !opEsrKeys.has(`${String(e.scheme_id)}-${String(e.esr_name || e.reservoir_name).toLowerCase().trim()}`));

    const physicalProgress = {
      schemes: {
        partial: iotSchemesTotalList.length,
        fully: iotSchemesFullyList.length,
        totalIntegrated: iotSchemesTotalList.length,
        fullyIntegrated: iotSchemesFullyList.length,
      },
      villages: {
        partial: totalVillagesPartial,
        fully: totalVillagesFully,
        totalIntegrated: totalVillagesPartial,
        fullyIntegrated: totalVillagesFully,
      },
      esr: {
        partial: totalEsrPartial,
        fully: totalEsrFully,
        totalIntegrated: totalEsrPartial,
        fullyIntegrated: totalEsrFully,
      },
    };

    const operational = {
      schemes: opSchemesList.length,
      villages: opVillagesList.length,
      esr: opEsrsList.length,
    };

    const diffCounts = {
      schemes: diffSchemes.length,
      villages: diffVillages.length,
      esr: diffEsrs.length,
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
      diffCounts,
      alertMatrix: {
        lpcd: metricsResult.lpcd,
        pressure: metricsResult.pressure,
        chlorine: metricsResult.chlorine,
      },
      allAlerts: metricsResult.allAlerts,
      totalDispatchedCount: metricsResult.totalDispatchedCount,
      details: {
        projectScopeSchemes: projectScopeSchemesList,
        projectScopeVillages: projectScopeVillagesList,
        projectScopeEsr: projectScopeEsrList,
        iotSchemesTotal: iotSchemesTotalList,
        iotSchemesFully: iotSchemesFullyList,
        iotVillagesTotal: iotVillagesTotalList,
        iotVillagesFully: iotVillagesFullyList,
        iotEsrTotal: iotEsrTotalList,
        iotEsrFully: iotEsrFullyList,
        operationalSchemes: opSchemesList,
        operationalVillages: opVillagesList,
        operationalEsr: opEsrsList,
        diffSchemes,
        diffVillages,
        diffEsrs,
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
