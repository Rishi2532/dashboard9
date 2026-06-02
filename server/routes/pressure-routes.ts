import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { ZodError } from "zod";
import { insertPressureDataSchema, updatePressureDataSchema, appState, schemeStatuses } from "@shared/schema";
import { getDB } from "../db";
import { eq, sql, and } from "drizzle-orm";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import pg from 'pg';
import { getFilteredSchemeIds } from "./filter-utils";
import { runDailyAlertsJob } from '../cron/daily-alerts';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Middleware to require admin rights
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Get pressure filter options
router.get("/filters", async (req, res) => {
  try {
    const { region, circle, division, subDivision, subdivision, block, agencyType } = req.query;

    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    // Handle both camelCase and lowercase subdivision param
    const subDivParam = (subDivision || subdivision) as string | undefined;
    if (subDivParam) filter.subDivision = subDivParam;
    if (block) filter.block = block as string;
    if (agencyType) filter.agencyType = agencyType as string;

    const filterOptions = await storage.getPressureFilterOptions(filter);
    res.json(filterOptions);
  } catch (error) {
    console.error("Error getting pressure filter options:", error);
    res.status(500).json({ error: "Failed to get pressure filter options" });
  }
});

// Get historical pressure data with date range filters
router.get("/historical", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme_id, village_name, esr_name } = req.query;

    const filter = {
      startDate: (startDate as string) || "2000-01-01",
      endDate: (endDate as string) || "2100-12-31",
      region: region as string | undefined,
      scheme_id: scheme_id as string | undefined,
      village_name: village_name as string | undefined,
      esr_name: esr_name as string | undefined,
      agencyType: req.query.agencyType as string | undefined,
    };

    console.log("Historical pressure data request:", filter);

    const historicalData = await storage.getHistoricalPressureData(filter);

    console.log(`Returning ${historicalData.length} historical pressure records`);
    res.json(historicalData);
  } catch (error) {
    console.error("Error getting historical pressure data:", error);
    res.status(500).json({ error: "Failed to get historical pressure data" });
  }
});

// Get all pressure data with optional filters
router.get("/", async (req, res) => {
  try {
    const { region, circle, division, subdivision, block, pressureRange, minPressure, maxPressure, fullyCompleted, filterType, agencyType } = req.query;

    console.log("Pressure API Request Filters:", {
      region,
      circle,
      division,
      subdivision,
      block,
      pressureRange,
      minPressure,
      maxPressure,
      fullyCompleted,
      filterType
    });

    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    if (subdivision) filter.subDivision = subdivision as string;
    if (block) filter.block = block as string;
    if (agencyType) filter.agencyType = agencyType as string;
    if (pressureRange) filter.pressureRange = pressureRange as 'below_0.2' | 'between_0.2_0.7' | 'above_0.7' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
    if (minPressure) filter.minPressure = parseFloat(minPressure as string);
    if (maxPressure) filter.maxPressure = parseFloat(maxPressure as string);

    // Combine filters for specialized water supply logic
    const { uiSchemeFilter, waterSupplyStatus } = req.query;
    const activeFilter = (uiSchemeFilter || filterType) && waterSupplyStatus && waterSupplyStatus !== "All" && (uiSchemeFilter === "commissioned" || uiSchemeFilter === "fully_completed" || filterType === "commissioned" || filterType === "fully_completed")
      ? `${uiSchemeFilter || filterType}_${(waterSupplyStatus as string).toLowerCase()}`
      : (uiSchemeFilter || filterType) as string;

    // Apply scheme status filters
    const db = await getDB();
    const schemeIds = await getFilteredSchemeIds(db, activeFilter, fullyCompleted as string, agencyType as string);
    if (schemeIds) {
      filter.schemeIds = schemeIds;
    }

    console.log("Applied pressure filter object:", { ...filter, schemeIds: filter.schemeIds ? `[${filter.schemeIds.length} IDs]` : undefined });

    const pressureData = await storage.getAllPressureData(filter);
    console.log(`Returning ${pressureData.length} pressure records after filtering`);

    // For debugging - log a sample of the first few data points
    if (pressureData.length > 0) {
      const sampleData = pressureData.slice(0, Math.min(3, pressureData.length)).map(item => ({
        scheme_id: item.scheme_id,
        region: item.region,
        village_name: item.village_name,
        esr_name: item.esr_name,
        pressure_value_7: item.pressure_value_7
      }));
      console.log("Sample pressure data:", sampleData);
    }

    res.json(pressureData);
  } catch (error) {
    console.error("Error getting pressure data:", error);
    res.status(500).json({ error: "Failed to get pressure data" });
  }
});

// Get dashboard statistics for pressure data
router.get("/dashboard-stats", async (req, res) => {
  try {
    const { region, circle, division, subdivision, block, fullyCompleted, filterType, agencyType, uiSchemeFilter, waterSupplyStatus: queryWaterSupplyStatus } = req.query;

    // Combine filters for specialized water supply logic
    const activeFilter = (uiSchemeFilter || filterType) && queryWaterSupplyStatus && queryWaterSupplyStatus !== "All" && (uiSchemeFilter === "commissioned" || uiSchemeFilter === "fully_completed" || filterType === "commissioned" || filterType === "fully_completed")
      ? `${uiSchemeFilter || filterType}_${(queryWaterSupplyStatus as string).toLowerCase()}`
      : (uiSchemeFilter || filterType) as string;

    const db = await getDB();
    const schemeIdsForStats = await getFilteredSchemeIds(db, activeFilter, fullyCompleted as string, agencyType as string);

    // Build filter object with all geographic parameters
    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    if (subdivision) filter.subdivision = subdivision as string;
    if (block) filter.block = block as string;
    if (agencyType) filter.agencyType = agencyType as string;

    const stats = await storage.getPressureDashboardStats(filter, schemeIdsForStats);

    // Get last import statistics from app_state
    try {
      const db = await getDB();
      const lastImportResult = await db
        .select()
        .from(appState)
        .where(eq(appState.key, "last_pressure_import"));

      if (lastImportResult.length > 0) {
        const lastImport = lastImportResult[0].value as any;
        // Add last import statistics to the response
        res.json({
          ...stats,
          lastImport: {
            inserted: lastImport.inserted || 0,
            updated: lastImport.updated || 0,
            totalProcessed: lastImport.totalProcessed || 0,
            timestamp: lastImport.timestamp,
            errors: lastImport.errors || 0
          }
        });
      } else {
        // No import statistics found, return just the dashboard stats
        res.json(stats);
      }
    } catch (appStateError) {
      console.error("Error fetching last import stats:", appStateError);
      // Still return the main stats even if we couldn't get the import stats
      res.json(stats);
    }
  } catch (error) {
    console.error("Error getting pressure dashboard stats:", error);
    res.status(500).json({ error: "Failed to get pressure dashboard statistics" });
  }
});

// Get pressure sensors with no water (cross-referenced with water consumption)
router.get("/no-water-sensors", async (req, res) => {
  try {
    const { region, agencyType } = req.query;
    console.log("Fetching pressure sensors with no water for region:", region, "agencyType:", agencyType);

    const result = await storage.getPressureSensorsWithNoWater(region as string | undefined, agencyType as string | undefined);

    res.json({
      success: true,
      data: result,
      message: `Found ${result.totalNoWaterSensors} pressure sensors with no water`
    });
  } catch (error) {
    console.error("Error getting pressure sensors with no water:", error);
    res.status(500).json({
      error: "Failed to get pressure sensors with no water",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get pressure sensors with water (cross-referenced with water consumption)
router.get("/with-water-sensors", async (req, res) => {
  try {
    const { region, agencyType } = req.query;
    console.log("Fetching pressure sensors with water for region:", region, "agencyType:", agencyType);

    const result = await storage.getPressureSensorsWithWater(region as string | undefined, agencyType as string | undefined);

    res.json({
      success: true,
      data: result,
      message: `Found ${result.totalWithWaterSensors} pressure sensors with water`
    });
  } catch (error) {
    console.error("Error getting pressure sensors with water:", error);
    res.status(500).json({
      error: "Failed to get pressure sensors with water",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get regional pressure sensor statistics
router.get("/regional-stats", async (req, res) => {
  try {
    const { fullyCompleted, filterType, agencyType } = req.query;
    console.log("Fetching regional pressure sensor statistics", { fullyCompleted, filterType, agencyType });

    const db = await getDB();

    let schemeIdFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // No matches found by filter, return empty stats immediately
        // But we need to return valid structure with empty counts for all regions? 
        // Or just return empty array?
        // The current logic queries distinct regions FIRST with the filter.
        // If we use 'AND scheme_id IN (NULL)' effectively (or impossible ID), we get no regions.
        schemeIdFilter = "AND cs.scheme_id = 'NO_MATCHES_PLACEHOLDER'";
      } else {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND cs.scheme_id IN (${ids})`;
      }
    }

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Get all unique regions from scheme_status starting point
      const regionsResult = await client.query(`
        SELECT DISTINCT region FROM scheme_status ss WHERE region IS NOT NULL ${schemeIdFilter.replace(/cs\.scheme_id/g, 'ss.scheme_id')} ORDER BY region
      `);
      const regions = regionsResult.rows.map((row: any) => row.region);
      console.log(`Found ${regions.length} regions`);

      const regionalStats = await Promise.all(
        regions.map(async (region: string) => {
          const statsResult = await client.query(`
            SELECT 
              COUNT(DISTINCT ss.scheme_id) as total_schemes,
              COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' THEN cs.id END) as total_connected,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' THEN cs.id END) as total_online,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Offline' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0) THEN cs.id END) as offline_with_no_water,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Offline' AND wc.water_value_day7 > 0 THEN cs.id END) as offline_with_water,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Offline' THEN cs.id END) as total_offline,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND wc.water_value_day7 > 0 THEN cs.id END) as online_with_water,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0) THEN cs.id END) as online_without_water,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND wc.water_value_day7 > 0 AND pd.pressure_value_7 BETWEEN 0.2 AND 0.7 THEN cs.id END) as online_with_water_pressure_optimal,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND wc.water_value_day7 > 0 AND pd.pressure_value_7 > 0.7 THEN cs.id END) as online_with_water_pressure_above,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND wc.water_value_day7 > 0 AND pd.pressure_value_7 < 0.2 THEN cs.id END) as online_with_water_pressure_below,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0) AND pd.pressure_value_7 BETWEEN 0.2 AND 0.7 THEN cs.id END) as online_without_water_pressure_optimal,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0) AND pd.pressure_value_7 > 0.7 THEN cs.id END) as online_without_water_pressure_above,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Online' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0) AND pd.pressure_value_7 < 0.2 THEN cs.id END) as online_without_water_pressure_below,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Offline' AND CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '7 days' THEN cs.id END) as offline_since_7days,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Offline' AND CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '30 days' THEN cs.id END) as offline_since_30days,
              COUNT(DISTINCT CASE WHEN cs.pressure_status = 'Offline' AND CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '3 days' THEN cs.id END) as offline_since_3days
            FROM scheme_status ss
            LEFT JOIN communication_status cs ON (ss.scheme_id = cs.scheme_id AND cs.pressure_connected = 'Connected')
            LEFT JOIN water_consumption wc ON (cs.scheme_id = wc.scheme_id AND cs.village_name = wc.village_name)
            LEFT JOIN pressure_data pd ON (cs.scheme_id = pd.scheme_id AND cs.village_name = pd.village_name AND cs.esr_name = pd.esr_name)
            WHERE ss.region = $1 ${schemeIdFilter.replace(/cs\.scheme_id/g, 'ss.scheme_id')}
          `, [region]);

          const row = statsResult.rows[0] || {};
          const onlineWithWater = Number(row.online_with_water) || 0;
          const sumRanges = (Number(row.online_with_water_pressure_optimal) || 0) + (Number(row.online_with_water_pressure_above) || 0) + (Number(row.online_with_water_pressure_below) || 0);

          return {
            region,
            totalConnected: Number(row.total_connected) || 0,
            totalOnline: Number(row.total_online) || 0,
            onlineWithWater,
            onlineWithWaterPressureOptimal: Number(row.online_with_water_pressure_optimal) || 0,
            onlineWithWaterPressureAbove: Number(row.online_with_water_pressure_above) || 0,
            onlineWithWaterPressureBelow: Number(row.online_with_water_pressure_below) || 0,
            onlineWithWaterNoPressureData: Math.max(onlineWithWater - sumRanges, 0),
            onlineWithoutWater: Number(row.online_without_water) || 0,
            onlineWithoutWaterPressureOptimal: Number(row.online_without_water_pressure_optimal) || 0,
            onlineWithoutWaterPressureAbove: Number(row.online_without_water_pressure_above) || 0,
            onlineWithoutWaterPressureBelow: Number(row.online_without_water_pressure_below) || 0,
            totalOffline: Number(row.total_offline) || 0,
            offlineWithNoWater: Number(row.offline_with_no_water) || 0,
            offlineWithWater: Number(row.offline_with_water) || 0,
            offlineSince7Days: Number(row.offline_since_7days) || 0,
            offlineSince30Days: Number(row.offline_since_30days) || 0,
            offlineSince3Days: Number(row.offline_since_3days) || 0,
          };
        })
      );

      res.json(regionalStats);
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error getting regional pressure sensor statistics:", error);
    res.status(500).json({
      error: "Failed to get regional pressure sensor statistics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get pressure division-wise summary 
router.get("/division-wise-summary", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType, agencyType } = req.query;
    console.log(`Fetching pressure division-wise summary for region: ${region || 'all'}`, { fullyCompleted, filterType, agencyType });

    const db = await getDB();

    let schemeIdFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Return empty result immediately
        return res.json({
          success: true,
          data: [],
          region: region || 'All Regions'
        });
      }
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND scheme_id IN (${ids})`;
    }

    const result = await db.execute(sql`
      SELECT 
        ss.region,
        ss.division,
        COUNT(DISTINCT ss.scheme_id) as total_schemes,
        COUNT(DISTINCT CASE 
          WHEN pd.pressure_value_7::numeric > 0 AND pd.pressure_value_7::numeric < 0.2 
          THEN pd.scheme_id || '-' || pd.village_name || '-' || pd.esr_name 
        END) as below_0_2,
        COUNT(DISTINCT CASE 
          WHEN pd.pressure_value_7::numeric >= 0.2 AND pd.pressure_value_7::numeric <= 0.7 
          THEN pd.scheme_id || '-' || pd.village_name || '-' || pd.esr_name 
        END) as optimal,
        COUNT(DISTINCT CASE 
          WHEN pd.pressure_value_7::numeric > 0.7 
          THEN pd.scheme_id || '-' || pd.village_name || '-' || pd.esr_name 
        END) as above_0_7
      FROM scheme_status ss
      LEFT JOIN pressure_data pd ON ss.scheme_id = pd.scheme_id
      WHERE 1=1
      ${region && region !== 'All Regions' ? sql`AND LOWER(ss.region) = LOWER(${region})` : sql``}
      ${sql.raw(schemeIdFilter.replace(/scheme_id/g, 'ss.scheme_id'))}
      GROUP BY ss.region, ss.division
      ORDER BY ss.region, ss.division
    `);

    const divisionSummary = result.rows.map((row: any) => ({
      region: row.region || "",
      division: row.division || "Unknown",
      totalSensors: parseInt(row.total_schemes) || 0,
      sensorsBelow02: parseInt(row.below_0_2) || 0,
      sensorsOptimal: parseInt(row.optimal) || 0,
      sensorsAbove07: parseInt(row.above_0_7) || 0,
    }));

    res.json({
      success: true,
      data: divisionSummary,
      region: region || 'All Regions'
    });
  } catch (error) {
    console.error("Error getting pressure division-wise summary:", error);
    res.status(500).json({
      error: "Failed to get pressure division-wise summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get pressure sensors by division and metric
router.get("/division-sensors", async (req, res) => {
  try {
    const { region, division, metric, filterType, fullyCompleted, agencyType } = req.query;

    if (!division) {
      return res.status(400).json({
        error: "Division parameter is required"
      });
    }

    console.log(`Fetching pressure sensors for division: ${division}, metric: ${metric}, region: ${region || 'all'}, agencyType: ${agencyType || 'ALL'}`);

    const db = await getDB();

    let metricCondition;
    switch (metric) {
      case 'below02':
        metricCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7::numeric > 0 AND pd.pressure_value_7::numeric < 0.2`;
        break;
      case 'optimal':
        metricCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7::numeric >= 0.2 AND pd.pressure_value_7::numeric <= 0.7`;
        break;
      case 'above07':
        metricCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7::numeric > 0.7`;
        break;
      default:
        metricCondition = sql``;
    }

    const regionCondition = region && region !== 'All Regions'
      ? sql`AND LOWER(pd.region) = LOWER(${region})`
      : sql``;


    // Get filtered scheme IDs
    const filteredSchemeIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
    let schemeIdCondition = sql``;
    if (filteredSchemeIds) {
      if (filteredSchemeIds.length === 1 && filteredSchemeIds[0] === 'NO_MATCHES') {
        schemeIdCondition = sql`AND 1=0`;
      } else {
        const ids = filteredSchemeIds;
        const inClause = ids.map((id: any) => `'${id}'`).join(',');
        schemeIdCondition = sql.raw(`AND pd.scheme_id IN (${inClause})`);
      }
    }
    const result = await db.execute(sql`
      SELECT 
        pd.region,
        pd.circle,
        pd.division,
        pd.sub_division,
        pd.block,
        pd.scheme_id,
        pd.scheme_name,
        pd.village_name,
        pd.esr_name,
        pd.pressure_value_7 as latest_pressure_value,
        pd.pressure_date_day_7 as latest_pressure_date,
        pd.dashboard_url
      FROM pressure_data pd
      WHERE LOWER(pd.division) = LOWER(${division})
      ${regionCondition}
      ${schemeIdCondition}
      ${metricCondition}
      ORDER BY pd.region, pd.division, pd.village_name
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      division,
      metric,
      region: region || 'All Regions'
    });
  } catch (error) {
    console.error("Error getting pressure sensors by division:", error);
    res.status(500).json({
      error: "Failed to get pressure sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export pressure sensors by division to Excel
router.get("/division-sensors-export", async (req, res) => {
  try {
    const { region, division, metric, filterType, fullyCompleted, agencyType } = req.query;

    if (!division) {
      return res.status(400).json({
        error: "Division parameter is required"
      });
    }

    console.log(`Exporting pressure sensors for division: ${division}, metric: ${metric}, region: ${region || 'all'}, agencyType: ${agencyType || 'ALL'}`);

    const db = await getDB();

    let metricCondition;
    switch (metric) {
      case 'below02':
        metricCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7::numeric > 0 AND pd.pressure_value_7::numeric < 0.2`;
        break;
      case 'optimal':
        metricCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7::numeric >= 0.2 AND pd.pressure_value_7::numeric <= 0.7`;
        break;
      case 'above07':
        metricCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7::numeric > 0.7`;
        break;
      default:
        metricCondition = sql``;
    }

    const regionCondition = region && region !== 'All Regions'
      ? sql`AND LOWER(pd.region) = LOWER(${region})`
      : sql``;


    // Get filtered scheme IDs
    const filteredSchemeIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
    let schemeIdCondition = sql``;
    if (filteredSchemeIds) {
      if (filteredSchemeIds.length === 1 && filteredSchemeIds[0] === 'NO_MATCHES') {
        schemeIdCondition = sql`AND 1=0`;
      } else {
        const ids = filteredSchemeIds;
        const inClause = ids.map((id: any) => `'${id}'`).join(',');
        schemeIdCondition = sql.raw(`AND pd.scheme_id IN (${inClause})`);
      }
    }
    const result = await db.execute(sql`
      SELECT 
        pd.region,
        pd.circle,
        pd.division,
        pd.sub_division,
        pd.block,
        pd.scheme_id,
        pd.scheme_name,
        pd.village_name,
        pd.esr_name,
        pd.pressure_value_7,
        pd.pressure_date_day_7,
        pd.dashboard_url
      FROM pressure_data pd
      WHERE LOWER(pd.division) = LOWER(${division})
      ${regionCondition}
      ${schemeIdCondition}
      ${metricCondition}
      ORDER BY pd.region, pd.division, pd.village_name
    `);

    const data = (result.rows || []).map((row: any) => ({
      Region: row.region,
      Circle: row.circle,
      Division: row.division,
      'Sub Division': row.sub_division,
      Block: row.block,
      'Scheme ID': row.scheme_id,
      'Scheme Name': row.scheme_name,
      Village: row.village_name,
      'ESR Name': row.esr_name,
      'Pressure Value (bar)': row.pressure_value_7 !== null ? Number(row.pressure_value_7).toFixed(2) : 'N/A',
      'Pressure Date': row.pressure_date_day_7,
      'Dashboard URL': row.dashboard_url || 'N/A'
    }));

    // ExcelJS is already imported at top of file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pressure Division Sensors');

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: key.length + 10
      }));
      worksheet.addRows(data);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEA580C' }
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pressure_division_${division}_${metric || 'all'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting pressure division sensors:", error);
    res.status(500).json({
      error: "Failed to export pressure sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get day-wise breakdown for pressure sensors
router.get("/day-wise-breakdown", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType, agencyType } = req.query;
    console.log(`Fetching pressure day-wise breakdown for region: ${region || 'all'}`, { fullyCompleted, filterType, agencyType });

    const db = await getDB();

    let fullyCompletedSchemeIds: Set<string> | undefined;

    // Get filtered scheme IDs if filter is enabled
    // Note: getPressureDayWiseBreakdown currently accepts a Set of IDs or undefined.
    // We reuse getFilteredSchemeIds but converting result to Set.
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Return empty result immediately
        return res.json({
          success: true,
          data: [],
          region: region || 'all'
        });
      }
      fullyCompletedSchemeIds = new Set(filteredIds);
    }

    const breakdown = await storage.getPressureDayWiseBreakdown(
      region as string | undefined,
      fullyCompletedSchemeIds
    );

    res.json({
      success: true,
      data: breakdown,
      region: region || 'all'
    });
  } catch (error) {
    console.error("Error getting pressure day-wise breakdown:", error);
    res.status(500).json({
      error: "Failed to get pressure day-wise breakdown",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get sensors by day-wise criteria for pressure
router.get(["/day-wise-sensors/:metric/:days", "/day-wise-sensors"], async (req, res) => {
  try {
    let { metric, days } = req.params;
    if (!metric) metric = req.query.metric as string;
    if (!days) days = req.query.days as string;
    const { region, fullyCompleted, filterType, agencyType } = req.query;

    console.log(`Fetching pressure sensors for metric: ${metric}, days: ${days}, region: ${region || 'all'}, agencyType: ${agencyType || 'ALL'}`, { fullyCompleted, filterType });

    if (!['offline', 'below_0_2', 'above_0_7', 'optimal_0_2_0_7'].includes(metric)) {
      return res.status(400).json({
        error: "Invalid metric. Must be 'offline', 'below_0_2', 'above_0_7', or 'optimal_0_2_0_7'"
      });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: "Invalid days. Must be a number between 1 and 30"
      });
    }

    const db = await getDB();

    let fullyCompletedSchemeIds: Set<string> | undefined;
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Return empty result
        return res.json({
          success: true,
          data: [],
          count: 0,
          metric,
          days: daysNum,
          region: region || 'all'
        });
      }
      fullyCompletedSchemeIds = new Set(filteredIds);
    }

    const regionFilter = region && region !== 'All Regions'
      ? sql`AND cs.region = ${region}`
      : sql``;

    const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
      ? sql.raw(`AND cs.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
      : sql``;

    const regionName = region === 'All Regions' ? undefined : (region as string);

    // Use the unified storage method which handles gap detection, deduplication, and offline logic consistent with the chart
    const sensors = await storage.getPressureSensorsByDayWiseCriteria(
      metric as "offline" | "below_0_2" | "above_0_7" | "optimal_0_2_0_7",
      daysNum,
      regionName,
      fullyCompletedSchemeIds
    );

    // Enrichment with dashboard_url from pressure_history removed as per user request (now fetched from pressure_data via storage)

    res.json({
      success: true,
      data: sensors.map((row: any) => ({
        ...row,
        // Ensure numeric values for frontend
        latest_pressure_value: row.latest_pressure_value !== null ? Number(row.latest_pressure_value) : null,
      })),
      count: sensors.length,
      metric,
      days: daysNum,
      region: region || 'all'
    });
  } catch (error) {
    console.error("Error getting pressure sensors by day-wise criteria:", error);
    res.status(500).json({
      error: "Failed to get pressure sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export pressure sensors by day-wise criteria to Excel
router.get(["/day-wise-sensors-export/:metric/:days", "/day-wise-sensors-export"], async (req, res) => {
  try {
    let { metric, days } = req.params;
    if (!metric) metric = req.query.metric as string;
    if (!days) days = req.query.days as string;
    const { region, fullyCompleted, filterType, agencyType } = req.query;

    console.log(`Exporting pressure sensors for metric: ${metric}, days: ${days}, region: ${region || 'all'}`, { fullyCompleted, filterType, agencyType });

    if (!['offline', 'below_0_2', 'above_0_7', 'optimal_0_2_0_7'].includes(metric)) {
      return res.status(400).json({
        error: "Invalid metric. Must be 'offline', 'below_0_2', 'above_0_7', or 'optimal_0_2_0_7'"
      });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: "Invalid days. Must be a number between 1 and 30"
      });
    }

    const db = await getDB();

    let fullyCompletedSchemeIds: Set<string> | undefined;
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Return empty data later
        fullyCompletedSchemeIds = new Set(['NO_MATCHES']);
      } else {
        fullyCompletedSchemeIds = new Set(filteredIds);
      }
    }

    const regionFilter = region && region !== 'All Regions'
      ? sql`AND cs.region = ${region}`
      : sql``;

    const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
      ? sql.raw(`AND cs.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
      : sql``;

    let data: any[] = [];

    const regionName = region === 'All Regions' ? undefined : (region as string);
    const sensors = await storage.getPressureSensorsByDayWiseCriteria(
      metric as "offline" | "below_0_2" | "above_0_7" | "optimal_0_2_0_7",
      daysNum,
      regionName,
      fullyCompletedSchemeIds
    );

    data = sensors.map((row: any) => ({
      Region: row.region,
      Circle: row.circle,
      Division: row.division,
      'Sub Division': row.sub_division,
      Block: row.block,
      'Scheme ID': row.scheme_id,
      'Scheme Name': row.scheme_name,
      Village: row.village_name,
      'ESR Name': row.esr_name,
      'Connected': row.pressure_connected,
      'Status': row.pressure_status,
      'Last Seen': row.last_seen,
      'Consecutive Days': Number(row.consecutive_days) || 0,
      'Pressure Value (bar)': row.latest_pressure_value !== null ? Number(row.latest_pressure_value).toFixed(2) : 'N/A',
      'Pressure Date': row.latest_pressure_date,
      'Dashboard Link': row.dashboard_url || 'N/A',
    }));

    // ExcelJS is already imported at top of file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pressure Sensors');

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: key.length + 10
      }));
      worksheet.addRows(data);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEA580C' }
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pressure_${metric}_${daysNum}days_${region || 'all'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting pressure sensors:", error);
    res.status(500).json({
      error: "Failed to export pressure sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get detailed list of pressure sensors by statistic type
router.get("/details/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType, agencyType } = req.query;

    console.log(`Fetching detailed ${statisticType} pressure sensors for region: ${region}`, { fullyCompleted, filterType, agencyType });

    const db = await getDB();

    let fullyCompletedSchemeIds: Set<string> | undefined;
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        return res.json({
          success: true,
          data: [],
          statisticType,
          region: region || 'all'
        });
      }
      fullyCompletedSchemeIds = new Set(filteredIds);
    }

    const filters = [];

    if (region) {
      filters.push(sql`cs.region = ${region}`);
    }

    if (fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0) {
      const ids = Array.from(fullyCompletedSchemeIds);
      const inClause = ids.map(id => `'${id}'`).join(',');
      filters.push(sql.raw(`cs.scheme_id IN (${inClause})`));
    }

    filters.push(sql`cs.pressure_connected = 'Connected'`);

    switch (statisticType) {
      case 'connected':
        break;
      case 'online':
        filters.push(sql`cs.pressure_status = 'Online'`);
        break;
      case 'online-with-water':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'online-without-water':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        break;
      case 'offline':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        break;
      case 'offline-with-no-water':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        break;
      case 'offline-with-water':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'online-with-water-pressure-optimal':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 >= 0.2`);
        filters.push(sql`pd.pressure_value_7 <= 0.7`);
        break;
      case 'online-with-water-pressure-above':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 > 0.7`);
        break;
      case 'online-with-water-pressure-below':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 < 0.2`);
        break;
      case 'online-with-water-no-pressure-data':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NULL`);
        break;
      case 'offline-7days':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`cs.pressure_last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '7 days'`);
        break;
      case 'offline-30days':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`cs.pressure_last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '30 days'`);
        break;
      case 'offline-3days':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`cs.pressure_last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '3 days'`);
        break;
      default:
        return res.status(400).json({ error: "Invalid statistic type" });
    }

    const query = sql`
      SELECT DISTINCT ON (TRIM(UPPER(COALESCE(cs.scheme_id, ''))), TRIM(UPPER(COALESCE(cs.village_name, ''))), TRIM(UPPER(COALESCE(cs.esr_name, '')))) 
        cs.region,
        cs.circle,
        cs.division,
        cs.sub_division,
        cs.block,
        cs.scheme_id,
        cs.scheme_name,
        cs.village_name,
        cs.esr_name,
        cs.pressure_connected,
        cs.pressure_status,
        wc.water_value_day1,
        wc.water_date_day1,
        wc.water_value_day2,
        wc.water_date_day2,
        wc.water_value_day3,
        wc.water_date_day3,
        wc.water_value_day4,
        wc.water_date_day4,
        wc.water_value_day5,
        wc.water_date_day5,
        wc.water_value_day6,
        wc.water_date_day6,
        wc.water_value_day7,
        wc.water_date_day7,
        pd.pressure_value_1,
        pd.pressure_date_day_1,
        pd.pressure_value_2,
        pd.pressure_date_day_2,
        pd.pressure_value_3,
        pd.pressure_date_day_3,
        pd.pressure_value_4,
        pd.pressure_date_day_4,
        pd.pressure_value_5,
        pd.pressure_date_day_5,
        pd.pressure_value_6,
        pd.pressure_date_day_6,
        pd.pressure_value_7,
        pd.pressure_date_day_7,
        (SELECT description FROM helpdesk_tickets ht 
         WHERE ht.scheme_id = cs.scheme_id 
         AND ht.village_name = cs.village_name 
         AND ht.esr_name = cs.esr_name 
         AND ht.level = 'ESR' 
         AND ht.status IN ('Open', 'In-Progress') 
         ORDER BY ht.created_at DESC LIMIT 1) as remark,
        pd.dashboard_url
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (
        cs.scheme_id = wc.scheme_id AND
        cs.village_name = wc.village_name
      )
      LEFT JOIN pressure_data pd ON (
        cs.scheme_id = pd.scheme_id AND
        cs.village_name = pd.village_name AND
        cs.esr_name = pd.esr_name
      )
      WHERE ${sql.join(filters, sql` AND `)}
      ORDER BY TRIM(UPPER(COALESCE(cs.scheme_id, ''))), TRIM(UPPER(COALESCE(cs.village_name, ''))), TRIM(UPPER(COALESCE(cs.esr_name, ''))), cs.uploaded_at DESC
    `;

    const result = await db.execute(query);

    res.json({
      success: true,
      type: statisticType,
      region: region || 'all',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching pressure sensor details:", error);
    res.status(500).json({
      error: "Failed to fetch pressure sensor details",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export pressure sensor details to Excel
// Get detailed list of pressure sensors by statistic type (Export)
// Supports both route formats for flexibility
router.get(["/details/export/:statisticType", "/details-export/:statisticType"], async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType, agencyType } = req.query;

    console.log(`Exporting ${statisticType} pressure sensors for region: ${region}`);

    const db = await getDB();


    let fullyCompletedSchemeIds: Set<string> | undefined;
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Return early with empty excel if no matches
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pressure Sensors');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=pressure_${statisticType}_${region || 'all'}.xlsx`);
        await workbook.xlsx.write(res);
        return res.end();
      }
      fullyCompletedSchemeIds = new Set(filteredIds);
    }

    const filters = [];

    if (region) {
      filters.push(sql`cs.region = ${region}`);
    }

    if (fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0) {
      const ids = Array.from(fullyCompletedSchemeIds);
      const inClause = ids.map(id => `'${id}'`).join(',');
      filters.push(sql.raw(`cs.scheme_id IN (${inClause})`));
    }

    filters.push(sql`cs.pressure_connected = 'Connected'`);

    switch (statisticType) {
      case 'connected':
        break;
      case 'online':
        filters.push(sql`cs.pressure_status = 'Online'`);
        break;
      case 'online-with-water':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'online-without-water':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        break;
      case 'offline':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        break;
      case 'offline-with-no-water':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        break;
      case 'offline-with-water':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'online-with-water-pressure-optimal':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 >= 0.2`);
        filters.push(sql`pd.pressure_value_7 <= 0.7`);
        break;
      case 'online-with-water-pressure-above':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 > 0.7`);
        break;
      case 'online-with-water-pressure-below':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 < 0.2`);
        break;
      case 'online-without-water-pressure-optimal':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 >= 0.2`);
        filters.push(sql`pd.pressure_value_7 <= 0.7`);
        break;
      case 'online-without-water-pressure-above':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 > 0.7`);
        break;
      case 'online-without-water-pressure-below':
        filters.push(sql`cs.pressure_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)`);
        filters.push(sql`pd.pressure_value_7 IS NOT NULL`);
        filters.push(sql`pd.pressure_value_7 < 0.2`);
        break;
      case 'offline-since-7days':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`cs.pressure_last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '7 days'`);
        break;
      case 'offline-since-30days':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`cs.pressure_last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '30 days'`);
        break;
      case 'offline-since-3days':
        filters.push(sql`cs.pressure_status = 'Offline'`);
        filters.push(sql`cs.pressure_last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.pressure_last_seen >= INTERVAL '3 days'`);
        break;
      default:
        return res.status(400).json({ error: "Invalid statistic type" });
    }

    const query = sql`
      SELECT DISTINCT ON (TRIM(UPPER(COALESCE(cs.scheme_id, ''))), TRIM(UPPER(COALESCE(cs.village_name, ''))), TRIM(UPPER(COALESCE(cs.esr_name, '')))) 
        cs.region,
        cs.circle,
        cs.division,
        cs.sub_division,
        cs.block,
        cs.scheme_id,
        cs.scheme_name,
        cs.village_name,
        cs.esr_name,
        cs.pressure_connected,
        cs.pressure_status,
        cs.pressure_last_seen as last_seen,
        wc.water_value_day7,
        pd.pressure_value_7,
        pd.pressure_date_day_7,
        cs.uploaded_at,
        (SELECT description FROM helpdesk_tickets ht 
         WHERE ht.scheme_id = cs.scheme_id 
         AND ht.village_name = cs.village_name 
         AND ht.esr_name = cs.esr_name 
         AND ht.level = 'ESR' 
         AND ht.status IN ('Open', 'In-Progress') 
         ORDER BY ht.created_at DESC LIMIT 1) as remark,
        pd.dashboard_url
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (
        cs.scheme_id = wc.scheme_id AND
        cs.village_name = wc.village_name
      )
      LEFT JOIN pressure_data pd ON (
        cs.scheme_id = pd.scheme_id AND
        cs.village_name = pd.village_name AND
        cs.esr_name = pd.esr_name
      )
      WHERE ${sql.join(filters, sql` AND `)}
      ORDER BY TRIM(UPPER(COALESCE(cs.scheme_id, ''))), TRIM(UPPER(COALESCE(cs.village_name, ''))), TRIM(UPPER(COALESCE(cs.esr_name, ''))), cs.uploaded_at DESC
    `;

    const result = await db.execute(query);

    const data = (result.rows || []).map((row: any) => ({
      Region: row.region,
      Circle: row.circle,
      Division: row.division,
      'Sub Division': row.sub_division,
      Block: row.block,
      'Scheme ID': row.scheme_id,
      'Scheme Name': row.scheme_name,
      Village: row.village_name,
      'ESR Name': row.esr_name,
      'Connected': row.pressure_connected,
      'Status': row.pressure_status,
      'Last Seen': row.last_seen,
      'Water Value': row.water_value_day7,
      'Pressure Value (bar)': row.pressure_value_7 !== null ? Number(row.pressure_value_7).toFixed(2) : 'N/A',
      'Pressure Date': row.pressure_date_day_7,
      'Remark': row.remark,
      'Dashboard URL': row.dashboard_url || 'N/A',
    }));

    // ExcelJS is already imported at top of file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pressure Sensors');

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: key.length + 10
      }));
      worksheet.addRows(data);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEA580C' }
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pressure_${statisticType}_${region || 'all'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting pressure sensor details:", error);
    res.status(500).json({
      error: "Failed to export pressure sensor details",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get overall region comparison data for pressure
router.get("/overall-region-comparison", async (req, res) => {
  try {
    const { fullyCompleted, filterType, agencyType } = req.query;
    console.log("Fetching overall pressure region comparison data", { fullyCompleted, filterType, agencyType });

    const db = await getDB();

    // Get filtered scheme IDs
    let schemeIdFilter = "";
    let communicationStatusSchemeFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        schemeIdFilter = "AND pd.scheme_id = 'NO_MATCHES_PLACEHOLDER'";
        communicationStatusSchemeFilter = "AND cs.scheme_id = 'NO_MATCHES_PLACEHOLDER'";
      } else {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND pd.scheme_id IN (${ids})`;
        communicationStatusSchemeFilter = `AND cs.scheme_id IN (${ids})`;
      }
    }

    const result = await db.execute(sql.raw(`
      WITH regions AS (
        SELECT DISTINCT region 
        FROM communication_status cs
        WHERE region IS NOT NULL 
        AND pressure_connected = 'Connected'
        ${communicationStatusSchemeFilter}
      ),
      pressure_analysis AS (
        SELECT DISTINCT ON (cs.scheme_id, cs.village_name, cs.esr_name)
          cs.region,
          cs.scheme_id,
          cs.village_name,
          cs.esr_name,
          pd.pressure_value_7,
          CASE 
            WHEN pd.pressure_value_7 < 0.2 THEN 'below_0_2'
            WHEN pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7 THEN 'optimal_0_2_0_7'
            WHEN pd.pressure_value_7 > 0.7 THEN 'above_0_7'
            ELSE 'no_data'
          END as pressure_category,
          CASE 
            WHEN pd.pressure_value_1 < 0.2 AND pd.pressure_value_2 < 0.2 AND pd.pressure_value_3 < 0.2 
              AND pd.pressure_value_4 < 0.2 AND pd.pressure_value_5 < 0.2 AND pd.pressure_value_6 < 0.2 
              AND pd.pressure_value_7 < 0.2 THEN 1 ELSE 0 
          END as consistent_below,
          CASE 
            WHEN pd.pressure_value_1 >= 0.2 AND pd.pressure_value_1 <= 0.7 
              AND pd.pressure_value_2 >= 0.2 AND pd.pressure_value_2 <= 0.7
              AND pd.pressure_value_3 >= 0.2 AND pd.pressure_value_3 <= 0.7
              AND pd.pressure_value_4 >= 0.2 AND pd.pressure_value_4 <= 0.7
              AND pd.pressure_value_5 >= 0.2 AND pd.pressure_value_5 <= 0.7
              AND pd.pressure_value_6 >= 0.2 AND pd.pressure_value_6 <= 0.7
              AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7 THEN 1 ELSE 0 
          END as consistent_optimal,
          CASE 
            WHEN pd.pressure_value_1 > 0.7 AND pd.pressure_value_2 > 0.7 AND pd.pressure_value_3 > 0.7 
              AND pd.pressure_value_4 > 0.7 AND pd.pressure_value_5 > 0.7 AND pd.pressure_value_6 > 0.7 
              AND pd.pressure_value_7 > 0.7 THEN 1 ELSE 0 
          END as consistent_above
        FROM communication_status cs
        LEFT JOIN pressure_data pd ON (
          pd.scheme_id = cs.scheme_id AND 
          pd.village_name = cs.village_name AND 
          pd.esr_name = cs.esr_name
        )
        WHERE cs.region IS NOT NULL 
        AND cs.pressure_connected = 'Connected' 
        AND cs.pressure_status <> 'Offline'
        ${communicationStatusSchemeFilter}
        ORDER BY cs.scheme_id, cs.village_name, cs.esr_name, cs.uploaded_at DESC
      ),
      offline_analysis AS (
        SELECT 
          cs.region,
          COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' AND cs.pressure_status = 'Offline' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0) THEN cs.id END) as offline_with_no_water,
          COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' AND cs.pressure_status = 'Offline' AND wc.water_value_day7 > 0 THEN cs.id END) as offline_with_water,
          COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' AND cs.pressure_status = 'Offline' THEN cs.id END) as offline_count
        FROM communication_status cs
        LEFT JOIN water_consumption wc ON (
          cs.scheme_id = wc.scheme_id AND 
          cs.village_name = wc.village_name AND 
          cs.esr_name = wc.esr_name
        )
        WHERE cs.region IS NOT NULL ${communicationStatusSchemeFilter}
        GROUP BY cs.region
      )
      SELECT 
        r.region,
        COALESCE(oa.offline_count, 0) as offline,
        COALESCE(oa.offline_with_no_water, 0) as offline_with_no_water,
        COALESCE(oa.offline_with_water, 0) as offline_with_water,
        COUNT(CASE WHEN pa.pressure_category = 'no_data' THEN 1 END) as online_no_water,
        COUNT(CASE WHEN pa.pressure_category = 'below_0_2' THEN 1 END) as below_0_2,
        COUNT(CASE WHEN pa.pressure_category = 'optimal_0_2_0_7' THEN 1 END) as optimal_0_2_0_7,
        COUNT(CASE WHEN pa.pressure_category = 'above_0_7' THEN 1 END) as above_0_7,
        COUNT(CASE WHEN pa.consistent_below = 1 THEN 1 END) as consistent_below_0_2,
        COUNT(CASE WHEN pa.consistent_optimal = 1 THEN 1 END) as consistent_optimal,
        COUNT(CASE WHEN pa.consistent_above = 1 THEN 1 END) as consistent_above_0_7,
        COALESCE(oa.offline_count, 0) + COUNT(pa.region) as total_count
      FROM regions r
      LEFT JOIN pressure_analysis pa ON r.region = pa.region
      LEFT JOIN offline_analysis oa ON r.region = oa.region
      GROUP BY r.region, oa.offline_count, oa.offline_with_no_water, oa.offline_with_water
      ORDER BY r.region
    `));

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        region: row.region,
        offline: Number(row.offline) || 0,
        offline_with_no_water: Number(row.offline_with_no_water) || 0,
        offline_with_water: Number(row.offline_with_water) || 0,
        online_no_water: Number(row.online_no_water) || 0,
        below_0_2: Number(row.below_0_2) || 0,
        optimal_0_2_0_7: Number(row.optimal_0_2_0_7) || 0,
        above_0_7: Number(row.above_0_7) || 0,
        consistent_below_0_2: Number(row.consistent_below_0_2) || 0,
        consistent_optimal: Number(row.consistent_optimal) || 0,
        consistent_above_0_7: Number(row.consistent_above_0_7) || 0,
      }))
    });
  } catch (error) {
    console.error("Error getting overall pressure region comparison:", error);
    res.status(500).json({
      error: "Failed to get overall pressure region comparison",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get overall region comparison details for pressure
router.get("/overall-region-comparison/details/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, filterType, fullyCompleted, agencyType } = req.query;

    console.log(`Fetching pressure comparison details for category: ${category}, region: ${region}, filter: ${filterType}, agencyType: ${agencyType}`);

    const db = await getDB();

    const regionFilter = region && region !== 'All Regions'
      ? sql`AND pd.region = ${region}`
      : sql``;

    // Get filtered scheme IDs
    let schemeIdFilter = sql``;
    let communicationStatusSchemeFilter = sql``;
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        schemeIdFilter = sql`AND pd.scheme_id = 'NO_MATCHES_PLACEHOLDER'`;
        communicationStatusSchemeFilter = sql`AND cs.scheme_id = 'NO_MATCHES_PLACEHOLDER'`;
      } else {
        const ids = filteredIds.map((id: string) => id); // Drizzle handles array params slightly differently depending on usage, but here for raw sql we might need manual handling or helper
        // construct raw IN clause string because sql`` helper might not handle array dynamically for IN clause easily in all drivers without helper
        const inClause = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = sql.raw(`AND pd.scheme_id IN (${inClause})`);
        communicationStatusSchemeFilter = sql.raw(`AND cs.scheme_id IN (${inClause})`);
      }
    }

    let categoryCondition;
    switch (category) {
      case 'offline':
        categoryCondition = sql`AND cs.pressure_status = 'Offline'`;
        break;
      case 'offline-with-no-water':
        categoryCondition = sql`AND cs.pressure_status = 'Offline' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)`;
        break;
      case 'offline-with-water':
        categoryCondition = sql`AND cs.pressure_status = 'Offline' AND wc.water_value_day7 > 0`;
        break;
      case 'online_no_water':
        categoryCondition = sql`AND cs.pressure_status = 'Online' AND pd.pressure_value_7 IS NULL`;
        break;
      case 'all_sensors':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL`;
        break;
      case 'below_0_2':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 < 0.2`;
        break;
      case 'optimal_0_2_0_7':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7`;
        break;
      case 'above_0_7':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 > 0.7`;
        break;
      case 'consistent_below_0_2':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_1 < 0.2 AND pd.pressure_value_2 < 0.2 AND pd.pressure_value_3 < 0.2 AND pd.pressure_value_4 < 0.2 AND pd.pressure_value_5 < 0.2 AND pd.pressure_value_6 < 0.2 AND pd.pressure_value_7 < 0.2`;
        break;
      case 'consistent_optimal':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_1 >= 0.2 AND pd.pressure_value_1 <= 0.7 AND pd.pressure_value_2 >= 0.2 AND pd.pressure_value_2 <= 0.7 AND pd.pressure_value_3 >= 0.2 AND pd.pressure_value_3 <= 0.7 AND pd.pressure_value_4 >= 0.2 AND pd.pressure_value_4 <= 0.7 AND pd.pressure_value_5 >= 0.2 AND pd.pressure_value_5 <= 0.7 AND pd.pressure_value_6 >= 0.2 AND pd.pressure_value_6 <= 0.7 AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7`;
        break;
      case 'consistent_above_0_7':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_1 > 0.7 AND pd.pressure_value_2 > 0.7 AND pd.pressure_value_3 > 0.7 AND pd.pressure_value_4 > 0.7 AND pd.pressure_value_5 > 0.7 AND pd.pressure_value_6 > 0.7 AND pd.pressure_value_7 > 0.7`;
        break;
      case 'consistent_all':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND (
          (pd.pressure_value_1 < 0.2 AND pd.pressure_value_2 < 0.2 AND pd.pressure_value_3 < 0.2 AND pd.pressure_value_4 < 0.2 AND pd.pressure_value_5 < 0.2 AND pd.pressure_value_6 < 0.2 AND pd.pressure_value_7 < 0.2)
          OR
          (pd.pressure_value_1 >= 0.2 AND pd.pressure_value_1 <= 0.7 AND pd.pressure_value_2 >= 0.2 AND pd.pressure_value_2 <= 0.7 AND pd.pressure_value_3 >= 0.2 AND pd.pressure_value_3 <= 0.7 AND pd.pressure_value_4 >= 0.2 AND pd.pressure_value_4 <= 0.7 AND pd.pressure_value_5 >= 0.2 AND pd.pressure_value_5 <= 0.7 AND pd.pressure_value_6 >= 0.2 AND pd.pressure_value_6 <= 0.7 AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7)
          OR
          (pd.pressure_value_1 > 0.7 AND pd.pressure_value_2 > 0.7 AND pd.pressure_value_3 > 0.7 AND pd.pressure_value_4 > 0.7 AND pd.pressure_value_5 > 0.7 AND pd.pressure_value_6 > 0.7 AND pd.pressure_value_7 > 0.7)
        )`;
        break;
      default:
        return res.status(400).json({ error: "Invalid category" });
    }

    const customRegionFilter = region && region !== 'All Regions'
      ? sql`AND COALESCE(cs.region, pd.region) = ${region}`
      : sql``;

    const query = sql`
      SELECT * FROM (
        SELECT DISTINCT ON (COALESCE(cs.scheme_id, pd.scheme_id), COALESCE(cs.village_name, pd.village_name), COALESCE(cs.esr_name, pd.esr_name))
          COALESCE(cs.region, pd.region) as region,
          COALESCE(cs.circle, pd.circle) as circle,
          COALESCE(cs.division, pd.division) as division,
          COALESCE(cs.sub_division, pd.sub_division) as sub_division,
          COALESCE(cs.block, pd.block) as block,
          COALESCE(cs.scheme_id, pd.scheme_id) as scheme_id,
          COALESCE(cs.scheme_name, pd.scheme_name) as scheme_name,
          COALESCE(cs.village_name, pd.village_name) as village_name,
          COALESCE(cs.esr_name, pd.esr_name) as esr_name,
          pd.pressure_value_7 as pressure_value,
          pd.pressure_date_day_7 as pressure_date,
          cs.pressure_status,
          cs.pressure_last_seen as pressure_last_seen,
          pd.dashboard_url,
          ss.agency_type
        FROM communication_status cs
        FULL OUTER JOIN pressure_data pd ON (cs.scheme_id = pd.scheme_id AND cs.village_name = pd.village_name AND cs.esr_name = pd.esr_name)
        LEFT JOIN water_consumption wc ON (cs.scheme_id = wc.scheme_id AND cs.village_name = wc.village_name AND cs.esr_name = wc.esr_name)
        LEFT JOIN scheme_status ss ON COALESCE(cs.scheme_id, pd.scheme_id) = ss.scheme_id AND COALESCE(cs.block, pd.block) = ss.block
        WHERE COALESCE(cs.pressure_connected, 'Not Connected') = 'Connected'
          ${customRegionFilter}
          ${categoryCondition}
          ${communicationStatusSchemeFilter}
        ORDER BY COALESCE(cs.scheme_id, pd.scheme_id), COALESCE(cs.village_name, pd.village_name), COALESCE(cs.esr_name, pd.esr_name), cs.uploaded_at DESC
      ) as t
      ORDER BY region, village_name
    `;

    const result = await db.execute(query);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      category,
      region: region || 'All Regions'
    });
  } catch (error) {
    console.error("Error fetching pressure comparison details:", error);
    res.status(500).json({
      error: "Failed to fetch pressure comparison details",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export overall region comparison details for pressure to Excel
router.get("/overall-region-comparison/details-export/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, filterType, fullyCompleted, agencyType } = req.query;

    console.log(`Exporting pressure comparison details for category: ${category}, region: ${region}, filter: ${filterType}, agencyType: ${agencyType}`);

    const db = await getDB();

    const regionFilter = region && region !== 'All Regions'
      ? sql`AND pd.region = ${region}`
      : sql``;

    // Get filtered scheme IDs
    let schemeIdFilter = sql``;
    let communicationStatusSchemeFilter = sql``;
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        schemeIdFilter = sql`AND pd.scheme_id = 'NO_MATCHES_PLACEHOLDER'`;
        communicationStatusSchemeFilter = sql`AND cs.scheme_id = 'NO_MATCHES_PLACEHOLDER'`;
      } else {
        const ids = filteredIds.map((id: string) => id);
        const inClause = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = sql.raw(`AND pd.scheme_id IN (${inClause})`);
        communicationStatusSchemeFilter = sql.raw(`AND cs.scheme_id IN (${inClause})`);
      }
    }

    let categoryCondition;
    let queryData: any[] = [];

    switch (category) {
      case 'offline':
        categoryCondition = sql`AND cs.pressure_status = 'Offline'`;
        break;
      case 'offline-with-no-water':
        categoryCondition = sql`AND cs.pressure_status = 'Offline' AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)`;
        break;
      case 'offline-with-water':
        categoryCondition = sql`AND cs.pressure_status = 'Offline' AND wc.water_value_day7 > 0`;
        break;
      case 'online_no_water':
        categoryCondition = sql`AND cs.pressure_status = 'Online' AND pd.pressure_value_7 IS NULL`;
        break;
      case 'all_sensors':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL`;
        break;
      case 'below_0_2':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 < 0.2`;
        break;
      case 'optimal_0_2_0_7':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7`;
        break;
      case 'above_0_7':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 > 0.7`;
        break;
      case 'consistent_below_0_2':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_1 < 0.2 AND pd.pressure_value_2 < 0.2 AND pd.pressure_value_3 < 0.2 AND pd.pressure_value_4 < 0.2 AND pd.pressure_value_5 < 0.2 AND pd.pressure_value_6 < 0.2 AND pd.pressure_value_7 < 0.2`;
        break;
      case 'consistent_optimal':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_1 >= 0.2 AND pd.pressure_value_1 <= 0.7 AND pd.pressure_value_2 >= 0.2 AND pd.pressure_value_2 <= 0.7 AND pd.pressure_value_3 >= 0.2 AND pd.pressure_value_3 <= 0.7 AND pd.pressure_value_4 >= 0.2 AND pd.pressure_value_4 <= 0.7 AND pd.pressure_value_5 >= 0.2 AND pd.pressure_value_5 <= 0.7 AND pd.pressure_value_6 >= 0.2 AND pd.pressure_value_6 <= 0.7 AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7`;
        break;
      case 'consistent_above_0_7':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND pd.pressure_value_1 > 0.7 AND pd.pressure_value_2 > 0.7 AND pd.pressure_value_3 > 0.7 AND pd.pressure_value_4 > 0.7 AND pd.pressure_value_5 > 0.7 AND pd.pressure_value_6 > 0.7 AND pd.pressure_value_7 > 0.7`;
        break;
      case 'consistent_all':
        categoryCondition = sql`AND (cs.pressure_status IS NULL OR cs.pressure_status <> 'Offline') AND (
          (pd.pressure_value_1 < 0.2 AND pd.pressure_value_2 < 0.2 AND pd.pressure_value_3 < 0.2 AND pd.pressure_value_4 < 0.2 AND pd.pressure_value_5 < 0.2 AND pd.pressure_value_6 < 0.2 AND pd.pressure_value_7 < 0.2)
          OR
          (pd.pressure_value_1 >= 0.2 AND pd.pressure_value_1 <= 0.7 AND pd.pressure_value_2 >= 0.2 AND pd.pressure_value_2 <= 0.7 AND pd.pressure_value_3 >= 0.2 AND pd.pressure_value_3 <= 0.7 AND pd.pressure_value_4 >= 0.2 AND pd.pressure_value_4 <= 0.7 AND pd.pressure_value_5 >= 0.2 AND pd.pressure_value_5 <= 0.7 AND pd.pressure_value_6 >= 0.2 AND pd.pressure_value_6 <= 0.7 AND pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7)
          OR
          (pd.pressure_value_1 > 0.7 AND pd.pressure_value_2 > 0.7 AND pd.pressure_value_3 > 0.7 AND pd.pressure_value_4 > 0.7 AND pd.pressure_value_5 > 0.7 AND pd.pressure_value_6 > 0.7 AND pd.pressure_value_7 > 0.7)
        )`;
        break;
      default:
        return res.status(400).json({ error: "Invalid category" });
    }

    const customRegionFilter = region && region !== 'All Regions'
      ? sql`AND COALESCE(cs.region, pd.region) = ${region}`
      : sql``;

    const query = sql`
      SELECT * FROM (
        SELECT DISTINCT ON (COALESCE(cs.scheme_id, pd.scheme_id), COALESCE(cs.village_name, pd.village_name), COALESCE(cs.esr_name, pd.esr_name))
          COALESCE(cs.region, pd.region) as region,
          COALESCE(cs.circle, pd.circle) as circle,
          COALESCE(cs.division, pd.division) as division,
          COALESCE(cs.sub_division, pd.sub_division) as sub_division,
          COALESCE(cs.block, pd.block) as block,
          COALESCE(cs.scheme_id, pd.scheme_id) as scheme_id,
          COALESCE(cs.scheme_name, pd.scheme_name) as scheme_name,
          COALESCE(cs.village_name, pd.village_name) as village_name,
          COALESCE(cs.esr_name, pd.esr_name) as esr_name,
          pd.pressure_value_7 as pressure_value_7,
          pd.pressure_date_day_7 as pressure_date_day_7,
          cs.pressure_status,
          cs.pressure_last_seen as last_seen,
          pd.dashboard_url
        FROM communication_status cs
        FULL OUTER JOIN pressure_data pd ON (cs.scheme_id = pd.scheme_id AND cs.village_name = pd.village_name AND cs.esr_name = pd.esr_name)
        LEFT JOIN water_consumption wc ON (cs.scheme_id = wc.scheme_id AND cs.village_name = wc.village_name AND cs.esr_name = wc.esr_name)
        WHERE COALESCE(cs.pressure_connected, 'Not Connected') = 'Connected'
          ${customRegionFilter}
          ${categoryCondition}
          ${communicationStatusSchemeFilter}
        ORDER BY COALESCE(cs.scheme_id, pd.scheme_id), COALESCE(cs.village_name, pd.village_name), COALESCE(cs.esr_name, pd.esr_name), cs.uploaded_at DESC
      ) as t
      ORDER BY region, village_name
    `;
    const result = await db.execute(query);
    queryData = result.rows;

    const data = queryData.map((row: any) => ({
      Region: row.region,
      Circle: row.circle,
      Division: row.division,
      Agency: row.agency_type,
      'Sub Division': row.sub_division,
      Block: row.block,
      'Scheme ID': row.scheme_id,
      'Scheme Name': row.scheme_name,
      Village: row.village_name,
      'ESR Name': row.esr_name,
      ...(['offline', 'offline-with-no-water', 'offline-with-water'].includes(category)
        ? { 'Status': row.pressure_status, 'Last Seen': row.last_seen }
        : { 'Pressure Value (bar)': row.pressure_value_7 !== null ? Number(row.pressure_value_7).toFixed(2) : 'N/A', 'Pressure Date': row.pressure_date_day_7 }
      ),
      'Dashboard Link': row.dashboard_url || 'N/A',
    }));

    // ExcelJS is already imported at top of file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pressure Comparison');

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: key.length + 10
      }));
      worksheet.addRows(data);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEA580C' }
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pressure_comparison_${category}_${region || 'all'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting pressure comparison details:", error);
    res.status(500).json({
      error: "Failed to export pressure comparison details",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get single pressure record by composite key
router.get("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;

    // URL decode parameters since they might contain spaces or special characters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);

    const pressureData = await storage.getPressureDataByCompositeKey(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );

    if (!pressureData) {
      return res.status(404).json({ error: "Pressure data not found" });
    }

    res.json(pressureData);
  } catch (error) {
    console.error("Error getting pressure data record:", error);
    res.status(500).json({ error: "Failed to get pressure data record" });
  }
});

// Create new pressure data record (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body;

    // Validate data with Zod
    const validatedData = insertPressureDataSchema.parse(data);

    const result = await storage.createPressureData(validatedData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error creating pressure data:", error);
      res.status(500).json({ error: "Failed to create pressure data" });
    }
  }
});

// Update existing pressure data (admin only)
router.put("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const data = req.body;

    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);

    // Validate data with Zod
    const validatedData = updatePressureDataSchema.parse(data);

    const result = await storage.updatePressureData(
      schemeId,
      decodedVillageName,
      decodedEsrName,
      validatedData
    );

    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error updating pressure data:", error);
      res.status(500).json({ error: "Failed to update pressure data" });
    }
  }
});

// Delete pressure data (admin only)
router.delete("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;

    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);

    const success = await storage.deletePressureData(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );

    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Pressure data not found" });
    }
  } catch (error) {
    console.error("Error deleting pressure data:", error);
    res.status(500).json({ error: "Failed to delete pressure data" });
  }
});

// Import pressure data from CSV file (admin only)
router.post("/import/csv", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("CSV Import - File received:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      encoding: req.file.encoding
    });

    // Check if file is empty
    if (req.file.size === 0) {
      return res.status(400).json({ error: "Uploaded file is empty" });
    }

    // Check for CSV mimetype (though not always reliable)
    if (req.file.mimetype !== 'text/csv' &&
      !req.file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({
        error: "Invalid file format",
        details: "Please upload a CSV file with .csv extension"
      });
    }

    // Log a preview of the file content for debugging
    const filePreview = req.file.buffer.toString('utf8').substring(0, 200);
    console.log("CSV content preview:", filePreview);

    // Check if content is likely not CSV by looking for HTML or XML tags
    if (filePreview.includes('<!DOCTYPE') ||
      filePreview.includes('<html') ||
      filePreview.trim().startsWith('<')) {
      return res.status(400).json({
        error: "Invalid file content",
        details: "The file appears to be HTML or XML, not a CSV file",
        preview: filePreview.substring(0, 100)
      });
    }

    // Check if the user wants to clear existing data before import
    const clearExisting = req.body.clearExisting === 'true';

    // Process CSV file with improved error handling
    try {
      // Pass the clearExisting option to the import function
      const result = await storage.importPressureDataFromCSV(req.file.buffer, { clearExisting });
      console.log(`CSV import completed successfully (clearExisting=${clearExisting}):`, result);

      // Trigger alert emails asynchronously
      runDailyAlertsJob().catch(console.error);

      res.json(result);
    } catch (importError: any) {
      console.error("Detailed CSV import error:", importError);
      // Send detailed error to client
      res.status(500).json({
        error: "Failed to import pressure data from CSV",
        details: importError.message || String(importError),
        preview: filePreview
      });
    }
  } catch (error: any) {
    console.error("Error in CSV upload route:", error);
    res.status(500).json({
      error: "Failed to process CSV file upload",
      details: error.message || String(error)
    });
  }
});

// Export historical pressure data to Excel
router.get("/export/historical", async (req, res) => {
  try {
    const { startDate, endDate, region, searchQuery, commissioned, fullyCompleted, schemeStatus, pressureRange } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const filter = {
      startDate: startDate as string,
      endDate: endDate as string,
      region: region as string | undefined,
    };

    console.log("Historical pressure export request:", filter);

    // Get the raw historical data first
    const rawHistoricalData = await storage.getHistoricalPressureData(filter);

    if (rawHistoricalData.length === 0) {
      return res.status(404).json({
        error: "No historical data found for the specified date range"
      });
    }

    // Get scheme status data for filtering
    let schemeStatusData: any[] = [];
    try {
      schemeStatusData = await storage.getAllSchemes();
    } catch (error) {
      console.warn("Could not fetch scheme status data for filtering:", error);
    }

    // Create a map of scheme statuses for quick lookup
    const schemeStatusMap = new Map();
    schemeStatusData.forEach((status) => {
      schemeStatusMap.set(status.scheme_id, status);
    });

    // Apply filters to the historical data
    let filteredHistoricalData = rawHistoricalData;

    // Apply search query filter
    if (searchQuery && typeof searchQuery === 'string') {
      const query = searchQuery.toLowerCase();
      filteredHistoricalData = filteredHistoricalData.filter(item =>
        item.scheme_name?.toLowerCase().includes(query) ||
        item.region?.toLowerCase().includes(query) ||
        item.village_name?.toLowerCase().includes(query) ||
        item.esr_name?.toLowerCase().includes(query)
      );
    }

    // Apply commissioned status filter
    if (commissioned && commissioned !== "all") {
      filteredHistoricalData = filteredHistoricalData.filter(item => {
        const status = schemeStatusMap.get(item.scheme_id);
        return status && status.mjp_commissioned === commissioned;
      });
    }

    // Apply fully completed filter
    if (fullyCompleted && fullyCompleted !== "all") {
      filteredHistoricalData = filteredHistoricalData.filter(item => {
        const status = schemeStatusMap.get(item.scheme_id);
        return status && status.mjp_fully_completed === fullyCompleted;
      });
    }

    // Apply scheme status filter
    if (schemeStatus && schemeStatus !== "all") {
      filteredHistoricalData = filteredHistoricalData.filter(item => {
        const status = schemeStatusMap.get(item.scheme_id);
        if (!status) return false;

        if (schemeStatus === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatus;
      });
    }

    // Apply pressure range filter
    if (pressureRange && pressureRange !== "all") {
      filteredHistoricalData = filteredHistoricalData.filter(item => {
        const value = parseFloat(String(item.pressure_value || 0));

        switch (pressureRange) {
          case "below_0.2":
            return value >= 0 && value < 0.2;
          case "between_0.2_0.7":
            return value >= 0.2 && value <= 0.7;
          case "above_0.7":
            return value > 0.7;
          case "consistent_zero":
            return value === 0;
          default:
            return true;
        }
      });
    }

    console.log(`Filtered historical data from ${rawHistoricalData.length} to ${filteredHistoricalData.length} records`);

    const historicalData = filteredHistoricalData;

    // Fetch base ESRs to ensure all are included, even if blank
    const db = await getDB();
    const baseEsrsQuery = sql`
      SELECT scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block
      FROM pressure_data
      WHERE 1=1
      ${region && region !== 'all' ? sql` AND region ILIKE ${region}` : sql``}
    `;

    const baseEsrsResult = await db.execute(baseEsrsQuery);

    let filteredBaseEsrs = baseEsrsResult.rows;

    // Apply filters to base ESRs to match the schemeStatus and other filters applied to historicalData
    if (searchQuery && typeof searchQuery === 'string') {
      const query = searchQuery.toLowerCase();
      filteredBaseEsrs = filteredBaseEsrs.filter((item: any) =>
        item.scheme_name?.toLowerCase().includes(query) ||
        item.region?.toLowerCase().includes(query) ||
        item.village_name?.toLowerCase().includes(query) ||
        item.esr_name?.toLowerCase().includes(query)
      );
    }

    if (commissioned && commissioned !== "all") {
      filteredBaseEsrs = filteredBaseEsrs.filter((item: any) => {
        const status = schemeStatusMap.get(item.scheme_id);
        return status && status.mjp_commissioned === commissioned;
      });
    }

    if (fullyCompleted && fullyCompleted !== "all") {
      filteredBaseEsrs = filteredBaseEsrs.filter((item: any) => {
        const status = schemeStatusMap.get(item.scheme_id);
        return status && status.mjp_fully_completed === fullyCompleted;
      });
    }

    if (schemeStatus && schemeStatus !== "all") {
      filteredBaseEsrs = filteredBaseEsrs.filter((item: any) => {
        const status = schemeStatusMap.get(item.scheme_id);
        if (!status) return false;

        if (schemeStatus === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatus;
      });
    }

    // Transform data for Excel export - match chlorine format with dates as columns
    // Group by ESR and create date-wise columns (one column per date)
    const esrMap = new Map();

    // Helper function to format date for column headers
    const formatDateForColumn = (dateStr: string): string => {
      // Handle different date formats and convert to a standard display format
      const date = parseDate(dateStr);
      if (date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      return dateStr; // fallback to original string
    };

    // Helper function to parse various date formats (same as in chlorine export)
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;

      // Handle YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr);
      }

      // Handle DD-MMM-YY format (e.g., "03-Jun-25")
      if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        const fullYear = parseInt(year) + 2000; // Assume 20xx
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);
        if (monthIndex !== -1) {
          return new Date(fullYear, monthIndex, parseInt(day));
        }
      }

      // Handle DD-MMM-YYYY format (e.g., "31-Jul-2025")
      if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        const fullYear = parseInt(year);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);
        if (monthIndex !== -1) {
          return new Date(fullYear, monthIndex, parseInt(day));
        }
      }

      // Handle Excel numeric date format
      if (/^\d+\.?\d*$/.test(dateStr)) {
        const daysSince1900 = parseFloat(dateStr);
        const baseDate = new Date(1900, 0, 1);
        return new Date(baseDate.getTime() + (daysSince1900 - 2) * 24 * 60 * 60 * 1000);
      }

      return null;
    };

    // Generate ALL dates in the range (not just dates with data)
    const generateDateRange = (start: string, end: string): string[] => {
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      const dates = [];

      const currentDate = new Date(startDateObj);
      while (currentDate <= endDateObj) {
        dates.push(currentDate.toISOString().split('T')[0]); // YYYY-MM-DD format
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    };

    // Get complete date range in ascending order
    const sortedDates = generateDateRange(startDate as string, endDate as string);

    // Pre-populate the map with ALL matching base ESRs from the database
    filteredBaseEsrs.forEach((record: any) => {
      const esrKey = `${record.scheme_id}_${record.village_name}_${record.esr_name}`;

      const baseData: any = {
        'Scheme ID': record.scheme_id,
        'Scheme Name': record.scheme_name,
        'Village Name': record.village_name,
        'ESR Name': record.esr_name,
        'Region': record.region,
        'Circle': record.circle,
        'Division': record.division,
        'Sub Division': record.sub_division,
        'Block': record.block
      };

      // Initialize all date columns with null values in sorted order
      sortedDates.forEach(date => {
        baseData[date] = null;
      });

      esrMap.set(esrKey, baseData);
    });

    // Also collect dates that exist in data for comparison
    const dataDateSet = new Set<string>();
    historicalData.forEach(record => {
      const formattedDate = formatDateForColumn(record.measurement_date);
      dataDateSet.add(formattedDate);
    });

    console.log(`Sorted dates for pressure export: ${sortedDates.slice(0, 5).join(', ')}...`);

    historicalData.forEach(record => {
      const esrKey = `${record.scheme_id}_${record.village_name}_${record.esr_name}`;

      // This should ideally never hit if the base ESRs include all history ones, but just in case
      if (!esrMap.has(esrKey)) {
        const baseData: any = {
          'Scheme ID': record.scheme_id,
          'Scheme Name': record.scheme_name,
          'Village Name': record.village_name,
          'ESR Name': record.esr_name,
          'Region': record.region,
          'Circle': record.circle,
          'Division': record.division,
          'Sub Division': record.sub_division,
          'Block': record.block
        };

        // Initialize all date columns with null values in sorted order
        sortedDates.forEach(date => {
          baseData[date] = null;
        });

        esrMap.set(esrKey, baseData);
      }

      // Add pressure value for the specific date
      const formattedDate = formatDateForColumn(record.measurement_date);
      const esrData = esrMap.get(esrKey);
      if (esrData) {
        const rawValue = record.pressure_value;
        let numericValue: number | null = null;

        if (rawValue === 0 || String(rawValue) === '0' || String(rawValue) === '0.0' || String(rawValue) === '0.00') {
          numericValue = 0;
        } else if (rawValue != null) {
          const parsed = parseFloat(String(rawValue));
          numericValue = isNaN(parsed) ? null : parsed;
        }

        esrData[formattedDate] = numericValue;
      }
    });

    // Create workbook and worksheet using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pressure Historical Data");

    // Build header row
    const headerRow = [
      'Region', 'Circle', 'Division', 'Sub Division', 'Block',
      'Scheme ID', 'Scheme Name', 'Village Name', 'ESR Name',

      ...sortedDates
    ];

    worksheet.addRow(headerRow);

    // Add data rows
    Array.from(esrMap.values()).forEach((row: any) => {
      const dataRow = [
        row['Region'],
        row['Circle'],
        row['Division'],
        row['Sub Division'],
        row['Block'],
        row['Scheme ID'],
        row['Scheme Name'],
        row['Village Name'],
        row['ESR Name'],

        ...sortedDates.map(date => row[date] !== null && row[date] !== undefined ? row[date] : '')
      ];
      worksheet.addRow(dataRow);
    });

    // Style header row with sky blue background
    const headerRowObj = worksheet.getRow(1);
    headerRowObj.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF87CEEB' } // Sky blue color
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White bold text
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Set column widths
    worksheet.columns = [
      { width: 15 },  // Region
      { width: 15 },  // Circle
      { width: 15 },  // Division
      { width: 18 },  // Sub Division
      { width: 15 },  // Block
      { width: 12 },  // Scheme ID
      { width: 25 },  // Scheme Name
      { width: 20 },  // Village Name
      { width: 20 },  // ESR Name

      ...sortedDates.map(() => ({ width: 12 })) // Date columns
    ];

    // Generate filename with applied filters
    let fileName = `Pressure_Historical_Data_${startDate}_to_${endDate}`;

    if (region && region !== "all") {
      fileName += `_${region}`;
    }

    if (searchQuery && typeof searchQuery === 'string') {
      fileName += `_Search-${searchQuery.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    if (commissioned && commissioned !== "all") {
      fileName += `_Commissioned-${commissioned}`;
    }

    if (fullyCompleted && fullyCompleted !== "all") {
      fileName += `_FullyCompleted-${fullyCompleted}`;
    }

    if (schemeStatus && schemeStatus !== "all") {
      fileName += `_Status-${schemeStatus}`;
    }

    if (pressureRange && pressureRange !== "all") {
      fileName += `_Range-${pressureRange}`;
    }

    fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    console.log(`Exporting ${esrMap.size} ESRs with historical pressure data to Excel`);

    // Send the buffer
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting historical pressure data:", error);
    res.status(500).json({ error: "Failed to export historical pressure data" });
  }
});

// New endpoint for filtered pressure ESR lists (for dashboard mini-table clicks)
router.get('/esrs/filtered', async (req, res) => {
  try {
    const { region, category } = req.query;
    console.log('Filtering pressure ESRs with:', { region, category });

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // First get sensors with water data
      const sensorsWithWaterQuery = `
        SELECT DISTINCT p.region, p.circle, p.division, p.sub_division, p.block, p.village_name, p.esr_name
        FROM pressure_table p
        INNER JOIN water_scheme_data w ON (
          p.region = w.region AND 
          p.village_name = w.village_name AND 
          p.esr_name = w.esr_name
        )
        WHERE (w.water_value_day1 > 0 OR w.water_value_day2 > 0 OR w.water_value_day3 > 0 OR 
               w.water_value_day4 > 0 OR w.water_value_day5 > 0 OR w.water_value_day6 > 0 OR w.water_value_day7 > 0)
      `;

      const sensorsWithWater = await client.query(sensorsWithWaterQuery);
      const sensorKeys = new Set(
        sensorsWithWater.rows.map(row =>
          `${row.region}|${row.circle}|${row.division}|${row.sub_division}|${row.block}|${row.village_name}|${row.esr_name}`
        )
      );

      let query = 'SELECT * FROM pressure_table';
      const queryParams: any[] = [];
      const conditions: string[] = [];

      // Filter by region
      if (region && region !== 'TOTAL') {
        conditions.push('region = $' + (queryParams.length + 1));
        queryParams.push(region);
      }

      // Apply category-specific filtering using exact dashboard logic
      if (category) {
        switch (category) {
          case 'optimal':
            conditions.push('pressure_value_7 BETWEEN 0.2 AND 0.7');
            break;
          case 'above-range':
            conditions.push('pressure_value_7 > 0.7');
            break;
          case 'below-range':
            conditions.push('(pressure_value_7 < 0.2 OR pressure_value_7 IS NULL)');
            break;
          case 'consistent-below':
            conditions.push(`(
              (pressure_value_1 < 0.2 OR pressure_value_1 IS NULL) AND
              (pressure_value_2 < 0.2 OR pressure_value_2 IS NULL) AND
              (pressure_value_3 < 0.2 OR pressure_value_3 IS NULL) AND
              (pressure_value_4 < 0.2 OR pressure_value_4 IS NULL) AND
              (pressure_value_5 < 0.2 OR pressure_value_5 IS NULL) AND
              (pressure_value_6 < 0.2 OR pressure_value_6 IS NULL) AND
              (pressure_value_7 < 0.2 OR pressure_value_7 IS NULL)
            )`);
            break;
          case 'consistent-optimal':
            conditions.push(`(
              pressure_value_1 BETWEEN 0.2 AND 0.7 AND pressure_value_2 BETWEEN 0.2 AND 0.7 AND
              pressure_value_3 BETWEEN 0.2 AND 0.7 AND pressure_value_4 BETWEEN 0.2 AND 0.7 AND
              pressure_value_5 BETWEEN 0.2 AND 0.7 AND pressure_value_6 BETWEEN 0.2 AND 0.7 AND
              pressure_value_7 BETWEEN 0.2 AND 0.7
            )`);
            break;
          case 'consistent-above':
            conditions.push(`(
              pressure_value_1 > 0.7 AND pressure_value_2 > 0.7 AND pressure_value_3 > 0.7 AND
              pressure_value_4 > 0.7 AND pressure_value_5 > 0.7 AND pressure_value_6 > 0.7 AND pressure_value_7 > 0.7
            )`);
            break;
        }
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY region, village_name, esr_name';

      console.log('Executing pressure query:', query);
      const result = await client.query(query, queryParams);

      // Filter to only include sensors with water data
      const filteredData = result.rows.filter(row => {
        const key = `${row.region}|${row.circle}|${row.division}|${row.sub_division}|${row.block}|${row.village_name}|${row.esr_name}`;
        return sensorKeys.has(key);
      });

      console.log(`Found ${filteredData.length} pressure ESRs matching criteria (with water)`);

      res.json({
        success: true,
        data: filteredData,
        count: filteredData.length,
        filters: { region, category, type: 'pressure' }
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error('Error filtering pressure ESRs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter pressure ESRs',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;