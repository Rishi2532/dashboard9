import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { ZodError } from "zod";
import { insertChlorineDataSchema, updateChlorineDataSchema } from "@shared/schema";
import { executeWithRetry } from "../db-retry";
import { getDB } from "../db";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import pg from 'pg';
import { sql, and, eq } from "drizzle-orm";
import { schemeStatuses } from "@shared/schema";

const router = express.Router();

// Helper to get filtered scheme IDs based on filterType
async function getFilteredSchemeIds(db: any, filterType: any, fullyCompleted: any) {
  const activeFilter = filterType || (fullyCompleted === "true" ? "fully_completed" : undefined);

  if (!activeFilter || activeFilter === 'all') {
    return null; // No filter needed
  }

  let condition;
  if (activeFilter === 'commissioned') {
    condition = sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`;
  } else if (activeFilter === 'fully_completed') {
    condition = sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('completed', 'fully-completed', 'fully completed', 'functionally completed')`;
  } else if (activeFilter === 'partial' || activeFilter === 'in_progress') {
    condition = sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('in progress', 'partial', 'ongoing')`;
  }

  if (condition) {
    const rows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(condition);
    const ids = rows.map((r: any) => r.scheme_id);
    return ids.length > 0 ? ids : ['NO_MATCHES'];
  }
  return null;
}

// Helper function to get dates for a specific ISO week, offset by a number of weeks
function getISOWeekInfo(weekOffset: number = 0): { dates: string[], weekNum: number, startStr: string, endStr: string } {
  const now = new Date();
  // Get the most recent Sunday (end of last complete week)
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(23, 59, 59, 999);

  // Get the Monday of that week
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  lastMonday.setHours(0, 0, 0, 0);

  // Apply week offset
  if (weekOffset > 0) {
    lastMonday.setDate(lastMonday.getDate() - (weekOffset * 7));
  }

  // Generate the 7 dates
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + i);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = d.toLocaleString('en-US', { month: 'short' });
    dates.push(`${dayStr}-${monthStr}`);
  }

  // Calculate week number
  const target = new Date(lastMonday);
  const dayNr = (lastMonday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  return { dates, weekNum, startStr: dates[0], endStr: dates[6] };
}

// Get weekly average LPCD statistics
router.get("/weekly-lpcd/stats", async (req, res) => {
  try {
    const weekOffset = parseInt(req.query.weekOffset as string) || 0;
    const weekInfo = getISOWeekInfo(weekOffset);
    console.log(`Weekly LPCD Stats Request for weekOffset ${weekOffset}:`, weekInfo);

    const { fullyCompleted, filterType } = req.query;
    console.log(`Weekly LPCD Stats Request for: ${weekInfo.weekNum}`, { fullyCompleted, filterType });

    const db = await getDB();

    // Get filtered scheme IDs
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    let fullyCompletedSchemeIds: Set<string> | undefined;

    if (filteredIds) {
      // If filter returns NO_MATCHES string array, keep it as empty set or special handling
      // For simple set passing:
      fullyCompletedSchemeIds = new Set(filteredIds);
    }

    const [villageStats, schemeStats] = await Promise.all([
      storage.getVillageWeeklyStats(weekInfo.dates, fullyCompletedSchemeIds),
      storage.getSchemeWeeklyStats(weekInfo.dates, fullyCompletedSchemeIds)
    ]);

    res.json({
      success: true,
      villageStats,
      schemeStats,
      weekLabel: `Week ${weekInfo.weekNum} (${weekInfo.startStr} - ${weekInfo.endStr})`,
      dates: weekInfo.dates
    });
  } catch (error) {
    console.error("Error fetching weekly LPCD stats:", error);
    res.status(500).json({ error: "Failed to fetch weekly stats" });
  }
});

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

// Get chlorine filter options
router.get("/filters", async (req, res) => {
  try {
    const { region, circle, division, subDivision, subdivision, block } = req.query;

    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    // Handle both camelCase and lowercase subdivision param
    const subDivParam = (subDivision || subdivision) as string | undefined;
    if (subDivParam) filter.subDivision = subDivParam;
    if (block) filter.block = block as string;

    const options = await storage.getChlorineFilterOptions(filter);
    res.json(options);
  } catch (error) {
    console.error("Error fetching chlorine filter options:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// Get all chlorine data with optional filters
router.get("/", async (req, res) => {
  try {
    const { region, circle, division, subDivision, block, chlorineRange, minChlorine, maxChlorine } = req.query;

    console.log("Chlorine API Request Filters:", {
      region,
      circle,
      division,
      subDivision,
      block,
      chlorineRange,
      minChlorine,
      maxChlorine
    });

    interface ChlorineFilter {
      region?: string;
      circle?: string;
      division?: string;
      subDivision?: string;
      block?: string;
      chlorineRange?: 'below_0.2' | 'between_0.2_0.5' | 'above_0.5' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';
      minChlorine?: number;
      maxChlorine?: number;
    }

    const filter: ChlorineFilter = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    if (subDivision) filter.subDivision = subDivision as string;
    if (block) filter.block = block as string;
    if (chlorineRange) filter.chlorineRange = chlorineRange as any;
    if (minChlorine) filter.minChlorine = parseFloat(minChlorine as string);
    if (maxChlorine) filter.maxChlorine = parseFloat(maxChlorine as string);

    console.log("Applied filter object:", filter);

    const chlorineData = await storage.getAllChlorineData(filter);
    console.log(`Returning ${chlorineData.length} chlorine records after filtering`);

    // For debugging - log a sample of the first few data points to see what's returned
    if (chlorineData.length > 0) {
      const sampleData = chlorineData.slice(0, Math.min(3, chlorineData.length)).map(item => ({
        scheme_id: item.scheme_id,
        region: item.region,
        village_name: item.village_name,
        esr_name: item.esr_name,
        chlorine_value_7: item.chlorine_value_7
      }));
      console.log("Sample data:", sampleData);
    }

    res.json(chlorineData);
  } catch (error) {
    console.error("Error getting chlorine data:", error);
    res.status(500).json({ error: "Failed to get chlorine data" });
  }
});

// Get historical chlorine data by date range with deduplication
router.get("/historical", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme_id, village_name, esr_name } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required. Format: YYYY-MM-DD or DD-MM-YYYY"
      });
    }

    console.log("Historical Chlorine Data Request:", {
      startDate,
      endDate,
      region,
      scheme_id,
      village_name,
      esr_name
    });

    // Use the new chlorine_history table-based method
    const historicalData = await storage.getChlorineHistoricalDataByDateRange(
      startDate as string,
      endDate as string,
      region as string,
      scheme_id as string,
      village_name as string
    );

    // Filter by ESR name if specified
    let filteredData = historicalData;
    if (esr_name) {
      filteredData = historicalData.filter(record =>
        record.esr_name === esr_name
      );
    }

    console.log(`Returning ${filteredData.length} historical chlorine records`);

    res.json({
      success: true,
      count: filteredData.length,
      data: filteredData,
      query: {
        dateRange: `${startDate} to ${endDate}`,
        filters: {
          region,
          scheme_id,
          village_name,
          esr_name
        }
      }
    });
  } catch (error) {
    console.error("Error getting historical chlorine data:", error);
    res.status(500).json({
      error: "Failed to get historical chlorine data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get dashboard statistics for chlorine data
router.get("/dashboard-stats", async (req, res) => {
  try {
    const { region, circle, division, subDivision, block } = req.query;

    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    if (subDivision) filter.subDivision = subDivision as string;
    if (block) filter.block = block as string;

    const stats = await storage.getChlorineDashboardStats(filter);
    res.json(stats);
  } catch (error) {
    console.error("Error getting chlorine dashboard stats:", error);
    res.status(500).json({ error: "Failed to get chlorine dashboard statistics" });
  }
});

// Get chlorine sensors with no water (cross-referenced with water consumption)
router.get("/no-water-sensors", async (req, res) => {
  try {
    const { region, circle, division, subDivision, block } = req.query;
    console.log("Fetching chlorine sensors with no water for filters:", { region, circle, division, subDivision, block });

    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    if (subDivision) filter.subDivision = subDivision as string;
    if (block) filter.block = block as string;

    const result = await storage.getChlorineSensorsWithNoWater(filter);

    res.json({
      success: true,
      data: result,
      message: `Found ${result.totalNoWaterSensors} chlorine sensors with no water`
    });
  } catch (error) {
    console.error("Error getting chlorine sensors with no water:", error);
    res.status(500).json({
      error: "Failed to get chlorine sensors with no water",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get chlorine sensors with water (cross-referenced with water consumption)
router.get("/with-water-sensors", async (req, res) => {
  try {
    const { region, circle, division, subDivision, block } = req.query;
    console.log("Fetching chlorine sensors with water for filters:", { region, circle, division, subDivision, block });

    const filter: any = {};
    if (region) filter.region = region as string;
    if (circle) filter.circle = circle as string;
    if (division) filter.division = division as string;
    if (subDivision) filter.subDivision = subDivision as string;
    if (block) filter.block = block as string;

    const result = await storage.getChlorineSensorsWithWater(filter);

    res.json({
      success: true,
      data: result,
      message: `Found ${result.totalWithWaterSensors} chlorine sensors with water`
    });
  } catch (error) {
    console.error("Error getting chlorine sensors with water:", error);
    res.status(500).json({
      error: "Failed to get chlorine sensors with water",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get regional chlorine sensor statistics
router.get("/regional-stats", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;
    console.log("Fetching regional chlorine sensor statistics", { fullyCompleted, filterType });

    const db = await getDB();

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND cs.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get all unique regions from communication status
      const regionsResult = await client.query(`
        SELECT DISTINCT region 
        FROM communication_status cs
        WHERE region IS NOT NULL 
        ${schemeIdFilter}
        ORDER BY region
      `);
      const regions = regionsResult.rows.map((row: { region: string }) => row.region);

      console.log(`Found ${regions.length} regions to process`);
      /*
      - [ ] Verification
          - [x] Compare UI counts with Export counts for various metrics.
          - [x] Confirm Excel file content reflects January 2026 data correctly.
          - [x] Update walkthrough.
      - [/] Village LPCD Weekly Average Verification
          - [/] Investigate week average calculation logic.
          - [ ] Run verification script for Amravati region (29-Dec to 04-Jan).
          - [ ] Compare database result with UI value (265).
      */
      // Calculate statistics for each region
      const regionalStats = await Promise.all(
        regions.map(async (region: string) => {
          const statsResult = await client.query(`
            SELECT 
              COUNT(DISTINCT CASE WHEN cs.chlorine_connected = 'Connected' THEN cs.id END) as total_connected,
              COUNT(DISTINCT CASE WHEN cs.chlorine_connected = 'Connected' AND cs.chlorine_status = 'Online' THEN cs.id END) as total_online,
              COUNT(DISTINCT CASE WHEN cs.chlorine_connected = 'Connected' AND cs.chlorine_status = 'Offline' THEN cs.id END) as total_offline,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL 
                  AND CAST(wc.water_value_day7 AS text) != '0'
                  AND wc.water_value_day7 > 0
                THEN cs.id 
              END) as online_with_water,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR wc.water_value_day7 = 0)
                THEN cs.id 
              END) as online_without_water,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5
                THEN cs.id 
              END) as online_with_water_chlorine_optimal,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5
                THEN cs.id 
              END) as online_with_water_chlorine_above,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2
                THEN cs.id 
              END) as online_with_water_chlorine_below,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5
                THEN cs.id 
              END) as online_without_water_chlorine_optimal,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5
                THEN cs.id 
              END) as online_without_water_chlorine_above,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2
                THEN cs.id 
              END) as online_without_water_chlorine_below,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Offline' 
                  AND cs.last_seen IS NOT NULL
                  AND CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '7 days'
                THEN cs.id 
              END) as offline_since_7days,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Offline' 
                  AND cs.last_seen IS NOT NULL
                  AND CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '30 days'
                THEN cs.id 
              END) as offline_since_30days,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Offline' 
                  AND cs.last_seen IS NOT NULL
                  AND CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '3 days'
                THEN cs.id 
              END) as offline_since_3days
            FROM communication_status cs
            LEFT JOIN water_consumption wc ON (
              cs.region = wc.region AND
              cs.circle = wc.circle AND
              cs.division = wc.division AND
              cs.sub_division = wc.sub_division AND
              cs.block = wc.block AND
              cs.scheme_id = wc.scheme_id AND
              cs.scheme_name = wc.scheme_name AND
              cs.village_name = wc.village_name AND
              cs.esr_name = wc.esr_name
            )
            LEFT JOIN chlorine_data cd ON (
              cs.region = cd.region AND
              cs.circle = cd.circle AND
              cs.division = cd.division AND
              cs.sub_division = cd.sub_division AND
              cs.block = cd.block AND
              cs.scheme_id = cd.scheme_id AND
              cs.scheme_name = cd.scheme_name AND
              cs.village_name = cd.village_name AND
              cs.esr_name = cd.esr_name
            )
            WHERE cs.region = $1 ${schemeIdFilter}
          `, [region]);

          const row = statsResult.rows[0] || {};
          const onlineWithWater = Number(row.online_with_water) || 0;
          const onlineWithWaterChlorineOptimal = Number(row.online_with_water_chlorine_optimal) || 0;
          const onlineWithWaterChlorineAbove = Number(row.online_with_water_chlorine_above) || 0;
          const onlineWithWaterChlorineBelow = Number(row.online_with_water_chlorine_below) || 0;
          const sumRanges = onlineWithWaterChlorineOptimal + onlineWithWaterChlorineAbove + onlineWithWaterChlorineBelow;
          const onlineWithWaterNoChlorineData = Math.max(onlineWithWater - sumRanges, 0);

          return {
            region,
            totalConnected: Number(row.total_connected) || 0,
            totalOnline: Number(row.total_online) || 0,
            onlineWithWater,
            onlineWithWaterChlorineOptimal,
            onlineWithWaterChlorineAbove,
            onlineWithWaterChlorineBelow,
            onlineWithWaterNoChlorineData,
            onlineWithoutWater: Number(row.online_without_water) || 0,
            onlineWithoutWaterChlorineOptimal: Number(row.online_without_water_chlorine_optimal) || 0,
            onlineWithoutWaterChlorineAbove: Number(row.online_without_water_chlorine_above) || 0,
            onlineWithoutWaterChlorineBelow: Number(row.online_without_water_chlorine_below) || 0,
            totalOffline: Number(row.total_offline) || 0,
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
    console.error("Error getting regional chlorine sensor statistics:", error);
    res.status(500).json({
      error: "Failed to get regional chlorine sensor statistics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get chlorine division-wise summary 
router.get("/division-wise-summary", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType } = req.query;
    console.log(`Fetching chlorine division-wise summary for region: ${region || 'all'}`, { fullyCompleted, filterType });

    const db = await getDB();

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // No matches, return empty result
        return res.json({
          success: true,
          data: [],
          region: region || 'All Regions'
        });
      }
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND scheme_id IN (${ids})`;
    }

    // Build SQL query to aggregate chlorine data by division
    const result = await db.execute(sql`
      SELECT 
        region,
        division,
        COUNT(DISTINCT scheme_id || '-' || village_name || '-' || esr_name) as total_rcas,
        COUNT(DISTINCT CASE 
          WHEN chlorine_value_7::numeric > 0 AND chlorine_value_7::numeric < 0.2 
          THEN scheme_id || '-' || village_name || '-' || esr_name 
        END) as below_0_2,
        COUNT(DISTINCT CASE 
          WHEN chlorine_value_7::numeric >= 0.2 AND chlorine_value_7::numeric <= 0.5 
          THEN scheme_id || '-' || village_name || '-' || esr_name 
        END) as optimal,
        COUNT(DISTINCT CASE 
          WHEN chlorine_value_7::numeric > 0.5 
          THEN scheme_id || '-' || village_name || '-' || esr_name 
        END) as above_0_5
      FROM chlorine_data
      WHERE chlorine_value_7 IS NOT NULL
      ${region && region !== 'All Regions' ? sql`AND LOWER(region) = LOWER(${region})` : sql``}
      ${sql.raw(schemeIdFilter)}
      GROUP BY region, division
      ORDER BY region, division
    `);

    // Transform the result
    const divisionSummary = result.rows.map((row: {
      region: string | null;
      division: string | null;
      total_rcas: string | number;
      below_0_2: string | number;
      optimal: string | number;
      above_0_5: string | number;
    }) => ({
      region: row.region || "",
      division: row.division || "Unknown",
      totalRCAs: parseInt(row.total_rcas as string) || 0,
      rcasBelow02: parseInt(row.below_0_2 as string) || 0,
      rcasOptimal: parseInt(row.optimal as string) || 0,
      rcasAbove05: parseInt(row.above_0_5 as string) || 0,
    }));

    res.json({
      success: true,
      data: divisionSummary,
      region: region || 'All Regions'
    });
  } catch (error) {
    console.error("Error getting chlorine division-wise summary:", error);
    res.status(500).json({
      error: "Failed to get chlorine division-wise summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get chlorine sensors by division and metric
router.get("/division-sensors", async (req, res) => {
  try {
    const { region, division, metric, fullyCompleted, filterType } = req.query;

    if (!division) {
      return res.status(400).json({
        error: "Division parameter is required"
      });
    }

    console.log(`Fetching chlorine sensors for division: ${division}, metric: ${metric}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    const db = await getDB();

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      if (filteredIds[0] === 'NO_MATCHES') {
        return res.json({
          success: true,
          data: [],
          count: 0,
          division,
          metric,
          region: region || 'All Regions'
        });
      }
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND scheme_id IN (${ids})`;
    }

    // Build the WHERE clause based on metric
    let metricCondition;
    switch (metric) {
      case 'below02':
        metricCondition = sql`AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7::numeric > 0 AND cd.chlorine_value_7::numeric < 0.2`;
        break;
      case 'optimal':
        metricCondition = sql`AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7::numeric >= 0.2 AND cd.chlorine_value_7::numeric <= 0.5`;
        break;
      case 'above05':
        metricCondition = sql`AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7::numeric > 0.5`;
        break;
      default:
        metricCondition = sql``;
    }

    const regionCondition = region && region !== 'All Regions'
      ? sql`AND LOWER(cd.region) = LOWER(${region})`
      : sql``;

    // Updated query with alias 'cd' and joining scheme_status
    // Note: We use sql.raw for schemeIdFilter but we need to ensure it uses the alias if it contains column references
    // schemeIdFilter usually is "AND scheme_id IN (...)" -> "AND cd.scheme_id IN (...)"
    const schemeIdFilterAliased = schemeIdFilter.replace(/scheme_id/g, 'cd.scheme_id');

    const result = await db.execute(sql`
      SELECT 
        cd.region,
        cd.circle,
        cd.division,
        cd.sub_division,
        cd.block,
        cd.scheme_id,
        cd.scheme_name,
        cd.village_name,
        cd.esr_name,
        cd.chlorine_value_7 as latest_chlorine_value,
        cd.chlorine_date_day_7 as latest_chlorine_date,
        cd.chlorine_date_day_7 as latest_chlorine_date,
        cd.dashboard_url
      FROM chlorine_data cd
      WHERE LOWER(cd.division) = LOWER(${division})
      ${regionCondition}
      ${metricCondition}
      ${sql.raw(schemeIdFilterAliased)}
      ORDER BY cd.region, cd.division, cd.village_name
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
    console.error("Error getting chlorine sensors by division:", error);
    res.status(500).json({
      error: "Failed to get chlorine sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export chlorine sensors by division to Excel
router.get("/division-sensors-export", async (req, res) => {
  try {
    const { region, division, metric, fullyCompleted, filterType } = req.query;

    if (!division) {
      return res.status(400).json({
        error: "Division parameter is required"
      });
    }

    console.log(`Exporting chlorine sensors for division: ${division}, metric: ${metric}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    const db = await getDB();

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND scheme_id IN (${ids})`;
    }

    // Build the WHERE clause based on metric
    let metricCondition;
    let metricLabel = '';
    switch (metric) {
      case 'below02':
        metricCondition = sql`AND chlorine_value_7 IS NOT NULL AND chlorine_value_7::numeric > 0 AND chlorine_value_7::numeric < 0.2`;
        metricLabel = 'Below 0.2 mg/l';
        break;
      case 'optimal':
        metricCondition = sql`AND chlorine_value_7 IS NOT NULL AND chlorine_value_7::numeric >= 0.2 AND chlorine_value_7::numeric <= 0.5`;
        metricLabel = 'Optimal (0.2-0.5 mg/l)';
        break;
      case 'above05':
        metricCondition = sql`AND chlorine_value_7 IS NOT NULL AND chlorine_value_7::numeric > 0.5`;
        metricLabel = 'Above 0.5 mg/l';
        break;
      default:
        metricCondition = sql``;
        metricLabel = 'All';
    }

    const regionCondition = region && region !== 'All Regions'
      ? sql`AND LOWER(region) = LOWER(${region})`
      : sql``;

    const result = await db.execute(sql`
      SELECT 
        region,
        circle,
        division,
        sub_division,
        block,
        scheme_id,
        scheme_name,
        village_name,
        esr_name,
        chlorine_value_7,
        chlorine_value_7,
        chlorine_date_day_7,
        dashboard_url
      FROM chlorine_data
      WHERE LOWER(division) = LOWER(${division})
      ${regionCondition}
      ${metricCondition}
      ${sql.raw(schemeIdFilter)}
      ORDER BY region, division, village_name
    `);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Division Chlorine Sensors');

    // Add headers
    worksheet.columns = [
      { header: 'Region', key: 'region', width: 20 },
      { header: 'Circle', key: 'circle', width: 20 },
      { header: 'Division', key: 'division', width: 20 },
      { header: 'Sub Division', key: 'sub_division', width: 20 },
      { header: 'Block', key: 'block', width: 20 },
      { header: 'Scheme ID', key: 'scheme_id', width: 15 },
      { header: 'Scheme Name', key: 'scheme_name', width: 30 },
      { header: 'Village', key: 'village_name', width: 25 },
      { header: 'ESR Name', key: 'esr_name', width: 25 },
      { header: 'Chlorine (mg/l)', key: 'chlorine_value_7', width: 15 },
      { header: 'Date', key: 'chlorine_date_day_7', width: 15 },
      { header: 'Dashboard Link', key: 'dashboard_url', width: 40 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    result.rows.forEach((row: {
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      chlorine_value_7: string | number | null;
      chlorine_date_day_7: string | null;
    }) => {
      worksheet.addRow({
        region: row.region,
        circle: row.circle,
        division: row.division,
        sub_division: row.sub_division,
        block: row.block,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        village_name: row.village_name,
        esr_name: row.esr_name,
        chlorine_value_7: row.chlorine_value_7 !== null ? Number(row.chlorine_value_7).toFixed(2) : 'N/A',
        chlorine_date_day_7: row.chlorine_date_day_7 || 'N/A',
        dashboard_url: (row as any).dashboard_url || '',
      });
    });

    // Set response headers
    // Sanitize filename to remove invalid characters (like <, >, spaces, parens)
    const sanitizedLabel = metricLabel.replace(/[^a-zA-Z0-9-_]/g, '_');
    const sanitizedRegion = ((region as string) || 'All').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${sanitizedLabel}_${sanitizedRegion}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting chlorine sensors by division:", error);
    res.status(500).json({
      error: "Failed to export chlorine sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get day-wise breakdown for chlorine sensors
router.get("/day-wise-breakdown", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType } = req.query;
    console.log(`Fetching day-wise breakdown for region: "${region || 'all'}" (type: ${typeof region})`, { fullyCompleted, filterType });

    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    const filteredSchemeIds = filteredIds ? new Set(filteredIds as string[]) : undefined;

    const breakdown = await storage.getChlorineDayWiseBreakdown(
      region as string | undefined,
      filteredSchemeIds
    );

    res.json({
      success: true,
      data: breakdown,
      region: region || 'all'
    });
  } catch (error) {
    console.error("Error getting day-wise breakdown:", error);
    res.status(500).json({
      error: "Failed to get day-wise breakdown",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get sensors by day-wise criteria (offline N days, below 0.2 for N days, above 0.5 for N days)
router.get("/day-wise-sensors/:metric/:days", async (req, res) => {
  try {
    const { metric, days } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching sensors for metric: ${metric}, days: ${days}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    // Validate metric
    if (!['offline', 'below_0_2', 'above_0_5', 'optimal_0_2_0_5'].includes(metric)) {
      return res.status(400).json({
        error: "Invalid metric. Must be 'offline', 'below_0_2', 'above_0_5', or 'optimal_0_2_0_5'"
      });
    }

    // Validate days
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: "Invalid days. Must be a number between 1 and 30"
      });
    }

    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    const filteredSchemeIds = filteredIds ? new Set(filteredIds as string[]) : undefined;

    const regionName = region === 'All Regions' ? undefined : (region as string);

    // Use the robust storage method which handles:
    // 1. DD-Mon-YYYY parsed with year logic
    // 2. Excel serial dates
    // 3. Gap detection (consecutive calendar days)
    // 4. Offline logic (>= N days) and LIMIT 500
    const result = await storage.getChlorineSensorsByDayWiseCriteria(
      metric as "offline" | "below_0_2" | "above_0_5" | "optimal_0_2_0_5",
      daysNum,
      regionName,
      filteredSchemeIds
    );

    res.json({
      success: true,
      data: result,
      count: result.length,
      metric,
      days: daysNum,
      region: region || 'all'
    });
  } catch (error) {
    console.error("Error getting sensors by day-wise criteria:", error);
    res.status(500).json({
      error: "Failed to get sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export day-wise sensors to Excel
router.get(["/day-wise-sensors-export/:metric/:days", "/day-wise-sensors-export"], async (req, res) => {
  try {
    let { metric, days } = req.params;
    if (!metric) metric = req.query.metric as string;
    if (!days) days = req.query.days as string;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting sensors for metric: ${metric}, days: ${days}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    // Validate metric
    if (!['offline', 'below_0_2', 'above_0_5', 'optimal_0_2_0_5'].includes(metric)) {
      return res.status(400).json({
        error: "Invalid metric. Must be 'offline', 'below_0_2', 'above_0_5', or 'optimal_0_2_0_5'"
      });
    }

    // Validate days
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: "Invalid days. Must be a number between 1 and 30"
      });
    }

    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    const filteredSchemeIds = filteredIds ? new Set(filteredIds as string[]) : undefined;

    // Use the storage method which has all the correct logic (deduplication, >= filtering, etc.)
    const sensors = await storage.getChlorineSensorsByDayWiseCriteria(
      metric as "below_0_2" | "optimal_0_2_0_5" | "above_0_5" | "offline",
      daysNum,
      region as string | undefined,
      filteredSchemeIds
    );





    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Day-Wise Sensors');

    // Define metric label
    let metricLabel = '';
    if (metric === 'offline') {
      metricLabel = `Offline for ${daysNum} days`;
    } else if (metric === 'below_0_2') {
      metricLabel = `Chlorine <0.2 for ${daysNum} consecutive days`;
    } else if (metric === 'above_0_5') {
      metricLabel = `Chlorine >0.5 for ${daysNum} consecutive days`;
    } else {
      metricLabel = `Chlorine 0.2-0.5 (Optimal) for ${daysNum} consecutive days`;
    }

    // Add headers
    worksheet.columns = [
      { header: 'Region', key: 'region', width: 20 },
      { header: 'Circle', key: 'circle', width: 20 },
      { header: 'Division', key: 'division', width: 20 },
      { header: 'Sub Division', key: 'sub_division', width: 20 },
      { header: 'Block', key: 'block', width: 20 },
      { header: 'Scheme ID', key: 'scheme_id', width: 20 },
      { header: 'Scheme Name', key: 'scheme_name', width: 30 },
      { header: 'Village', key: 'village_name', width: 25 },
      { header: 'ESR Name', key: 'esr_name', width: 25 },
      { header: 'Status', key: 'chlorine_status', width: 15 },
      { header: 'Consecutive Days', key: 'consecutive_days', width: 18 },
      { header: 'Latest Chlorine (mg/l)', key: 'latest_chlorine_value', width: 22 },
      { header: 'Latest Chlorine Date', key: 'latest_chlorine_date', width: 22 },
      { header: 'Dashboard Link', key: 'dashboard_url', width: 40 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    sensors.forEach((sensor: any) => {
      worksheet.addRow({
        region: sensor.region,
        circle: sensor.circle,
        division: sensor.division,
        sub_division: sensor.sub_division,
        block: sensor.block,
        scheme_id: sensor.scheme_id,
        scheme_name: sensor.scheme_name,
        village_name: sensor.village_name,
        esr_name: sensor.esr_name,
        chlorine_status: sensor.chlorine_status,
        consecutive_days: sensor.consecutive_days,
        latest_chlorine_value: sensor.latest_chlorine_value !== null && sensor.latest_chlorine_value !== undefined ? Number(sensor.latest_chlorine_value).toFixed(2) : 'N/A',
        latest_chlorine_date: sensor.latest_chlorine_date || 'N/A',
        dashboard_url: sensor.dashboard_url || '',
      });
    });

    // Set response headers
    // Sanitize filename to remove invalid characters (like <, >, spaces, parens)
    const sanitizedLabel = metricLabel.replace(/[^a-zA-Z0-9-_]/g, '_');
    const sanitizedRegion = ((region as string) || 'All').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${sanitizedLabel}_${sanitizedRegion}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting day-wise sensors:", error);
    res.status(500).json({
      error: "Failed to export sensors",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get detailed list of sensors by statistic type
router.get("/details/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching detailed ${statisticType} sensors for region: ${region} filterType: ${filterType || fullyCompleted}`);

    const db = await getDB();

    // Build filters array
    const filters = [];

    // Add region filter if specified
    if (region) {
      filters.push(sql`cs.region = ${region}`);
    }

    // Add scheme filter
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        return res.json({
          success: true,
          type: statisticType,
          region: region || 'all',
          count: 0,
          data: []
        });
      }
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      filters.push(sql`cs.scheme_id IN (${sql.raw(ids)})`);
    }

    // Base connected filter
    filters.push(sql`cs.chlorine_connected = 'Connected'`);

    // Add statistic-specific filters
    switch (statisticType) {
      case 'connected':
        break;
      case 'online':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        break;
      case 'online-with-water':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'online-without-water':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        break;
      case 'offline':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        break;
      case 'online-with-water-chlorine-optimal':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 >= 0.2`);
        filters.push(sql`cd.chlorine_value_7 <= 0.5`);
        break;
      case 'online-with-water-chlorine-above':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 > 0.5`);
        break;
      case 'online-with-water-chlorine-below':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 < 0.2`);
        break;
      case 'online-with-water-no-chlorine-data':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NULL`);
        break;
      case 'online-without-water-chlorine-optimal':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 >= 0.2`);
        filters.push(sql`cd.chlorine_value_7 <= 0.5`);
        break;
      case 'online-without-water-chlorine-above':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 > 0.5`);
        break;
      case 'online-without-water-chlorine-below':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 < 0.2`);
        break;
      case 'offline-7days':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`cs.last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '7 days'`);
        break;
      case 'offline-30days':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`cs.last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '30 days'`);
        break;
      case 'offline-3days':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`cs.last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '3 days'`);
        break;
      case 'data-loss':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'all_sensors':
        break;
      default:
        return res.status(400).json({ error: "Invalid statistic type" });
    }

    // Build the complete query
    const query = sql`
      SELECT 
        cs.region,
        cs.circle,
        cs.division,
        cs.sub_division,
        cs.block,
        cs.scheme_id,
        cs.scheme_name,
        cs.village_name,
        cs.esr_name,
        cs.chlorine_connected,
        cs.chlorine_status,
        cs.chlorine_0h_72h,
        cs.chlorine_72h,
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
        cd.chlorine_value_1,
        cd.chlorine_date_day_1,
        cd.chlorine_value_2,
        cd.chlorine_date_day_2,
        cd.chlorine_value_3,
        cd.chlorine_date_day_3,
        cd.chlorine_value_4,
        cd.chlorine_date_day_4,
        cd.chlorine_value_5,
        cd.chlorine_date_day_5,
        cd.chlorine_value_6,
        cd.chlorine_date_day_6,
        cd.chlorine_value_7,
        cd.chlorine_value_7,
        cd.chlorine_date_day_7,
        cd.dashboard_url
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (
        cs.region = wc.region AND
        cs.circle = wc.circle AND
        cs.division = wc.division AND
        cs.sub_division = wc.sub_division AND
        cs.block = wc.block AND
        cs.scheme_id = wc.scheme_id AND
        cs.scheme_name = wc.scheme_name AND
        cs.village_name = wc.village_name AND
        cs.esr_name = wc.esr_name
      )
      LEFT JOIN chlorine_data cd ON (
        cs.region = cd.region AND
        cs.circle = cd.circle AND
        cs.division = cd.division AND
        cs.sub_division = cd.sub_division AND
        cs.block = cd.block AND
        cs.scheme_id = cd.scheme_id AND
        cs.scheme_name = cd.scheme_name AND
        cs.village_name = cd.village_name AND
        cs.esr_name = cd.esr_name
      )
      WHERE ${sql.join(filters, sql` AND `)}
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
    console.error("Error fetching sensor details:", error);
    res.status(500).json({
      error: "Failed to fetch sensor details",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export chlorine historical data to Excel (MUST be before /export/:statisticType)
router.get("/export/historical", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme_id, village_name, esr_name } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required. Format: YYYY-MM-DD"
      });
    }

    console.log("Exporting Chlorine Historical Data:", {
      startDate,
      endDate,
      region,
      scheme_id,
      village_name,
      esr_name
    });

    // Get historical data using the existing method
    const historicalData = await storage.getChlorineHistoricalDataByDateRange(
      startDate as string,
      endDate as string,
      region as string,
      scheme_id as string,
      village_name as string
    );

    // Filter by ESR name if specified
    let filteredData = historicalData;
    if (esr_name) {
      filteredData = historicalData.filter(record =>
        record.esr_name === esr_name
      );
    }

    // Transform data for Excel export - clean format as specified
    // Group by ESR and create date-wise columns (one column per date)
    const esrMap = new Map();

    // Fetch base ESRs to ensure all are included, even if blank
    const db = await getDB();
    const baseEsrsQuery = sql`
      SELECT scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block
      FROM chlorine_data
      WHERE 1=1
      ${region && region !== 'all' ? sql` AND region ILIKE ${region}` : sql``}
      ${scheme_id ? sql` AND scheme_id = ${scheme_id}` : sql``}
      ${village_name ? sql` AND village_name = ${village_name}` : sql``}
      ${esr_name ? sql` AND esr_name = ${esr_name}` : sql``}
    `;

    const baseEsrsResult = await db.execute(baseEsrsQuery);

    // Helper function to format date for column headers
    const formatDateForColumn = (dateStr: string): string => {
      // Handle different date formats and convert to a standard display format
      const date = parseDate(dateStr);
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return dateStr; // fallback to original string
    };

    // Helper function to parse various date formats (same as in storage)
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      dateStr = dateStr.toString().trim();

      // Handle YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day);
      }

      // Handle DD-MMM-YY format (e.g., "03-Jun-25")
      if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        const fullYear = parseInt(year) + 2000; // Assume 20xx
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.indexOf(month.toLowerCase());
        if (monthIndex !== -1) {
          return new Date(fullYear, monthIndex, parseInt(day));
        }
      }

      // Handle DD-MMM-YYYY format (e.g., "31-Jul-2025")
      if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        const fullYear = parseInt(year);
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.indexOf(month.toLowerCase());
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

      // Handle DD-MMM format (e.g., "21-Jan") - Assume current year
      if (/^\d{1,2}-[A-Za-z]{3}$/.test(dateStr)) {
        const [day, month] = dateStr.split("-");
        const currentYear = new Date().getFullYear();
        const monthNames = [
          "jan", "feb", "mar", "apr", "may", "jun",
          "jul", "aug", "sep", "oct", "nov", "dec",
        ];
        const monthIndex = monthNames.indexOf(month.toLowerCase());
        if (monthIndex !== -1) {
          // Check if the resulting date is significantly in the future (e.g. > 6 months)
          // If so, assume it belongs to the previous year
          let year = currentYear;
          const tempDate = new Date(year, monthIndex, parseInt(day));
          const now = new Date();

          // If date is more than 6 months in future, assume last year
          if (tempDate.getTime() - now.getTime() > 180 * 24 * 60 * 60 * 1000) {
            year = currentYear - 1;
          }

          return new Date(year, monthIndex, parseInt(day));
        }
      }

      return null;
    };

    // Generate ALL dates in the range (not just dates with data)
    const generateDateRange = (start: string, end: string): string[] => {
      // Parse using local time components to match parseDate behavior
      const [startYear, startMonth, startDay] = start.split('-').map(Number);
      const [endYear, endMonth, endDay] = end.split('-').map(Number);

      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      const dates = [];

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    };

    // Get complete date range in ascending order
    const sortedDates = generateDateRange(startDate as string, endDate as string);

    // Pre-populate the map with ALL matching ESRs from the database
    baseEsrsResult.rows.forEach(record => {
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
    filteredData.forEach(record => {
      const formattedDate = formatDateForColumn(record.chlorine_date);
      dataDateSet.add(formattedDate);
    });

    console.log(`Sorted dates for export: ${sortedDates.slice(0, 5).join(', ')}...`);

    // Log sample data to understand what values we're working with
    const sampleRecords = filteredData.slice(0, 5);
    console.log('Sample chlorine records:', sampleRecords.map(r => ({
      scheme_id: r.scheme_id,
      village_name: r.village_name,
      esr_name: r.esr_name,
      chlorine_value: r.chlorine_value,
      chlorine_date: r.chlorine_date
    })));

    filteredData.forEach(record => {
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

      // Add chlorine value for the specific date
      const formattedDate = formatDateForColumn(record.chlorine_date);
      const esrData = esrMap.get(esrKey);
      if (esrData) {
        const chlorineValue = String(record.chlorine_value || '');
        // Handle string decimal values from database (numeric type comes as string)
        if (chlorineValue === '0' || chlorineValue === '0.0' || chlorineValue === '0.00') {
          esrData[formattedDate] = 0;
        } else if (chlorineValue && chlorineValue.trim() !== '') {
          const parsed = parseFloat(chlorineValue);
          esrData[formattedDate] = isNaN(parsed) ? null : parsed;
        } else {
          esrData[formattedDate] = null;
        }
      }
    });

    // Create workbook and worksheet using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Chlorine Historical Data");

    // Build header row
    const headerRow = [
      'Scheme ID', 'Scheme Name', 'Village Name', 'ESR Name',
      'Region', 'Circle', 'Division', 'Sub Division', 'Block',
      ...sortedDates
    ];

    worksheet.addRow(headerRow);

    // Add data rows
    Array.from(esrMap.values()).forEach((row: { [key: string]: any }) => {
      const dataRow = [
        row['Scheme ID'],
        row['Scheme Name'],
        row['Village Name'],
        row['ESR Name'],
        row['Region'],
        row['Circle'],
        row['Division'],
        row['Sub Division'],
        row['Block'],
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
      { width: 12 },  // Scheme ID
      { width: 25 },  // Scheme Name
      { width: 20 },  // Village Name
      { width: 20 },  // ESR Name
      { width: 15 },  // Region
      { width: 15 },  // Circle
      { width: 15 },  // Division
      { width: 18 },  // Sub Division
      { width: 15 },  // Block
      ...sortedDates.map(() => ({ width: 12 })) // Date columns
    ];

    // Generate Excel buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Set response headers for file download
    const fileName = `Chlorine_Data_${region || 'all'}_${scheme_id || 'all'}_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    console.log(`Exporting ${esrMap.size} ESRs with historical chlorine data to Excel`);

    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting chlorine historical data:", error);
    res.status(500).json({
      error: "Failed to export chlorine historical data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export detailed list to Excel
router.get("/export/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting ${statisticType} sensors to Excel for region: ${region} filterType: ${filterType || fullyCompleted}`);

    const db = await getDB();

    // Build filters array
    const filters = [];

    // Add region filter if specified
    if (region) {
      filters.push(sql`cs.region = ${region}`);
    }

    // Add scheme filter
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Return empty excel? Or handle graceful exit.
        // For simplicity, let query run with empty result condition
        filters.push(sql`1=0`);
      } else {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        filters.push(sql`cs.scheme_id IN (${sql.raw(ids)})`);
      }
    }

    // Base connected filter
    filters.push(sql`cs.chlorine_connected = 'Connected'`);

    // Add statistic-specific filters
    switch (statisticType) {
      case 'connected':
        break;
      case 'online':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        break;
      case 'online-with-water':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      case 'online-without-water':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        break;
      case 'offline':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        break;
      case 'online-with-water-chlorine-optimal':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 >= 0.2`);
        filters.push(sql`cd.chlorine_value_7 <= 0.5`);
        break;
      case 'online-with-water-chlorine-above':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 > 0.5`);
        break;
      case 'online-with-water-chlorine-below':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 < 0.2`);
        break;
      case 'online-with-water-no-chlorine-data':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        filters.push(sql`cd.chlorine_value_7 IS NULL`);
        break;
      case 'online-without-water-chlorine-optimal':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 >= 0.2`);
        filters.push(sql`cd.chlorine_value_7 <= 0.5`);
        break;
      case 'online-without-water-chlorine-above':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 > 0.5`);
        break;
      case 'online-without-water-chlorine-below':
        filters.push(sql`cs.chlorine_status = 'Online'`);
        filters.push(sql`(wc.water_value_day7 IS NULL OR CAST(wc.water_value_day7 AS text) = '0' OR CAST(wc.water_value_day7 AS text) = '0.0' OR CAST(wc.water_value_day7 AS text) = '0.00' OR wc.water_value_day7 = 0)`);
        filters.push(sql`cd.chlorine_value_7 IS NOT NULL`);
        filters.push(sql`cd.chlorine_value_7 < 0.2`);
        break;
      case 'offline-7days':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`cs.last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '7 days'`);
        break;
      case 'offline-30days':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`cs.last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '30 days'`);
        break;
      case 'offline-3days':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`cs.last_seen IS NOT NULL`);
        filters.push(sql`CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '3 days'`);
        break;
      case 'data-loss':
        filters.push(sql`cs.chlorine_status = 'Offline'`);
        filters.push(sql`wc.water_value_day7 IS NOT NULL AND wc.water_value_day7 > 0`);
        break;
      default:
        return res.status(400).json({ error: "Invalid statistic type" });
    }

    // Build the complete query with ORDER BY
    const query = sql`
      SELECT 
        cs.region,
        cs.circle,
        cs.division,
        cs.sub_division,
        cs.block,
        cs.scheme_id,
        cs.scheme_name,
        cs.village_name,
        cs.esr_name,
        cs.chlorine_connected,
        cs.chlorine_status,
        cs.chlorine_0h_72h,
        cs.chlorine_72h,
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
        cd.chlorine_value_1,
        cd.chlorine_date_day_1,
        cd.chlorine_value_2,
        cd.chlorine_date_day_2,
        cd.chlorine_value_3,
        cd.chlorine_date_day_3,
        cd.chlorine_value_4,
        cd.chlorine_date_day_4,
        cd.chlorine_value_5,
        cd.chlorine_date_day_5,
        cd.chlorine_value_6,
        cd.chlorine_date_day_6,
        cd.chlorine_value_7,
        cd.chlorine_date_day_7,
        (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_name = cs.scheme_name AND ch.village_name = cs.village_name AND ch.esr_name = cs.esr_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1) as dashboard_url
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (
        cs.region = wc.region AND
        cs.circle = wc.circle AND
        cs.division = wc.division AND
        cs.sub_division = wc.sub_division AND
        cs.block = wc.block AND
        cs.scheme_id = wc.scheme_id AND
        cs.scheme_name = wc.scheme_name AND
        cs.village_name = wc.village_name AND
        cs.esr_name = wc.esr_name
      )
      LEFT JOIN chlorine_data cd ON (
        cs.region = cd.region AND
        cs.circle = cd.circle AND
        cs.division = cd.division AND
        cs.sub_division = cd.sub_division AND
        cs.block = cd.block AND
        cs.scheme_id = cd.scheme_id AND
        cs.scheme_name = cd.scheme_name AND
        cs.village_name = cd.village_name AND
        cs.esr_name = cd.esr_name
      )
      WHERE ${sql.join(filters, sql` AND `)}
      ORDER BY cs.region, cs.scheme_name, cs.village_name, cs.esr_name
    `;

    const result = await db.execute(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No data found for export" });
    }

    // Create Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Chlorine Sensors");

    // Get actual dates from first row for headers
    const firstRow = result.rows[0] as any;
    const waterDate = firstRow.water_date_day7
      ? new Date(firstRow.water_date_day7).toISOString().split('T')[0]
      : 'Day 7';
    const chlorineDate = firstRow.chlorine_date_day_7
      ? new Date(firstRow.chlorine_date_day_7).toISOString().split('T')[0]
      : 'Day 7';

    // Add headers with actual dates
    worksheet.columns = [
      { header: 'Region', key: 'region', width: 20 },
      { header: 'Circle', key: 'circle', width: 20 },
      { header: 'Division', key: 'division', width: 20 },
      { header: 'Sub Division', key: 'sub_division', width: 20 },
      { header: 'Block', key: 'block', width: 20 },
      { header: 'Scheme ID', key: 'scheme_id', width: 15 },
      { header: 'Scheme Name', key: 'scheme_name', width: 30 },
      { header: 'Village Name', key: 'village_name', width: 25 },
      { header: 'ESR Name', key: 'esr_name', width: 25 },
      { header: 'Chlorine Status', key: 'chlorine_status', width: 15 },
      { header: `Water Value (${waterDate})`, key: 'water_value_day7', width: 25 },
      { header: `Chlorine Value (${chlorineDate})`, key: 'chlorine_value_7', width: 25 },
    ];

    // Add data rows
    // Add data rows
    result.rows.forEach((row: {
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      chlorine_status: string;
      water_value_day7: string | number | null;
      chlorine_value_7: string | number | null;
    }) => {
      worksheet.addRow({
        region: row.region,
        circle: row.circle,
        division: row.division,
        sub_division: row.sub_division,
        block: row.block,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        village_name: row.village_name,
        esr_name: row.esr_name,
        chlorine_status: row.chlorine_status,
        water_value_day7: row.water_value_day7,
        chlorine_value_7: row.chlorine_value_7,
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const regionText = region ? `_${region}` : '_All';
    const filename = `Chlorine_${statisticType}${regionText}_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting sensor details:", error);
    res.status(500).json({
      error: "Failed to export sensor details",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get single chlorine record by composite key
// NOTE: This route must come AFTER more specific routes like /overall-region-comparison/*
router.get("/:schemeId/:villageName/:esrName", async (req, res, next) => {
  try {
    const { schemeId, villageName, esrName } = req.params;

    // Skip this route if it matches patterns for other routes
    // Let Express continue to more specific routes
    if (schemeId === 'overall-region-comparison' || schemeId === 'lpcd' || schemeId === 'day-wise-breakdown' || schemeId === 'day-wise-sensors' || schemeId === 'day-wise-sensors-export' || schemeId === 'regional-stats' || schemeId === 'details' || schemeId === 'dashboard-stats' || schemeId === 'with-water-sensors' || schemeId === 'no-water-sensors' || schemeId === 'division-wise-summary' || schemeId === 'division-sensors' || schemeId === 'division-sensors-export' || schemeId === 'scheme-lpcd') {
      return next();
    }

    // URL decode parameters since they might contain spaces or special characters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);

    const chlorineData = await storage.getChlorineDataByCompositeKey(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );

    if (!chlorineData) {
      return res.status(404).json({ error: "Chlorine data not found" });
    }

    res.json(chlorineData);
  } catch (error) {
    console.error("Error getting chlorine data record:", error);
    res.status(500).json({ error: "Failed to get chlorine data record" });
  }
});

// Create new chlorine data record (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body;

    // Validate data with Zod
    const validatedData = insertChlorineDataSchema.parse(data);

    const result = await storage.createChlorineData(validatedData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error creating chlorine data:", error);
      res.status(500).json({ error: "Failed to create chlorine data" });
    }
  }
});

// Update existing chlorine data (admin only)
router.put("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const data = req.body;

    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);

    // Validate data with Zod
    const validatedData = updateChlorineDataSchema.parse(data);

    const result = await storage.updateChlorineData(
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
      console.error("Error updating chlorine data:", error);
      res.status(500).json({ error: "Failed to update chlorine data" });
    }
  }
});

// Delete chlorine data (admin only)
router.delete("/:schemeId/:villageName/:esrName", requireAdmin, async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;

    // URL decode parameters
    const decodedVillageName = decodeURIComponent(villageName);
    const decodedEsrName = decodeURIComponent(esrName);

    const success = await storage.deleteChlorineData(
      schemeId,
      decodedVillageName,
      decodedEsrName
    );

    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Chlorine data not found" });
    }
  } catch (error) {
    console.error("Error deleting chlorine data:", error);
    res.status(500).json({ error: "Failed to delete chlorine data" });
  }
});

// Import chlorine data from Excel file (admin only)
router.post("/import/excel", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await storage.importChlorineDataFromExcel(req.file.buffer);
    res.json(result);
  } catch (error) {
    console.error("Error importing chlorine data from Excel:", error);
    res.status(500).json({ error: "Failed to import chlorine data from Excel" });
  }
});

// Import chlorine data from CSV file (admin only)
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

    // Log a preview of the file content for debugging
    const filePreview = req.file.buffer.toString('utf8').substring(0, 200);
    console.log("CSV content preview:", filePreview);

    // Process CSV file with improved error handling and retry functionality
    try {
      // Use retry functionality for the import operation
      const result = await executeWithRetry(async () => {
        return storage.importChlorineDataFromCSV(req.file!.buffer);
      }, 5, 2000); // 5 retries with 2 second initial delay (with exponential backoff)

      console.log("CSV import completed successfully with retry support:", result);
      res.json(result);
    } catch (importError: any) {
      console.error("Detailed CSV import error (after retries):", importError);
      // Send detailed error to client
      res.status(500).json({
        error: "Failed to import chlorine data from CSV after multiple retry attempts",
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

// Get chlorine historical data by date range
router.get("/history", async (req, res) => {
  try {
    const { startDate, endDate, region, scheme, village } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required"
      });
    }

    console.log(`Fetching chlorine historical data from ${startDate} to ${endDate}`);

    const historicalData = await storage.getChlorineHistoricalDataByDateRange(
      startDate as string,
      endDate as string,
      region as string,
      scheme as string,
      village as string
    );

    console.log(`Returning ${historicalData.length} historical chlorine records`);
    res.json(historicalData);
  } catch (error: any) {
    console.error("Error fetching chlorine historical data:", error);
    res.status(500).json({
      error: "Failed to fetch historical chlorine data",
      details: error.message
    });
  }
});

// Get chlorine historical summary by date range
router.get("/history/summary", async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required"
      });
    }

    console.log(`Generating chlorine historical summary from ${startDate} to ${endDate}`);

    const summary = await storage.getChlorineHistoricalSummaryByDateRange(
      startDate as string,
      endDate as string,
      region as string
    );

    console.log("Historical summary generated:", summary);
    res.json(summary);
  } catch (error: any) {
    console.error("Error generating chlorine historical summary:", error);
    res.status(500).json({
      error: "Failed to generate historical summary",
      details: error.message
    });
  }
});

// Get chlorine historical data for specific ESR
router.get("/history/esr/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required"
      });
    }

    console.log(`Fetching ESR historical data for ${esrName} from ${startDate} to ${endDate}`);

    const esrHistory = await storage.getChlorineHistoricalDataForESR(
      schemeId,
      villageName,
      esrName,
      startDate as string,
      endDate as string
    );

    console.log(`Returning ${esrHistory.length} daily records for ESR ${esrName}`);
    res.json(esrHistory);
  } catch (error: any) {
    console.error("Error fetching ESR historical data:", error);
    res.status(500).json({
      error: "Failed to fetch ESR historical data",
      details: error.message
    });
  }
});

// New endpoint for filtered ESR lists (for dashboard mini-table clicks)
router.get('/esrs/filtered', async (req, res) => {
  try {
    const { region, category } = req.query;
    console.log('Filtering chlorine ESRs with:', { region, category });

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // First get sensors with water data
      const sensorsWithWaterQuery = `
        SELECT DISTINCT c.region, c.circle, c.division, c.sub_division, c.block, c.village_name, c.esr_name
        FROM chlorine_table c
        INNER JOIN water_scheme_data w ON (
          c.region = w.region AND 
          c.village_name = w.village_name AND 
          c.esr_name = w.esr_name
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

      let query = 'SELECT * FROM chlorine_table';
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
            conditions.push('chlorine_value_7 BETWEEN 0.2 AND 0.5');
            break;
          case 'above-range':
            conditions.push('chlorine_value_7 > 0.5');
            break;
          case 'below-range':
            conditions.push('(chlorine_value_7 < 0.2 OR chlorine_value_7 IS NULL)');
            break;
          case 'consistent-below':
            conditions.push(`(
              (chlorine_value_1 < 0.2 OR chlorine_value_1 IS NULL) AND
              (chlorine_value_2 < 0.2 OR chlorine_value_2 IS NULL) AND
              (chlorine_value_3 < 0.2 OR chlorine_value_3 IS NULL) AND
              (chlorine_value_4 < 0.2 OR chlorine_value_4 IS NULL) AND
              (chlorine_value_5 < 0.2 OR chlorine_value_5 IS NULL) AND
              (chlorine_value_6 < 0.2 OR chlorine_value_6 IS NULL) AND
              (chlorine_value_7 < 0.2 OR chlorine_value_7 IS NULL)
            )`);
            break;
          case 'consistent-optimal':
            conditions.push(`(
              chlorine_value_1 BETWEEN 0.2 AND 0.5 AND chlorine_value_2 BETWEEN 0.2 AND 0.5 AND
              chlorine_value_3 BETWEEN 0.2 AND 0.5 AND chlorine_value_4 BETWEEN 0.2 AND 0.5 AND
              chlorine_value_5 BETWEEN 0.2 AND 0.5 AND chlorine_value_6 BETWEEN 0.2 AND 0.5 AND
              chlorine_value_7 BETWEEN 0.2 AND 0.5
            )`);
            break;
          case 'consistent-above':
            conditions.push(`(
              chlorine_value_1 > 0.5 AND chlorine_value_2 > 0.5 AND chlorine_value_3 > 0.5 AND
              chlorine_value_4 > 0.5 AND chlorine_value_5 > 0.5 AND chlorine_value_6 > 0.5 AND chlorine_value_7 > 0.5
            )`);
            break;
        }
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY region, village_name, esr_name';

      console.log('Executing chlorine query:', query);
      const result = await client.query(query, queryParams);

      // Filter to only include sensors with water data
      const filteredData = result.rows.filter(row => {
        const key = `${row.region}|${row.circle}|${row.division}|${row.sub_division}|${row.block}|${row.village_name}|${row.esr_name}`;
        return sensorKeys.has(key);
      });

      console.log(`Found ${filteredData.length} chlorine ESRs matching criteria (with water)`);

      res.json({
        success: true,
        data: filteredData,
        count: filteredData.length,
        filters: { region, category, type: 'chlorine' }
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error('Error filtering chlorine ESRs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter chlorine ESRs',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Overall Region Comparison data for all categories
router.get("/overall-region-comparison", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // Handle no matches? 
        // For simple string replacement in query, we can put NO_MATCHES which will yield 0 results
      }
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get all distinct regions
      const regionsQuery = `SELECT DISTINCT region FROM communication_status WHERE region IS NOT NULL ORDER BY region`;
      const regionsResult = await client.query(regionsQuery);
      const regions = regionsResult.rows.map(r => r.region);

      const comparisonData: any[] = [];

      for (const region of regions) {
        // Offline/No Data sensors: (Offline status) OR (Online status AND NULL value)
        const offlineQuery = `
          SELECT COUNT(*) as count 
          FROM communication_status cs
          LEFT JOIN chlorine_data cd ON (cs.scheme_id = cd.scheme_id AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name)
          WHERE cs.region = $1 
          AND cs.chlorine_connected = 'Connected'
          AND (
            (cs.chlorine_status = 'Offline' OR cs.chlorine_status = 'offline')
            OR
            ((cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online') AND cd.chlorine_value_7 IS NULL)
          )
          ${schemeIdFilter.replace(/scheme_id/g, 'cs.scheme_id')}
        `;
        const offlineResult = await client.query(offlineQuery, [region]);
        const offline = parseInt(offlineResult.rows[0]?.count || '0');

        // Chlorine ranges from chlorine_data (Day 7)
        const chlorineQuery = `
          SELECT 
            SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 < 0.2 THEN 1 ELSE 0 END) as below_0_2,
            SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5 THEN 1 ELSE 0 END) as optimal_0_2_0_5,
            SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 > 0.5 THEN 1 ELSE 0 END) as above_0_5
          FROM chlorine_data
          WHERE region = $1
          ${schemeIdFilter}
        `;
        const chlorineResult = await client.query(chlorineQuery, [region]);
        const chlorineRow = chlorineResult.rows[0] || {};

        // Consistent chlorine ranges (all 7 days fall in range)
        const consistentChlorineQuery = `
          SELECT 
            SUM(CASE WHEN 
              chlorine_value_1 IS NOT NULL AND chlorine_value_1 < 0.2 AND
              chlorine_value_2 IS NOT NULL AND chlorine_value_2 < 0.2 AND
              chlorine_value_3 IS NOT NULL AND chlorine_value_3 < 0.2 AND
              chlorine_value_4 IS NOT NULL AND chlorine_value_4 < 0.2 AND
              chlorine_value_5 IS NOT NULL AND chlorine_value_5 < 0.2 AND
              chlorine_value_6 IS NOT NULL AND chlorine_value_6 < 0.2 AND
              chlorine_value_7 IS NOT NULL AND chlorine_value_7 < 0.2
            THEN 1 ELSE 0 END) as consistent_below_0_2,
            SUM(CASE WHEN 
              chlorine_value_1 IS NOT NULL AND chlorine_value_1 >= 0.2 AND chlorine_value_1 <= 0.5 AND
              chlorine_value_2 IS NOT NULL AND chlorine_value_2 >= 0.2 AND chlorine_value_2 <= 0.5 AND
              chlorine_value_3 IS NOT NULL AND chlorine_value_3 >= 0.2 AND chlorine_value_3 <= 0.5 AND
              chlorine_value_4 IS NOT NULL AND chlorine_value_4 >= 0.2 AND chlorine_value_4 <= 0.5 AND
              chlorine_value_5 IS NOT NULL AND chlorine_value_5 >= 0.2 AND chlorine_value_5 <= 0.5 AND
              chlorine_value_6 IS NOT NULL AND chlorine_value_6 >= 0.2 AND chlorine_value_6 <= 0.5 AND
              chlorine_value_7 IS NOT NULL AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5
            THEN 1 ELSE 0 END) as consistent_optimal,
            SUM(CASE WHEN 
              chlorine_value_1 IS NOT NULL AND chlorine_value_1 > 0.5 AND
              chlorine_value_2 IS NOT NULL AND chlorine_value_2 > 0.5 AND
              chlorine_value_3 IS NOT NULL AND chlorine_value_3 > 0.5 AND
              chlorine_value_4 IS NOT NULL AND chlorine_value_4 > 0.5 AND
              chlorine_value_5 IS NOT NULL AND chlorine_value_5 > 0.5 AND
              chlorine_value_6 IS NOT NULL AND chlorine_value_6 > 0.5 AND
              chlorine_value_7 IS NOT NULL AND chlorine_value_7 > 0.5
            THEN 1 ELSE 0 END) as consistent_above_0_5
          FROM chlorine_data
          WHERE region = $1
          ${schemeIdFilter}
        `;
        const consistentChlorineResult = await client.query(consistentChlorineQuery, [region]);
        const consistentChlorineRow = consistentChlorineResult.rows[0] || {};

        // LPCD ranges from water_scheme_data (Day 7)
        const lpcdQuery = `
          SELECT 
            SUM(CASE WHEN lpcd_value_day7 IS NOT NULL AND lpcd_value_day7 >= 55 THEN 1 ELSE 0 END) as above_55,
            SUM(CASE WHEN lpcd_value_day7 IS NOT NULL AND lpcd_value_day7::numeric > 0 AND lpcd_value_day7::numeric < 55 THEN 1 ELSE 0 END) as below_55,
            SUM(CASE WHEN lpcd_value_day7 IS NULL OR lpcd_value_day7::numeric = 0 THEN 1 ELSE 0 END) as no_water
          FROM (
            SELECT DISTINCT ON (scheme_id, village_name, block) *
            FROM water_scheme_data
            WHERE region = $1
            ${schemeIdFilter}
            ORDER BY scheme_id, village_name, block
          ) t
        `;
        const lpcdResult = await client.query(lpcdQuery, [region]);
        const lpcdRow = lpcdResult.rows[0] || {};

        // Consistent LPCD ranges (all 7 days fall in range)
        const consistentLpcdQuery = `
          SELECT 
            SUM(CASE WHEN 
              lpcd_value_day1 IS NOT NULL AND lpcd_value_day1 >= 55 AND
              lpcd_value_day2 IS NOT NULL AND lpcd_value_day2 >= 55 AND
              lpcd_value_day3 IS NOT NULL AND lpcd_value_day3 >= 55 AND
              lpcd_value_day4 IS NOT NULL AND lpcd_value_day4 >= 55 AND
              lpcd_value_day5 IS NOT NULL AND lpcd_value_day5 >= 55 AND
              lpcd_value_day6 IS NOT NULL AND lpcd_value_day6 >= 55 AND
              lpcd_value_day7 IS NOT NULL AND lpcd_value_day7 >= 55
            THEN 1 ELSE 0 END) as consistent_above_55,
            SUM(CASE WHEN 
              lpcd_value_day1 IS NOT NULL AND lpcd_value_day1::numeric > 0 AND lpcd_value_day1::numeric < 55 AND
              lpcd_value_day2 IS NOT NULL AND lpcd_value_day2::numeric > 0 AND lpcd_value_day2::numeric < 55 AND
              lpcd_value_day3 IS NOT NULL AND lpcd_value_day3::numeric > 0 AND lpcd_value_day3::numeric < 55 AND
              lpcd_value_day4 IS NOT NULL AND lpcd_value_day4::numeric > 0 AND lpcd_value_day4::numeric < 55 AND
              lpcd_value_day5 IS NOT NULL AND lpcd_value_day5::numeric > 0 AND lpcd_value_day5::numeric < 55 AND
              lpcd_value_day6 IS NOT NULL AND lpcd_value_day6::numeric > 0 AND lpcd_value_day6::numeric < 55 AND
              lpcd_value_day7 IS NOT NULL AND lpcd_value_day7::numeric > 0 AND lpcd_value_day7::numeric < 55
            THEN 1 ELSE 0 END) as consistent_below_55,
            SUM(CASE WHEN 
              (lpcd_value_day1 IS NULL OR lpcd_value_day1::numeric = 0) AND
              (lpcd_value_day2 IS NULL OR lpcd_value_day2::numeric = 0) AND
              (lpcd_value_day3 IS NULL OR lpcd_value_day3::numeric = 0) AND
              (lpcd_value_day4 IS NULL OR lpcd_value_day4::numeric = 0) AND
              (lpcd_value_day5 IS NULL OR lpcd_value_day5::numeric = 0) AND
              (lpcd_value_day6 IS NULL OR lpcd_value_day6::numeric = 0) AND
              (lpcd_value_day7 IS NULL OR lpcd_value_day7::numeric = 0)
            THEN 1 ELSE 0 END) as consistent_no_water
          FROM (
            SELECT DISTINCT ON (scheme_id, village_name, block) *
            FROM water_scheme_data
            WHERE region = $1
            ORDER BY scheme_id, village_name, block
          ) t
        `;
        const consistentLpcdResult = await client.query(consistentLpcdQuery, [region]);
        const consistentLpcdRow = consistentLpcdResult.rows[0] || {};

        comparisonData.push({
          region,
          offline: offline,
          below_0_2: Number(chlorineRow.below_0_2 || 0),
          optimal_0_2_0_5: Number(chlorineRow.optimal_0_2_0_5 || 0),
          above_0_5: Number(chlorineRow.above_0_5 || 0),
          consistent_below_0_2: Number(consistentChlorineRow.consistent_below_0_2 || 0),
          consistent_optimal: Number(consistentChlorineRow.consistent_optimal || 0),
          consistent_above_0_5: Number(consistentChlorineRow.consistent_above_0_5 || 0),
          above_55: Number(lpcdRow.above_55 || 0),
          below_55: Number(lpcdRow.below_55 || 0),
          no_water: Number(lpcdRow.no_water || 0),
          consistent_above_55: Number(consistentLpcdRow.consistent_above_55 || 0),
          consistent_below_55: Number(consistentLpcdRow.consistent_below_55 || 0),
          consistent_no_water: Number(consistentLpcdRow.consistent_no_water || 0),
        });
      }

      res.json({
        success: true,
        data: comparisonData
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching overall region comparison:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch overall region comparison",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get detailed list for overall region comparison category
router.get("/overall-region-comparison/details/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, dates, fullyCompleted, filterType } = req.query; // Add filterType
    console.log(`[DEBUG Details] Category: ${category}, Region: ${region}, FilterType: ${filterType || fullyCompleted}, Dates: ${dates}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      let query = '';
      const params: any[] = [];

      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
      let schemeIdFilterGeneric = "";

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // Handle no matches by returning empty result immediately
          return res.json({ success: true, data: [], count: 0 });
        }
        console.log(`[DEBUG Details] Applied filter with ${filteredIds.length} scheme IDs`);
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilterGeneric = `AND scheme_id IN (${ids})`;
      } else {
        console.log(`[DEBUG Details] No filter applied (filteredIds is null/undefined)`);
      }

      if (category.startsWith('weekly_')) {
        if (!dates) {
          return res.status(400).json({ success: false, error: "Dates required for weekly comparison" });
        }
        const dateList = (dates as string).split(',');
        const metric = category.replace('weekly_', '');

        let havingCondition = '1=1';
        if (metric === 'above_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) >= 55';
        } else if (metric === 'below_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) > 0 AND (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) < 55';
        } else if (metric === 'no_water') {
          havingCondition = '((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) IS NULL OR (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) = 0)';
        }

        let paramIndex = 1;
        const regionFilter = region ? `AND region = $${paramIndex++}` : '';
        if (region) params.push(region);

        const dateParams = dateList.map((_, i) => `$${paramIndex++}`).join(',');
        params.push(...dateList);

        // We need to fetch details similar to other cases but aggregated
        query = `
            WITH weekly_data AS (
                SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
                    region, circle, division, sub_division, block,
                    scheme_id, scheme_name, village_name, population,
                    lpcd_value, data_date, dashboard_url
                FROM water_scheme_data_history
                WHERE region IS NOT NULL
                ${regionFilter}
                ${schemeIdFilterGeneric}
                AND (
                    data_date IN (${dateParams})
                )
                ORDER BY scheme_id, village_name, block, data_date, uploaded_at DESC
            )
            SELECT
                region, MAX(circle) as circle, MAX(division) as division, MAX(sub_division) as sub_division, block,
                scheme_id, MAX(scheme_name) as scheme_name, MAX(village_name) as village_name, MAX(population) as population,
                ROUND((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0), 2) as lpcd_value,
                MAX(data_date) as lpcd_date,
                MAX(dashboard_url) as dashboard_url,
                NULL as water_value_day7, -- placeholder
                NULL as water_date_day7 -- placeholder
            FROM weekly_data
            GROUP BY region, scheme_id, block, village_name
            HAVING ${havingCondition}
            ORDER BY region, MAX(division), village_name
          `;
      } else {
        switch (category) {
          case 'offline':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (cs.scheme_id, cs.village_name, cs.esr_name)
                cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
                cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name,
                cs.chlorine_status, cs.last_seen,
                cd.dashboard_url
              FROM communication_status cs
              LEFT JOIN chlorine_data cd ON cs.scheme_id = cd.scheme_id AND cs.scheme_name = cd.scheme_name AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name
              WHERE cs.chlorine_connected = 'Connected'
              AND (
                (cs.chlorine_status = 'Offline' OR cs.chlorine_status = 'offline')
                OR
                ((cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online') AND cd.chlorine_value_7 IS NULL)
              )
              ${region ? 'AND cs.region = $1' : ''}
              ${schemeIdFilterGeneric.replace(/scheme_id/g, 'cs.scheme_id')}
              ORDER BY cs.scheme_id, cs.village_name, cs.esr_name
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'below_0_2':
          case 'optimal_0_2_0_5':
          case 'above_0_5':
            const subCondition = category === 'below_0_2' 
              ? 'cd.chlorine_value_7 < 0.2' 
              : category === 'optimal_0_2_0_5' 
                ? 'cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5' 
                : 'cd.chlorine_value_7 > 0.5';
            query = `
              SELECT * FROM (
                SELECT DISTINCT ON (cd.scheme_id, cd.village_name, cd.esr_name)
                  cd.region, cd.circle, cd.division, cd.sub_division, cd.block,
                  cd.scheme_id, cd.scheme_name, cd.village_name, cd.esr_name,
                  cd.chlorine_value_7 as chlorine_value, cd.chlorine_date_day_7 as chlorine_date,
                  cd.dashboard_url
                FROM chlorine_data cd
                WHERE cd.chlorine_value_7 IS NOT NULL AND ${subCondition}
                ${region ? 'AND cd.region = $1' : ''}
                ${schemeIdFilterGeneric.replace('scheme_id', 'cd.scheme_id')}
                ORDER BY cd.scheme_id, cd.village_name, cd.esr_name
              ) as t
              ORDER BY region, division, village_name
            `;
            if (region) params.push(region);
            break;

          case 'consistent_below_0_2':
          case 'consistent_optimal':
          case 'consistent_above_0_5':
            const consistentCondition = category === 'consistent_below_0_2'
              ? 'cd.chlorine_value_1 < 0.2 AND cd.chlorine_value_2 < 0.2 AND cd.chlorine_value_3 < 0.2 AND cd.chlorine_value_4 < 0.2 AND cd.chlorine_value_5 < 0.2 AND cd.chlorine_value_6 < 0.2 AND cd.chlorine_value_7 < 0.2'
              : category === 'consistent_optimal'
                ? 'cd.chlorine_value_1 >= 0.2 AND cd.chlorine_value_1 <= 0.5 AND cd.chlorine_value_2 >= 0.2 AND cd.chlorine_value_2 <= 0.5 AND cd.chlorine_value_3 >= 0.2 AND cd.chlorine_value_3 <= 0.5 AND cd.chlorine_value_4 >= 0.2 AND cd.chlorine_value_4 <= 0.5 AND cd.chlorine_value_5 >= 0.2 AND cd.chlorine_value_5 <= 0.5 AND cd.chlorine_value_6 >= 0.2 AND cd.chlorine_value_6 <= 0.5 AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5'
                : 'cd.chlorine_value_1 > 0.5 AND cd.chlorine_value_2 > 0.5 AND cd.chlorine_value_3 > 0.5 AND cd.chlorine_value_4 > 0.5 AND cd.chlorine_value_5 > 0.5 AND cd.chlorine_value_6 > 0.5 AND cd.chlorine_value_7 > 0.5';
            query = `
              SELECT * FROM (
                SELECT DISTINCT ON (cd.scheme_id, cd.village_name, cd.esr_name)
                  cd.region, cd.circle, cd.division, cd.sub_division, cd.block,
                  cd.scheme_id, cd.scheme_name, cd.village_name, cd.esr_name,
                  cd.chlorine_value_7 as chlorine_value, cd.chlorine_date_day_7 as chlorine_date,
                  cd.dashboard_url
                FROM chlorine_data cd
                WHERE cd.chlorine_value_1 IS NOT NULL AND ${consistentCondition}
                ${region ? 'AND cd.region = $1' : ''}
                ${schemeIdFilterGeneric.replace('scheme_id', 'cd.scheme_id')}
                ORDER BY cd.scheme_id, cd.village_name, cd.esr_name
              ) as t
              ORDER BY region, division, village_name
            `;
            if (region) params.push(region);
            break;

          case 'all_sensors':
            query = `
            SELECT 
              COALESCE(cs.region, cd.region) as region, 
              COALESCE(cs.circle, cd.circle) as circle, 
              COALESCE(cs.division, cd.division) as division, 
              COALESCE(cs.sub_division, cd.sub_division) as sub_division, 
              COALESCE(cs.block, cd.block) as block,
              COALESCE(cs.scheme_id, cd.scheme_id) as scheme_id, 
              COALESCE(cs.scheme_name, cd.scheme_name) as scheme_name, 
              COALESCE(cs.village_name, cd.village_name) as village_name, 
              COALESCE(cs.esr_name, cd.esr_name) as esr_name,
              cs.chlorine_status,
              cd.chlorine_value_7 as chlorine_value,
              cd.chlorine_date_day_7 as chlorine_date,
              cd.dashboard_url
            FROM communication_status cs
            FULL OUTER JOIN chlorine_data cd ON cs.scheme_id = cd.scheme_id AND cs.scheme_name = cd.scheme_name AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name
            WHERE ((cs.chlorine_connected = 'Connected' AND (cs.chlorine_status = 'Offline' OR cs.chlorine_status = 'offline' OR cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online'))
               OR (cd.chlorine_value_7 IS NOT NULL))
            ${region ? 'AND COALESCE(cs.region, cd.region) = $1' : ''}
            ${schemeIdFilterGeneric.replace(/scheme_id/g, 'COALESCE(cs.scheme_id, cd.scheme_id)')}
            ORDER BY COALESCE(cs.region, cd.region), COALESCE(cs.division, cd.division), COALESCE(cs.village_name, cd.village_name)
          `;
            if (region) params.push(region);
            break;

          case 'above_55':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7 >= 55
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block, ws.lpcd_value_day7 DESC NULLS LAST
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'below_55':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                ws.dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 AND ws.lpcd_value_day7::numeric < 55
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block, ws.lpcd_value_day7 DESC NULLS LAST
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'consistent_above_55':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                ws.dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day1 IS NOT NULL AND ws.lpcd_value_day1 >= 55
                AND ws.lpcd_value_day2 IS NOT NULL AND ws.lpcd_value_day2 >= 55
                AND ws.lpcd_value_day3 IS NOT NULL AND ws.lpcd_value_day3 >= 55
                AND ws.lpcd_value_day4 IS NOT NULL AND ws.lpcd_value_day4 >= 55
                AND ws.lpcd_value_day5 IS NOT NULL AND ws.lpcd_value_day5 >= 55
                AND ws.lpcd_value_day6 IS NOT NULL AND ws.lpcd_value_day6 >= 55
                AND ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7 >= 55
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block, ws.lpcd_value_day7 DESC NULLS LAST
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'consistent_below_55':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                ws.dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day1 IS NOT NULL AND ws.lpcd_value_day1::numeric > 0 AND ws.lpcd_value_day1::numeric < 55
                AND ws.lpcd_value_day2 IS NOT NULL AND ws.lpcd_value_day2::numeric > 0 AND ws.lpcd_value_day2::numeric < 55
                AND ws.lpcd_value_day3 IS NOT NULL AND ws.lpcd_value_day3::numeric > 0 AND ws.lpcd_value_day3::numeric < 55
                AND ws.lpcd_value_day4 IS NOT NULL AND ws.lpcd_value_day4::numeric > 0 AND ws.lpcd_value_day4::numeric < 55
                AND ws.lpcd_value_day5 IS NOT NULL AND ws.lpcd_value_day5::numeric > 0 AND ws.lpcd_value_day5::numeric < 55
                AND ws.lpcd_value_day6 IS NOT NULL AND ws.lpcd_value_day6::numeric > 0 AND ws.lpcd_value_day6::numeric < 55
                AND ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 AND ws.lpcd_value_day7::numeric < 55
              ${region ? 'AND ws.region = $1' : ''}
              ORDER BY ws.scheme_id, ws.village_name, ws.block, ws.lpcd_value_day7 DESC NULLS LAST
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'no_water':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                ws.dashboard_url
              FROM water_scheme_data ws
              WHERE (ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7 = 0)
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block, ws.uploaded_at DESC NULLS LAST
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'all_villages':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.region IS NOT NULL
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;
            if (region) params.push(region);
            break;

          case 'consistent_no_water':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                ws.dashboard_url
              FROM water_scheme_data ws
              WHERE (ws.lpcd_value_day1 IS NULL OR ws.lpcd_value_day1 = 0)
                AND (ws.lpcd_value_day2 IS NULL OR ws.lpcd_value_day2 = 0)
                AND (ws.lpcd_value_day3 IS NULL OR ws.lpcd_value_day3 = 0)
                AND (ws.lpcd_value_day4 IS NULL OR ws.lpcd_value_day4 = 0)
                AND (ws.lpcd_value_day5 IS NULL OR ws.lpcd_value_day5 = 0)
                AND (ws.lpcd_value_day6 IS NULL OR ws.lpcd_value_day6 = 0)
                AND (ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7 = 0)
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block, ws.uploaded_at DESC NULLS LAST
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'consistent_all':
            query = `
            SELECT 
              cd.region, cd.circle, cd.division, cd.sub_division, cd.block,
              cd.scheme_id, cd.scheme_name, cd.village_name, cd.esr_name,
              cd.chlorine_value_7 as chlorine_value, cd.chlorine_date_day_7 as chlorine_date,
              cd.dashboard_url
            FROM chlorine_data cd
            WHERE (
              -- Consistent Below 0.2
              (
                cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 < 0.2
                AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 < 0.2
                AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 < 0.2
                AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 < 0.2
                AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 < 0.2
                AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 < 0.2
                AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2
              )
              OR
              -- Consistent Optimal
              (
                cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 >= 0.2 AND cd.chlorine_value_1 <= 0.5
                AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 >= 0.2 AND cd.chlorine_value_2 <= 0.5
                AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 >= 0.2 AND cd.chlorine_value_3 <= 0.5
                AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 >= 0.2 AND cd.chlorine_value_4 <= 0.5
                AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 >= 0.2 AND cd.chlorine_value_5 <= 0.5
                AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 >= 0.2 AND cd.chlorine_value_6 <= 0.5
                AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5
              )
              OR
              -- Consistent Above 0.5
              (
                cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 > 0.5
                AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 > 0.5
                AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 > 0.5
                AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 > 0.5
                AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 > 0.5
                AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 > 0.5
                AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5
              )
            )
            ${region ? 'AND cd.region = $1' : ''}
            ${schemeIdFilterGeneric.replace('scheme_id', 'cd.scheme_id')}
            ORDER BY cd.region, cd.division, cd.village_name
          `;
            if (region) params.push(region);
            break;

          default:
            return res.status(400).json({ error: 'Invalid category' });
        } // end switch
      } // end else

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        category,
        region: region || 'all'
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching category details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch category details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export overall region comparison details to Excel
router.get("/overall-region-comparison/export/:category", async (req, res) => {
  try {
    const { category } = req.params;
    let { region, dates, fullyCompleted, filterType } = req.query; // Add filterType

    // Sanitize region if it equals "All Regions"
    if (region === 'All Regions') {
      region = undefined;
    }

    console.log(`Exporting region comparison details for category: ${category}, region: ${region}, dates: ${dates}, filterType: ${filterType || fullyCompleted}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();
    const workbook = new ExcelJS.Workbook();

    try {
      let query = '';
      let params: any[] = [];

      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
      let schemeIdFilterGeneric = "";

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // Handle no matches by returning empty result immediately
          const worksheet = workbook.addWorksheet('Details');
          worksheet.columns = [{ header: 'Message', key: 'message', width: 30 }];
          worksheet.addRow({ message: 'No data matches the selected filters.' });
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename=chlorine-details-export.xlsx`);
          await workbook.xlsx.write(res);
          res.end();
          return;
        }
        console.log(`[DEBUG Export] Applied filter with ${filteredIds.length} scheme IDs`);
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilterGeneric = `AND scheme_id IN (${ids})`;
      } else {
        console.log(`[DEBUG Export] No filter applied (filteredIds is null/undefined)`);
      }

      let isLpcdCategory = ['above_55', 'below_55', 'consistent_above_55', 'consistent_below_55', 'no_water', 'all_villages', 'consistent_no_water'].includes(category) || category.startsWith('weekly_');

      if (category.startsWith('weekly_')) {
        if (!dates) {
          return res.status(400).json({ success: false, error: "Dates required for weekly comparison export" });
        }
        const dateList = (dates as string).split(',');
        const metric = category.replace('weekly_', '');

        let havingCondition = '';
        if (metric === 'above_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) >= 55';
        } else if (metric === 'below_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) > 0 AND (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) < 55';
        } else if (metric === 'no_water') {
          havingCondition = '((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) IS NULL OR (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) = 0)';
        }

        let paramIndex = 1;
        const regionFilter = region ? `AND region = $${paramIndex++}` : '';
        if (region) params.push(region);

        const dateParams = dateList.map((_, i) => `$${paramIndex++}`).join(',');
        params.push(...dateList);

        // Use water_scheme_data_history for weekly
        query = `
            WITH weekly_data AS (
                SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
                    region, circle, division, sub_division, block,
                    scheme_id, scheme_name, village_name, population,
                    lpcd_value, data_date, dashboard_url
                FROM water_scheme_data_history
                WHERE region IS NOT NULL
                ${regionFilter}
                ${schemeIdFilterGeneric}
                AND (
                    data_date IN (${dateParams})
                    OR
                    TO_CHAR(TO_DATE(CASE 
                       WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                       ELSE '01-Jan-2000'
                    END, 'DD-Mon-YY'), 'DD-Mon') IN (${dateParams})
                )
                ORDER BY scheme_id, village_name, block, data_date, uploaded_at DESC
            )
            SELECT
                region, MAX(circle) as circle, MAX(division) as division, MAX(sub_division) as sub_division, block,
                scheme_id, MAX(scheme_name) as scheme_name, MAX(village_name) as village_name, MAX(population) as population,
                ROUND((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0), 2) as lpcd_value,
                MAX(data_date) as lpcd_date,
                MAX(dashboard_url) as dashboard_url,
                NULL as water_value_day7 -- placeholder
            FROM weekly_data
            GROUP BY region, scheme_id, block, village_name
            HAVING ${havingCondition}
            ORDER BY region, MAX(division), village_name
          `;
      } else {
        switch (category) {
          case 'all_sensors':
            query = `
            SELECT 
              COALESCE(cs.region, cd.region) as region, 
              COALESCE(cs.circle, cd.circle) as circle, 
              COALESCE(cs.division, cd.division) as division, 
              COALESCE(cs.sub_division, cd.sub_division) as sub_division, 
              COALESCE(cs.block, cd.block) as block,
              COALESCE(cs.scheme_id, cd.scheme_id) as scheme_id, 
              COALESCE(cs.scheme_name, cd.scheme_name) as scheme_name, 
              COALESCE(cs.village_name, cd.village_name) as village_name, 
              COALESCE(cs.esr_name, cd.esr_name) as esr_name,
              cs.chlorine_status,
              cd.chlorine_value_7 as chlorine_value,
              cd.chlorine_date_day_7 as chlorine_date,
              cd.dashboard_url
            FROM communication_status cs
            FULL OUTER JOIN chlorine_data cd ON cs.scheme_id = cd.scheme_id AND cs.scheme_name = cd.scheme_name AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name
            WHERE ((cs.chlorine_connected = 'Connected' AND (cs.chlorine_status = 'Offline' OR cs.chlorine_status = 'offline' OR cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online'))
               OR (cd.chlorine_value_7 IS NOT NULL))
            ${region ? 'AND COALESCE(cs.region, cd.region) = $1' : ''}
            ${schemeIdFilterGeneric.replace(/scheme_id/g, 'COALESCE(cs.scheme_id, cd.scheme_id)')}
            ORDER BY COALESCE(cs.region, cd.region), COALESCE(cs.division, cd.division), COALESCE(cs.village_name, cd.village_name)
          `;
            if (region) params.push(region);
            break;

          case 'offline':
            query = `
            SELECT 
              cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
              cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name,
              cs.chlorine_status, cs.last_seen,
              cd.dashboard_url
            FROM communication_status cs
            LEFT JOIN chlorine_data cd ON cs.scheme_id = cd.scheme_id AND cs.scheme_name = cd.scheme_name AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name
            WHERE cs.chlorine_connected = 'Connected'
            AND (
              (cs.chlorine_status = 'Offline' OR cs.chlorine_status = 'offline')
              OR
              ((cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online') AND cd.chlorine_value_7 IS NULL)
            )
            ${region ? 'AND cs.region = $1' : ''}
            ${schemeIdFilterGeneric.replace('scheme_id', 'cs.scheme_id')}
            ORDER BY cs.region, cs.division, cs.village_name
          `;
            if (region) params.push(region);
            break;

          case 'below_0_2':
          case 'optimal_0_2_0_5':
          case 'above_0_5':
          case 'consistent_below_0_2':
          case 'consistent_optimal':
          case 'consistent_above_0_5':
            const chlorineCondition = getChlorineCondition(category);
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (cd.scheme_id, cd.village_name, cd.esr_name)
                cd.region, cd.circle, cd.division, cd.sub_division, cd.block,
                cd.scheme_id, cd.scheme_name, cd.village_name, cd.esr_name,
                cd.chlorine_value_7 as chlorine_value, cd.chlorine_date_day_7 as chlorine_date,
                cd.dashboard_url
              FROM chlorine_data cd
              WHERE ${chlorineCondition}
              ${region ? 'AND cd.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'cd.scheme_id')}
              ORDER BY cd.scheme_id, cd.village_name, cd.esr_name
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'above_55':
          case 'below_55':
          case 'consistent_above_55':
          case 'consistent_below_55':
          case 'no_water':
            const lpcdCondition = getLpcdCondition(category);
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1) as dashboard_url
              FROM water_scheme_data ws
              WHERE ${lpcdCondition}
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'all_villages':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.region IS NOT NULL
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'consistent_no_water':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7 as lpcd_value, ws.lpcd_date_day7 as lpcd_date,
                ws.water_value_day7, ws.water_date_day7,
                (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1) as dashboard_url
              FROM water_scheme_data ws
              WHERE (ws.lpcd_value_day1 IS NULL OR ws.lpcd_value_day1 = 0)
                AND (ws.lpcd_value_day2 IS NULL OR ws.lpcd_value_day2 = 0)
                AND (ws.lpcd_value_day3 IS NULL OR ws.lpcd_value_day3 = 0)
                AND (ws.lpcd_value_day4 IS NULL OR ws.lpcd_value_day4 = 0)
                AND (ws.lpcd_value_day5 IS NULL OR ws.lpcd_value_day5 = 0)
                AND (ws.lpcd_value_day6 IS NULL OR ws.lpcd_value_day6 = 0)
                AND (ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7 = 0)
              ${region ? 'AND ws.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'ws.scheme_id')}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          case 'consistent_all':
            query = `
            SELECT * FROM (
              SELECT DISTINCT ON (cd.scheme_id, cd.village_name, cd.esr_name)
                cd.region, cd.circle, cd.division, cd.sub_division, cd.block,
                cd.scheme_id, cd.scheme_name, cd.village_name, cd.esr_name,
                cd.chlorine_value_7 as chlorine_value, cd.chlorine_date_day_7 as chlorine_date,
                cd.dashboard_url
              FROM chlorine_data cd
              WHERE (
                -- Consistent Below 0.2
                (
                  cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 < 0.2
                  AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 < 0.2
                  AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 < 0.2
                  AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 < 0.2
                  AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 < 0.2
                  AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 < 0.2
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2
                )
                OR
                -- Consistent Optimal
                (
                  cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 >= 0.2 AND cd.chlorine_value_1 <= 0.5
                  AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 >= 0.2 AND cd.chlorine_value_2 <= 0.5
                  AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 >= 0.2 AND cd.chlorine_value_3 <= 0.5
                  AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 >= 0.2 AND cd.chlorine_value_4 <= 0.5
                  AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 >= 0.2 AND cd.chlorine_value_5 <= 0.5
                  AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 >= 0.2 AND cd.chlorine_value_6 <= 0.5
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5
                )
                OR
                -- Consistent Above 0.5
                (
                  cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 > 0.5
                  AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 > 0.5
                  AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 > 0.5
                  AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 > 0.5
                  AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 > 0.5
                  AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 > 0.5
                  AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5
                )
              )
              ${region ? 'AND cd.region = $1' : ''}
              ${schemeIdFilterGeneric.replace('scheme_id', 'cd.scheme_id')}
              ORDER BY cd.scheme_id, cd.village_name, cd.esr_name
            ) as t
            ORDER BY region, division, village_name
          `;
            if (region) params.push(region);
            break;

          default:
            return res.status(400).json({ error: 'Invalid category' });
        }
      }

      const result = await client.query(query, params);


      const worksheet = workbook.addWorksheet('Region Comparison Details');

      // Define category label
      const categoryLabels: { [key: string]: string } = {
        'offline': 'Offline Sensors',
        'below_0_2': 'Chlorine <0.2 mg/l',
        'optimal_0_2_0_5': 'Chlorine 0.2-0.5 mg/l (Optimal)',
        'above_0_5': 'Chlorine >0.5 mg/l',
        'consistent_below_0_2': 'Consistent <0.2 mg/l (7 days)',
        'consistent_optimal': 'Consistent 0.2-0.5 mg/l (7 days)',
        'consistent_above_0_5': 'Consistent >0.5 mg/l (7 days)',
        'above_55': 'Villages >55 LPCD',
        'below_55': 'Villages <55 LPCD',
        'no_water': 'Villages with No Water',
        'all_villages': 'All Villages (Total)',
        'consistent_above_55': 'Consistent >55 LPCD (7 days)',
        'consistent_below_55': 'Consistent <55 LPCD (7 days)',
        'weekly_above_55': 'Weekly Avg >55 LPCD',
        'weekly_below_55': 'Weekly Avg <55 LPCD',
        'weekly_no_water': 'Weekly Avg No Water',
      };

      // Set columns based on category type
      if (isLpcdCategory) {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 20 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'Population', key: 'population', width: 15 },
          { header: 'LPCD Value', key: 'lpcd_value', width: 15 },
          { header: 'LPCD Date', key: 'lpcd_date', width: 18 },
          { header: 'Dashboard Link', key: 'dashboard_url', width: 40 },
        ];
      } else if (category === 'offline') {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 20 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'ESR Name', key: 'esr_name', width: 25 },
          { header: 'Status', key: 'chlorine_status', width: 15 },
          { header: 'Last Seen', key: 'last_seen', width: 22 },
          { header: 'Dashboard Link', key: 'dashboard_url', width: 40 },
        ];
      } else if (category === 'all_sensors') {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 20 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'ESR Name', key: 'esr_name', width: 25 },
          { header: 'Status', key: 'chlorine_status', width: 15 },
          { header: 'Chlorine (mg/l)', key: 'chlorine_value', width: 18 },
          { header: 'Chlorine Date', key: 'chlorine_date', width: 18 },
          { header: 'Dashboard Link', key: 'dashboard_url', width: 40 },
        ];
      } else {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 20 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'ESR Name', key: 'esr_name', width: 25 },
          { header: 'Chlorine (mg/l)', key: 'chlorine_value', width: 18 },
          { header: 'Chlorine Date', key: 'chlorine_date', width: 18 },
          { header: 'Dashboard Link', key: 'dashboard_url', width: 40 },
        ];
      }

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add data rows
      result.rows.forEach((row) => {
        if (isLpcdCategory) {
          worksheet.addRow({
            region: row.region,
            circle: row.circle,
            division: row.division,
            sub_division: row.sub_division,
            block: row.block,
            scheme_id: row.scheme_id,
            scheme_name: row.scheme_name,
            village_name: row.village_name,
            population: row.population,
            lpcd_value: row.lpcd_value !== null ? Number(row.lpcd_value).toFixed(2) : 'N/A',
            lpcd_date: row.lpcd_date || 'N/A',
            dashboard_url: row.dashboard_url || 'N/A',
          });
        } else if (category === 'offline') {
          worksheet.addRow({
            region: row.region,
            circle: row.circle,
            division: row.division,
            sub_division: row.sub_division,
            block: row.block,
            scheme_id: row.scheme_id,
            scheme_name: row.scheme_name,
            village_name: row.village_name,
            esr_name: row.esr_name,
            chlorine_status: row.chlorine_status,
            last_seen: row.last_seen || 'N/A',
            dashboard_url: row.dashboard_url || 'N/A',
          });
        } else if (category === 'all_sensors') {
          worksheet.addRow({
            region: row.region,
            circle: row.circle,
            division: row.division,
            sub_division: row.sub_division,
            block: row.block,
            scheme_id: row.scheme_id,
            scheme_name: row.scheme_name,
            village_name: row.village_name,
            esr_name: row.esr_name,
            chlorine_status: row.chlorine_status,
            chlorine_value: row.chlorine_value !== null ? Number(row.chlorine_value).toFixed(2) : 'N/A',
            chlorine_date: row.chlorine_date || 'N/A',
            dashboard_url: row.dashboard_url || 'N/A',
          });
        } else {
          worksheet.addRow({
            region: row.region,
            circle: row.circle,
            division: row.division,
            sub_division: row.sub_division,
            block: row.block,
            scheme_id: row.scheme_id,
            scheme_name: row.scheme_name,
            village_name: row.village_name,
            esr_name: row.esr_name,
            chlorine_value: row.chlorine_value !== null ? Number(row.chlorine_value).toFixed(2) : 'N/A',
            chlorine_date: row.chlorine_date || 'N/A',
            dashboard_url: row.dashboard_url || 'N/A',
          });
        }
      });

      // Set response headers
      const fileName = `${categoryLabels[category] || category}_${region || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting category details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export category details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper function to get chlorine condition based on category
function getChlorineCondition(category: string): string {
  switch (category) {
    case 'below_0_2':
      return `cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2`;
    case 'optimal_0_2_0_5':
      return `cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5`;
    case 'above_0_5':
      return `cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5`;
    case 'consistent_below_0_2':
      return `cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 < 0.2
        AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 < 0.2
        AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 < 0.2
        AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 < 0.2
        AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 < 0.2
        AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 < 0.2
        AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2`;
    case 'consistent_optimal':
      return `cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 >= 0.2 AND cd.chlorine_value_1 <= 0.5
        AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 >= 0.2 AND cd.chlorine_value_2 <= 0.5
        AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 >= 0.2 AND cd.chlorine_value_3 <= 0.5
        AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 >= 0.2 AND cd.chlorine_value_4 <= 0.5
        AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 >= 0.2 AND cd.chlorine_value_5 <= 0.5
        AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 >= 0.2 AND cd.chlorine_value_6 <= 0.5
        AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5`;
    case 'consistent_above_0_5':
      return `cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 > 0.5
        AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 > 0.5
        AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 > 0.5
        AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 > 0.5
        AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 > 0.5
        AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 > 0.5
        AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5`;
    default:
      return '1=1';
  }
}

// Helper function to get LPCD condition based on category
function getLpcdCondition(category: string): string {
  switch (category) {
    case 'above_55':
      return `ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7 >= 55`;
    case 'below_55':
      return `ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 AND ws.lpcd_value_day7::numeric < 55`;
    case 'consistent_above_55':
      return `ws.lpcd_value_day1 IS NOT NULL AND ws.lpcd_value_day1 >= 55
        AND ws.lpcd_value_day2 IS NOT NULL AND ws.lpcd_value_day2 >= 55
        AND ws.lpcd_value_day3 IS NOT NULL AND ws.lpcd_value_day3 >= 55
        AND ws.lpcd_value_day4 IS NOT NULL AND ws.lpcd_value_day4 >= 55
        AND ws.lpcd_value_day5 IS NOT NULL AND ws.lpcd_value_day5 >= 55
        AND ws.lpcd_value_day6 IS NOT NULL AND ws.lpcd_value_day6 >= 55
        AND ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7 >= 55`;
    case 'consistent_below_55':
      return `ws.lpcd_value_day1 IS NOT NULL AND ws.lpcd_value_day1::numeric > 0 AND ws.lpcd_value_day1::numeric < 55
        AND ws.lpcd_value_day2 IS NOT NULL AND ws.lpcd_value_day2::numeric > 0 AND ws.lpcd_value_day2::numeric < 55
        AND ws.lpcd_value_day3 IS NOT NULL AND ws.lpcd_value_day3::numeric > 0 AND ws.lpcd_value_day3::numeric < 55
        AND ws.lpcd_value_day4 IS NOT NULL AND ws.lpcd_value_day4::numeric > 0 AND ws.lpcd_value_day4::numeric < 55
        AND ws.lpcd_value_day5 IS NOT NULL AND ws.lpcd_value_day5::numeric > 0 AND ws.lpcd_value_day5::numeric < 55
        AND ws.lpcd_value_day6 IS NOT NULL AND ws.lpcd_value_day6::numeric > 0 AND ws.lpcd_value_day6::numeric < 55
        AND ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 AND ws.lpcd_value_day7::numeric < 55`;
    case 'no_water':
      return `(ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7 = 0)`;
    default:
      return '1=1';
  }
}

// Get LPCD day-wise breakdown for all regions (for region comparison) - OPTIMIZED single query
router.get("/lpcd/day-wise-breakdown/all-regions", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query; // Add filterType
    console.log("Fetching LPCD day-wise breakdown for all regions", { filterType: filterType || fullyCompleted });

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const activeFilter = filterType || (fullyCompleted === "true" ? "fully_completed" : undefined);

    if (activeFilter && activeFilter !== 'all') {
      const db = await getDB();

      let condition = sql`1=1`;
      if (activeFilter === 'commissioned') {
        condition = sql`${schemeStatuses.water_supply} = 'Yes'`;
      } else if (activeFilter === 'fully_completed') {
        condition = sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('completed', 'fully-completed', 'fully completed')`;
      } else if (activeFilter === 'partial') {
        condition = sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) = 'in progress'`;
      }

      const filteredSchemeIds = (await db
        .select({ scheme_id: schemeStatuses.scheme_id })
        .from(schemeStatuses)
        .where(condition)).map((r: { scheme_id: string }) => r.scheme_id);

      if (filteredSchemeIds.length > 0) {
        const ids = filteredSchemeIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND wh.scheme_id IN (${ids})`;
      } else {
        schemeIdFilter = "AND wh.scheme_id IN ('NO_MATCHES')";
      }
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // OPTIMIZED: Single query that processes all regions at once
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, village_name, data_date)
            region,
            scheme_id,
            village_name,
            lpcd_value::numeric as lpcd_value,
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM water_scheme_data_history wh
          WHERE data_date IS NOT NULL
          ${schemeIdFilter}
            AND lpcd_value IS NOT NULL
            AND region IS NOT NULL
          ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            region, scheme_id, village_name, lpcd_value, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY region, scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT 
            region, scheme_id, village_name, rn, is_below_55, is_above_55, has_water, no_water,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, village_name, is_below_55 ORDER BY rn) as grp_below_55,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, village_name, is_above_55 ORDER BY rn) as grp_above_55,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, village_name, has_water ORDER BY rn) as grp_with_water,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, village_name, no_water ORDER BY rn) as grp_no_water
          FROM ranked WHERE rn <= 30
        ),
        first_row_info AS (
          SELECT region, scheme_id, village_name, 
                 is_below_55 as first_below_55, grp_below_55,
                 is_above_55 as first_above_55, grp_above_55,
                 has_water as first_has_water, grp_with_water,
                 no_water as first_no_water, grp_no_water
          FROM with_groups WHERE rn = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.region, wg.scheme_id, wg.village_name,
            SUM(CASE WHEN fri.first_below_55 = 1 AND wg.is_below_55 = 1 AND wg.grp_below_55 = fri.grp_below_55 THEN 1 ELSE 0 END) as consecutive_below_55,
            SUM(CASE WHEN fri.first_above_55 = 1 AND wg.is_above_55 = 1 AND wg.grp_above_55 = fri.grp_above_55 THEN 1 ELSE 0 END) as consecutive_above_55,
            SUM(CASE WHEN fri.first_has_water = 1 AND wg.has_water = 1 AND wg.grp_with_water = fri.grp_with_water THEN 1 ELSE 0 END) as consecutive_with_water,
            SUM(CASE WHEN fri.first_no_water = 1 AND wg.no_water = 1 AND wg.grp_no_water = fri.grp_no_water THEN 1 ELSE 0 END) as consecutive_no_water
          FROM with_groups wg
          JOIN first_row_info fri ON wg.region = fri.region AND wg.scheme_id = fri.scheme_id AND wg.village_name = fri.village_name
          GROUP BY wg.region, wg.scheme_id, wg.village_name
        ),
        day_counts AS (
          SELECT region, LEAST(consecutive_below_55, 30) as days_count, 'below_55' as metric_type
          FROM consecutive_counts WHERE consecutive_below_55 > 0
          UNION ALL
          SELECT region, LEAST(consecutive_above_55, 30), 'above_55'
          FROM consecutive_counts WHERE consecutive_above_55 > 0
          UNION ALL
          SELECT region, LEAST(consecutive_with_water, 30), 'with_water'
          FROM consecutive_counts WHERE consecutive_with_water > 0
          UNION ALL
          SELECT region, LEAST(consecutive_no_water, 30), 'no_water'
          FROM consecutive_counts WHERE consecutive_no_water > 0
        )
        SELECT 
          dc.region,
          gs.days,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'below_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as below_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'above_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as above_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'with_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as with_water,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'no_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as no_water
        FROM (SELECT generate_series(1, 30) as days) gs
        CROSS JOIN (SELECT DISTINCT region FROM day_counts) regions
        LEFT JOIN day_counts dc ON dc.region = regions.region
        GROUP BY dc.region, gs.days
        ORDER BY dc.region, gs.days DESC
      `;

      const result = await client.query(query);

      // Group results by region
      const allRegionData: { [region: string]: any[] } = {};
      result.rows.forEach((row: any) => {
        if (!row.region) return;
        if (!allRegionData[row.region]) {
          allRegionData[row.region] = [];
        }
        allRegionData[row.region].push({
          days: parseInt(row.days),
          below_55: parseInt(row.below_55) || 0,
          above_55: parseInt(row.above_55) || 0,
          with_water: parseInt(row.with_water) || 0,
          no_water: parseInt(row.no_water) || 0,
        });
      });

      res.json({
        success: true,
        data: allRegionData
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching LPCD day-wise breakdown for all regions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch LPCD day-wise breakdown for all regions",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get LPCD day-wise breakdown (1-30 days) using water_scheme_data_history table - OPTIMIZED with window functions
router.get("/lpcd/day-wise-breakdown", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType } = req.query;
    console.log(`Fetching LPCD day-wise breakdown for region: ${region || 'all'}`, { fullyCompleted, filterType });

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND wh.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const regionFilter = region && region !== 'All Regions' ? `AND wh.region = $1` : '';
      const params = region && region !== 'All Regions' ? [region] : [];

      // OPTIMIZED: Use window functions to calculate consecutive days efficiently
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, village_name, data_date)
            scheme_id,
            village_name,
            lpcd_value::numeric as lpcd_value,
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM water_scheme_data_history wh
          WHERE data_date IS NOT NULL
            AND lpcd_value IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id,
            village_name,
            lpcd_value,
            parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT 
            scheme_id,
            village_name,
            rn,
            is_below_55,
            is_above_55,
            has_water,
            no_water,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, is_below_55 ORDER BY rn) as grp_below_55,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, is_above_55 ORDER BY rn) as grp_above_55,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, has_water ORDER BY rn) as grp_with_water,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, no_water ORDER BY rn) as grp_no_water
          FROM ranked
          WHERE rn <= 30
        ),
        consecutive_streaks AS (
          SELECT 
            scheme_id,
            village_name,
            MAX(CASE WHEN is_below_55 = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.village_name = with_groups.village_name 
               AND wg2.is_below_55 = 1 
               AND wg2.grp_below_55 = with_groups.grp_below_55)
            ELSE 0 END) as consecutive_below_55,
            MAX(CASE WHEN is_above_55 = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.village_name = with_groups.village_name 
               AND wg2.is_above_55 = 1 
               AND wg2.grp_above_55 = with_groups.grp_above_55)
            ELSE 0 END) as consecutive_above_55,
            MAX(CASE WHEN has_water = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.village_name = with_groups.village_name 
               AND wg2.has_water = 1 
               AND wg2.grp_with_water = with_groups.grp_with_water)
            ELSE 0 END) as consecutive_with_water,
            MAX(CASE WHEN no_water = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.village_name = with_groups.village_name 
               AND wg2.no_water = 1 
               AND wg2.grp_no_water = with_groups.grp_no_water)
            ELSE 0 END) as consecutive_no_water
          FROM with_groups
          GROUP BY scheme_id, village_name
        ),
        day_counts AS (
          SELECT LEAST(consecutive_below_55, 30) as days_count, 'below_55' as metric_type
          FROM consecutive_streaks WHERE consecutive_below_55 > 0
          UNION ALL
          SELECT LEAST(consecutive_above_55, 30), 'above_55'
          FROM consecutive_streaks WHERE consecutive_above_55 > 0
          UNION ALL
          SELECT LEAST(consecutive_with_water, 30), 'with_water'
          FROM consecutive_streaks WHERE consecutive_with_water > 0
          UNION ALL
          SELECT LEAST(consecutive_no_water, 30), 'no_water'
          FROM consecutive_streaks WHERE consecutive_no_water > 0
        )
        SELECT 
          gs.days,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'below_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as below_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'above_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as above_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'with_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as with_water,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'no_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as no_water
        FROM (SELECT generate_series(1, 30) as days) gs
        LEFT JOIN day_counts dc ON TRUE
        GROUP BY gs.days
        ORDER BY gs.days DESC
      `;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          days: parseInt(row.days),
          below_55: parseInt(row.below_55) || 0,
          above_55: parseInt(row.above_55) || 0,
          with_water: parseInt(row.with_water) || 0,
          no_water: parseInt(row.no_water) || 0,
        })),
        region: region || 'all'
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching LPCD day-wise breakdown:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch LPCD day-wise breakdown",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get villages by LPCD day-wise criteria - OPTIMIZED
router.get("/lpcd/day-wise-villages/:metric/:days", async (req, res) => {
  try {
    const { metric, days } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching villages for LPCD metric: ${metric}, days: ${days}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    if (!['below_55', 'above_55', 'with_water', 'no_water'].includes(metric)) {
      return res.status(400).json({
        error: "Invalid metric. Must be 'below_55', 'above_55', 'with_water', or 'no_water'"
      });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: "Invalid days. Must be a number between 1 and 30"
      });
    }

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND wh.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const regionFilter = region && region !== 'All Regions' ? `AND wh.region = $2` : '';
      const params: any[] = [daysNum];
      if (region && region !== 'All Regions') params.push(region);

      const metricFlag = metric === 'below_55' ? 'is_below_55' :
        metric === 'above_55' ? 'is_above_55' :
          metric === 'with_water' ? 'has_water' : 'no_water';

      // OPTIMIZED: Use window functions for consecutive day calculation
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, village_name, data_date)
            scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
            population, lpcd_value::numeric as lpcd_value, water_value, data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM water_scheme_data_history wh
          WHERE data_date IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
            population, lpcd_value, water_value, data_date, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT *,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, ${metricFlag} ORDER BY rn) as grp
          FROM ranked WHERE rn <= 30
        ),
        first_row_groups AS (
          SELECT scheme_id, village_name, grp
          FROM with_groups 
          WHERE rn = 1 AND ${metricFlag} = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.scheme_id, wg.village_name,
            COUNT(*) as consecutive_days
          FROM with_groups wg
          INNER JOIN first_row_groups frg 
            ON wg.scheme_id = frg.scheme_id 
            AND wg.village_name = frg.village_name 
            AND wg.grp = frg.grp
          WHERE wg.${metricFlag} = 1
          GROUP BY wg.scheme_id, wg.village_name
        ),
        latest_data AS (
          SELECT * FROM ranked WHERE rn = 1
        )
        SELECT 
          ld.region, ld.circle, ld.division, ld.sub_division, ld.block,
          ld.scheme_id, ld.scheme_name, ld.village_name, ld.population,
          ld.lpcd_value as latest_lpcd_value,
          ld.water_value as latest_water_value,
          ld.data_date as latest_date,
          COALESCE(cc.consecutive_days, 0) as consecutive_days,
          ws.dashboard_url
        FROM latest_data ld
        LEFT JOIN consecutive_counts cc ON ld.scheme_id = cc.scheme_id AND ld.village_name = cc.village_name
        LEFT JOIN water_scheme_data ws ON (ld.scheme_id = ws.scheme_id AND ld.village_name = ws.village_name)
        WHERE COALESCE(cc.consecutive_days, 0) >= $1
        ORDER BY ld.region, ld.division, ld.village_name
      `;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        metric,
        days: daysNum,
        region: region || 'all'
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching villages by LPCD day-wise criteria:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch villages",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export LPCD day-wise villages to Excel
router.get("/lpcd/day-wise-villages-export/:metric/:days", async (req, res) => {
  try {
    const { metric, days } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting LPCD villages for metric: ${metric}, days: ${days}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    if (!['below_55', 'above_55', 'with_water', 'no_water'].includes(metric)) {
      return res.status(400).json({
        error: "Invalid metric. Must be 'below_55', 'above_55', 'with_water', or 'no_water'"
      });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: "Invalid days. Must be a number between 1 and 30"
      });
    }

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND wh.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const regionFilter = region && region !== 'All Regions' ? `AND wh.region = $2` : '';
      const params: any[] = [daysNum];
      if (region && region !== 'All Regions') params.push(region);

      const metricFlag = metric === 'below_55' ? 'is_below_55' :
        metric === 'above_55' ? 'is_above_55' :
          metric === 'with_water' ? 'has_water' : 'no_water';

      // OPTIMIZED: Use window functions for consecutive day calculation (SAME AS LIST VIEW)
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, village_name, data_date)
            scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
            population, lpcd_value::numeric as lpcd_value, water_value, data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM water_scheme_data_history wh
          WHERE data_date IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
            population, lpcd_value, water_value, data_date, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT *,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, ${metricFlag} ORDER BY rn) as grp
          FROM ranked WHERE rn <= 30
        ),
        first_row_groups AS (
          SELECT scheme_id, village_name, grp
          FROM with_groups 
          WHERE rn = 1 AND ${metricFlag} = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.scheme_id, wg.village_name,
            COUNT(*) as consecutive_days
          FROM with_groups wg
          INNER JOIN first_row_groups frg 
            ON wg.scheme_id = frg.scheme_id 
            AND wg.village_name = frg.village_name 
            AND wg.grp = frg.grp
          WHERE wg.${metricFlag} = 1
          GROUP BY wg.scheme_id, wg.village_name
        ),
        latest_data AS (
          SELECT * FROM ranked WHERE rn = 1
        )
        SELECT 
          ld.region, ld.circle, ld.division, ld.sub_division, ld.block,
          ld.scheme_id, ld.scheme_name, ld.village_name, ld.population,
          ld.lpcd_value as latest_lpcd_value,
          ld.water_value as latest_water_value,
          ld.data_date as latest_date,
          COALESCE(cc.consecutive_days, 0) as consecutive_days
        FROM latest_data ld
        LEFT JOIN consecutive_counts cc ON ld.scheme_id = cc.scheme_id AND ld.village_name = cc.village_name
        WHERE COALESCE(cc.consecutive_days, 0) >= $1
        ORDER BY ld.region, ld.division, ld.village_name
      `;

      const result = await client.query(query, params);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LPCD Day-Wise Villages');

      const metricLabels: { [key: string]: string } = {
        'below_55': `Villages <55 LPCD for ${daysNum} consecutive days`,
        'above_55': `Villages ≥55 LPCD for ${daysNum} consecutive days`,
        'with_water': `Villages with water for ${daysNum} consecutive days`,
        'no_water': `Villages without water for ${daysNum} consecutive days`
      };

      worksheet.columns = [
        { header: 'Region', key: 'region', width: 20 },
        { header: 'Circle', key: 'circle', width: 20 },
        { header: 'Division', key: 'division', width: 20 },
        { header: 'Sub Division', key: 'sub_division', width: 20 },
        { header: 'Block', key: 'block', width: 20 },
        { header: 'Scheme ID', key: 'scheme_id', width: 15 },
        { header: 'Scheme Name', key: 'scheme_name', width: 30 },
        { header: 'Village', key: 'village_name', width: 25 },
        { header: 'Population', key: 'population', width: 12 },
        { header: 'Latest LPCD', key: 'latest_lpcd_value', width: 12 },
        { header: 'Latest Water (LL)', key: 'latest_water_value', width: 15 },
        { header: 'Latest Date', key: 'latest_date', width: 15 },
        { header: 'Consecutive Days', key: 'consecutive_days', width: 18 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          population: row.population || 'N/A',
          latest_lpcd_value: row.latest_lpcd_value !== null ? Number(row.latest_lpcd_value).toFixed(1) : 'N/A',
          latest_water_value: row.latest_water_value !== null ? Number(row.latest_water_value).toFixed(2) : 'N/A',
          latest_date: row.latest_date || 'N/A',
          consecutive_days: row.consecutive_days,
        });
      });

      // Sanitize label to remove <, >, and other special chars
      const rawLabel = metricLabels[metric] || 'export';
      const sanitizedLabel = rawLabel.replace(/[^a-zA-Z0-9-_]/g, '_');
      const sanitizedRegion = (String(region) || 'All').replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${sanitizedLabel}_${sanitizedRegion}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting LPCD day-wise villages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export villages",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export LPCD Region Comparison Total (Multi-sheet)
router.get("/lpcd/region-comparison-total-export", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType } = req.query;
    console.log(`Exporting LPCD Region Comparison Total for region: ${region || 'All'}`, { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    const workbook = new ExcelJS.Workbook();

    // Metrics to export
    const metrics = [
      { key: 'below_55', label: 'Below 55 LPCD', sheetName: '<55 LPCD' },
      { key: 'above_55', label: 'Above 55 LPCD', sheetName: '>55 LPCD' },
      { key: 'no_water', label: 'No Water Supply', sheetName: 'No Water' },
      // { key: 'with_water', label: 'With Water Supply', sheetName: 'With Water' } // Optional, typically implied by >0
    ];

    try {
      // Get filtered scheme IDs if filter is enabled - calculate ONCE
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND wh.scheme_id IN (${ids})`;
      }

      for (const metricObj of metrics) {
        const { key: metric, label, sheetName } = metricObj;

        // Query logic reused from day-wise-villages, enforcing days=1 to get current status snapshot
        const regionFilter = region && region !== 'All Regions' ? `AND wh.region = $1` : '';
        const params: any[] = [];
        if (region && region !== 'All Regions') params.push(region);

        const metricFlag = metric === 'below_55' ? 'is_below_55' :
          metric === 'above_55' ? 'is_above_55' :
            metric === 'with_water' ? 'has_water' : 'no_water';

        // Using strict >= 1 day consecutive logic which effectively means "current status for today/latest"
        const query = `
          WITH 
          deduplicated AS (
            SELECT DISTINCT ON (scheme_id, village_name, data_date)
              scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
              population, lpcd_value::numeric as lpcd_value, water_value, data_date,
              CASE 
                WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
                WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                  CASE
                    WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                    THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END as parsed_date
            FROM water_scheme_data_history wh
            WHERE data_date IS NOT NULL
              ${regionFilter}
              ${schemeIdFilter}
            ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
          ),
          ranked AS (
            SELECT 
              scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
              population, lpcd_value, water_value, data_date, parsed_date,
              ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
              CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
              CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
              CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
              CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
            FROM deduplicated
            WHERE parsed_date IS NOT NULL
          ),
          with_groups AS (
            SELECT *,
              rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, ${metricFlag} ORDER BY rn) as grp
            FROM ranked WHERE rn <= 30
          ),
          first_row_groups AS (
            SELECT scheme_id, village_name, grp
            FROM with_groups 
            WHERE rn = 1 AND ${metricFlag} = 1
          ),
          consecutive_counts AS (
            SELECT 
              wg.scheme_id, wg.village_name,
              COUNT(*) as consecutive_days
            FROM with_groups wg
            INNER JOIN first_row_groups frg 
              ON wg.scheme_id = frg.scheme_id 
              AND wg.village_name = frg.village_name 
              AND wg.grp = frg.grp
            WHERE wg.${metricFlag} = 1
            GROUP BY wg.scheme_id, wg.village_name
          ),
          latest_data AS (
            SELECT * FROM ranked WHERE rn = 1
          )
          SELECT 
            ld.region, ld.circle, ld.division, ld.sub_division, ld.block,
            ld.scheme_id, ld.scheme_name, ld.village_name, ld.population,
            ld.lpcd_value as latest_lpcd_value,
            ld.water_value as latest_water_value,
            ld.data_date as latest_date,
            COALESCE(cc.consecutive_days, 0) as consecutive_days
          FROM latest_data ld
          LEFT JOIN consecutive_counts cc ON ld.scheme_id = cc.scheme_id AND ld.village_name = cc.village_name
          WHERE COALESCE(cc.consecutive_days, 0) >= 1
          ORDER BY ld.region, ld.division, ld.village_name
        `;

        const result = await client.query(query, params);

        // Add worksheet
        const worksheet = workbook.addWorksheet(sheetName);
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 15 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'Population', key: 'population', width: 12 },
          { header: 'Latest LPCD', key: 'latest_lpcd_value', width: 12 },
          { header: 'Latest Water (LL)', key: 'latest_water_value', width: 15 },
          { header: 'Latest Date', key: 'latest_date', width: 15 },
          { header: 'Consecutive Days', key: 'consecutive_days', width: 18 },
        ];

        // Format header
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };

        result.rows.forEach((row: any) => {
          worksheet.addRow({
            region: row.region,
            circle: row.circle,
            division: row.division,
            sub_division: row.sub_division,
            block: row.block,
            scheme_id: row.scheme_id,
            scheme_name: row.scheme_name,
            village_name: row.village_name,
            population: row.population || 'N/A',
            latest_lpcd_value: row.latest_lpcd_value !== null ? Number(row.latest_lpcd_value).toFixed(1) : 'N/A',
            latest_water_value: row.latest_water_value !== null ? Number(row.latest_water_value).toFixed(2) : 'N/A',
            latest_date: row.latest_date || 'N/A',
            consecutive_days: row.consecutive_days,
          });
        });
      }

      const fileName = `LPCD_Region_Comparison_Total_${(String(region) || 'All').replace(/[^a-zA-Z0-9-_]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();

    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting LPCD Region Comparison Total:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export region comparison total",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get LPCD regional statistics (for flow meters)
router.get("/lpcd/regional-stats", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;
    console.log("Fetching LPCD regional statistics", { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilterWS = "";
      let schemeIdFilterCS = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // Handle no matches
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilterWS = `AND ws.scheme_id IN (${ids})`;
        schemeIdFilterCS = `AND cs.scheme_id IN (${ids})`;
      }

      const query = `
        WITH flow_meter_stats AS (
          SELECT 
            cs.region,
            COUNT(DISTINCT CASE 
              WHEN cs.flow_meter_connected = 'Connected' 
              THEN cs.id 
            END) as total_connected,
            COUNT(DISTINCT CASE 
              WHEN cs.flow_meter_connected = 'Connected' 
                AND cs.flow_meter_status = 'Online' 
              THEN cs.id 
            END) as total_online,
            COUNT(DISTINCT CASE 
              WHEN cs.flow_meter_connected = 'Connected' 
                AND cs.flow_meter_status = 'Offline' 
              THEN cs.id 
            END) as total_offline
          FROM communication_status cs
          WHERE cs.region IS NOT NULL
          ${schemeIdFilterCS}
          GROUP BY cs.region
        ),
        lpcd_stats AS (
          SELECT 
            ws.region,
            COUNT(DISTINCT CASE 
              WHEN ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 
              THEN ws.scheme_id || '-' || ws.village_name || '-' || COALESCE(ws.block, '')
            END) as villages_with_water,
            COUNT(DISTINCT CASE 
              WHEN ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric >= 55 
              THEN ws.scheme_id || '-' || ws.village_name || '-' || COALESCE(ws.block, '')
            END) as villages_above_55,
            COUNT(DISTINCT CASE 
              WHEN ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 AND ws.lpcd_value_day7::numeric < 55 
              THEN ws.scheme_id || '-' || ws.village_name || '-' || COALESCE(ws.block, '')
            END) as villages_below_55,
            COUNT(DISTINCT CASE 
              WHEN ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7::numeric = 0 
              THEN ws.scheme_id || '-' || ws.village_name || '-' || COALESCE(ws.block, '')
            END) as villages_no_water
          FROM water_scheme_data ws
          WHERE ws.region IS NOT NULL
          ${schemeIdFilterWS}
          GROUP BY ws.region
        ),
        history_stats AS (
          SELECT 
            region,
            scheme_id,
            village_name,
            block,
            COUNT(CASE WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric < 55 THEN 1 END) as days_below_55
          FROM (
            SELECT DISTINCT ON (region, scheme_id, village_name, block, data_date)
              region, scheme_id, village_name, block, data_date, lpcd_value
            FROM water_scheme_data_history
            WHERE region IS NOT NULL 
              AND data_date IS NOT NULL
            ORDER BY region, scheme_id, village_name, block, data_date, uploaded_at DESC
          ) deduplicated
          GROUP BY region, scheme_id, village_name, block
        ),
        consecutive_below_55 AS (
          SELECT 
            region,
            COUNT(CASE WHEN days_below_55 >= 3 THEN 1 END) as below_55_3days,
            COUNT(CASE WHEN days_below_55 >= 7 THEN 1 END) as below_55_7days,
            COUNT(CASE WHEN days_below_55 >= 30 THEN 1 END) as below_55_30days
          FROM history_stats
          GROUP BY region
        )
        SELECT 
          COALESCE(fm.region, ls.region) as region,
          COALESCE(fm.total_connected, 0) as total_connected,
          COALESCE(fm.total_online, 0) as total_online,
          COALESCE(fm.total_offline, 0) as total_offline,
          COALESCE(ls.villages_with_water, 0) as villages_with_water,
          COALESCE(ls.villages_above_55, 0) as villages_above_55,
          COALESCE(ls.villages_below_55, 0) as villages_below_55,
          COALESCE(ls.villages_no_water, 0) as villages_no_water,
          COALESCE(cb.below_55_3days, 0) as below_55_3days,
          COALESCE(cb.below_55_7days, 0) as below_55_7days,
          COALESCE(cb.below_55_30days, 0) as below_55_30days
        FROM flow_meter_stats fm
        FULL OUTER JOIN lpcd_stats ls ON fm.region = ls.region
        LEFT JOIN consecutive_below_55 cb ON COALESCE(fm.region, ls.region) = cb.region
        WHERE COALESCE(fm.region, ls.region) IS NOT NULL
        ORDER BY COALESCE(fm.region, ls.region)
      `;

      const result = await client.query(query);

      const stats = result.rows.map((row: any) => ({
        region: row.region,
        totalConnected: parseInt(row.total_connected) || 0,
        totalOnline: parseInt(row.total_online) || 0,
        totalOffline: parseInt(row.total_offline) || 0,
        villagesWithWater: parseInt(row.villages_with_water) || 0,
        villagesAbove55: parseInt(row.villages_above_55) || 0,
        villagesBelow55: parseInt(row.villages_below_55) || 0,
        villagesNoWater: parseInt(row.villages_no_water) || 0,
        below55For3Days: parseInt(row.below_55_3days) || 0,
        below55For7Days: parseInt(row.below_55_7days) || 0,
        below55For30Days: parseInt(row.below_55_30days) || 0,
      }));

      res.json({
        success: true,
        data: stats
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching LPCD regional statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch LPCD regional statistics",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get LPCD details by statistic type
router.get("/lpcd/details/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching LPCD details for type: ${statisticType}, region: ${region || 'all'}, filterType: ${filterType || fullyCompleted}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs
      let schemeIdFilterWS = "";
      let schemeIdFilterCS = "";
      let schemeIdFilterGeneric = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // Return empty result immediately?
          return res.json({
            success: true,
            type: statisticType,
            region: region || 'all',
            count: 0,
            data: []
          });
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilterWS = `AND ws.scheme_id IN (${ids})`;
        schemeIdFilterCS = `AND cs.scheme_id IN (${ids})`;
        schemeIdFilterGeneric = `AND scheme_id IN (${ids})`;
      }

      let query = '';
      const params: any[] = [];
      let paramIndex = 1;

      const regionFilterWS = region && region !== 'All Regions' ? `AND ws.region = $${paramIndex}` : '';
      const regionFilterCS = region && region !== 'All Regions' ? `AND cs.region = $${paramIndex}` : '';
      const regionFilterGeneric = region && region !== 'All Regions' ? `AND region = $${paramIndex}` : '';

      // We need to advance paramIndex only if we use it, but since we pushed region to params, we can use $1
      if (region && region !== 'All Regions') {
        params.push(region);
        paramIndex++;
      }

      // NOTE: In original code, $paramIndex++ was used inside string template, which is evaluated immediately.
      // But paramIndex variable only increments once per expression if strict?
      // Actually original code was `AND ws.region = $${paramIndex++}`.
      // Since I just use $1 if region exists, I can simplify.

      const regionParam = region && region !== 'All Regions' ? '$1' : '';

      switch (statisticType) {
        case 'connected':
          query = `
            SELECT 
              cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
              cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name,
              cs.flow_meter_connected, cs.flow_meter_status,
              ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7,
              COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = cs.scheme_id AND ch.village_name = cs.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
            FROM communication_status cs
            LEFT JOIN water_scheme_data ws ON (
              cs.scheme_id = ws.scheme_id 
              AND cs.village_name = ws.village_name
              AND COALESCE(cs.block, '') = COALESCE(ws.block, '')
            )
            WHERE cs.flow_meter_connected = 'Connected'
            ${region && region !== 'All Regions' ? `AND cs.region = $1` : ''}
            ${schemeIdFilterCS}
            ORDER BY cs.region, cs.division, cs.village_name
          `;
          break;

        case 'villages-with-water':
          query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7,
                COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0
              ${region && region !== 'All Regions' ? `AND ws.region = $1` : ''}
              ${schemeIdFilterWS}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
          break;

        case 'villages-above-55':
          query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7,
                COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 55
              ${region && region !== 'All Regions' ? `AND ws.region = $1` : ''}
              ${schemeIdFilterWS}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
          break;

        case 'villages-below-55':
          query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7,
                COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day7 IS NOT NULL 
                AND ws.lpcd_value_day7::numeric > 0 
                AND ws.lpcd_value_day7::numeric < 55
              ${region && region !== 'All Regions' ? `AND ws.region = $1` : ''}
              ${schemeIdFilterWS}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
          break;

        case 'villages-no-water':
          query = `
            SELECT * FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
                ws.scheme_id, ws.scheme_name, ws.village_name,
                ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7,
                COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = ws.scheme_id AND ch.village_name = ws.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
              FROM water_scheme_data ws
              WHERE ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7::numeric = 0
              ${region && region !== 'All Regions' ? `AND ws.region = $1` : ''}
              ${schemeIdFilterWS}
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
            ORDER BY region, division, village_name
          `;
          break;

        case 'below-55-3days':
        case 'below-55-7days':
        case 'below-55-30days':
          const daysThreshold = statisticType === 'below-55-3days' ? 3 :
            statisticType === 'below-55-7days' ? 7 : 30;
          query = `
            WITH history_stats AS (
              SELECT 
                region, circle, division, sub_division, block,
                scheme_id, scheme_name, village_name, population,
                COUNT(CASE WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric < 55 THEN 1 END) as days_below_55
              FROM (
                SELECT DISTINCT ON (region, scheme_id, village_name, block, data_date)
                  region, circle, division, sub_division, block,
                  scheme_id, scheme_name, village_name, population, data_date, lpcd_value
                FROM water_scheme_data_history
                WHERE region IS NOT NULL 
                  AND data_date IS NOT NULL
                  ${region && region !== 'All Regions' ? `AND region = $1` : ''}
                  ${schemeIdFilterGeneric}
                ORDER BY region, scheme_id, village_name, block, data_date, uploaded_at DESC
              ) deduplicated
              GROUP BY region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, population
            )
            SELECT 
              hs.region, hs.circle, hs.division, hs.sub_division, hs.block,
              hs.scheme_id, hs.scheme_name, hs.village_name, hs.population,
              hs.days_below_55 as consecutive_days,
              COALESCE(ws.dashboard_url, (SELECT dashboard_url FROM chlorine_history ch WHERE ch.scheme_id = hs.scheme_id AND ch.village_name = hs.village_name AND ch.dashboard_url IS NOT NULL ORDER BY ch.uploaded_at DESC LIMIT 1)) as dashboard_url
            FROM history_stats hs
            LEFT JOIN water_scheme_data ws ON (hs.scheme_id = ws.scheme_id AND hs.village_name = ws.village_name)
            WHERE hs.days_below_55 >= ${daysThreshold}
            ORDER BY hs.region, hs.division, hs.village_name
          `;
          break;

        default:
          return res.status(400).json({ error: "Invalid statistic type" });
      }

      const result = await client.query(query, params);

      res.json({
        success: true,
        type: statisticType,
        region: region || 'all',
        count: result.rows.length,
        data: result.rows
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching LPCD details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch LPCD details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export LPCD details to Excel
router.get("/lpcd/export/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting LPCD details for type: ${statisticType}, region: ${region || 'all'}, filterType: ${filterType || fullyCompleted}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs
      let schemeIdFilterWS = "";
      let schemeIdFilterCS = "";
      let schemeIdFilterGeneric = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // Return empty excel?
          // Just use a false filter
          schemeIdFilterWS = "AND 1=0";
          schemeIdFilterCS = "AND 1=0";
          schemeIdFilterGeneric = "AND 1=0";
        } else {
          const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
          schemeIdFilterWS = `AND ws.scheme_id IN (${ids})`;
          schemeIdFilterCS = `AND cs.scheme_id IN (${ids})`;
          schemeIdFilterGeneric = `AND scheme_id IN (${ids})`;
        }
      }

      let query = '';
      const params: any[] = [];
      let paramIndex = 1;

      // region params
      if (region && region !== 'All Regions') {
        params.push(region);
        paramIndex++;
      }

      const regionParam = region && region !== 'All Regions' ? '$1' : '';

      const statisticLabels: { [key: string]: string } = {
        'connected': 'Connected Flow Meters',
        'villages-with-water': 'Villages With Water',
        'villages-above-55': 'Villages Above 55 LPCD',
        'villages-below-55': 'Villages Below 55 LPCD',
        'villages-no-water': 'Villages With No Water',
        'below-55-3days': 'Villages Below 55 LPCD for 3+ Days',
        'below-55-7days': 'Villages Below 55 LPCD for 7+ Days',
        'below-55-30days': 'Villages Below 55 LPCD for 30+ Days'
      };

      switch (statisticType) {
        case 'connected':
          query = `
            SELECT 
              cs.region, cs.circle, cs.division, cs.sub_division, cs.block,
              cs.scheme_id, cs.scheme_name, cs.village_name, cs.esr_name,
              cs.flow_meter_connected, cs.flow_meter_status,
              ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7
            FROM communication_status cs
            LEFT JOIN water_scheme_data ws ON (
              cs.scheme_id = ws.scheme_id 
              AND cs.village_name = ws.village_name
              AND COALESCE(cs.block, '') = COALESCE(ws.block, '')
            )
            WHERE cs.flow_meter_connected = 'Connected'
            ${region && region !== 'All Regions' ? `AND cs.region = $1` : ''}
            ${schemeIdFilterCS}
            ORDER BY cs.region, cs.division, cs.village_name
          `;
          break;

        case 'villages-with-water':
        case 'villages-above-55':
        case 'villages-below-55':
        case 'villages-no-water':
          let lpcdCondition = '';
          if (statisticType === 'villages-with-water') {
            lpcdCondition = 'ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0';
          } else if (statisticType === 'villages-above-55') {
            lpcdCondition = 'ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 55';
          } else if (statisticType === 'villages-below-55') {
            lpcdCondition = 'ws.lpcd_value_day7 IS NOT NULL AND ws.lpcd_value_day7::numeric > 0 AND ws.lpcd_value_day7::numeric < 55';
          } else {
            lpcdCondition = 'ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7::numeric = 0';
          }
          query = `
            SELECT 
              ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
              ws.scheme_id, ws.scheme_name, ws.village_name,
              ws.population, ws.lpcd_value_day7, ws.water_value_day7, ws.water_date_day7
            FROM water_scheme_data ws
            WHERE ${lpcdCondition}
            ${region && region !== 'All Regions' ? `AND ws.region = $1` : ''}
            ${schemeIdFilterWS}
            ORDER BY ws.region, ws.division, ws.village_name
          `;
          break;

        case 'below-55-3days':
        case 'below-55-7days':
        case 'below-55-30days':
          const daysThreshold = statisticType === 'below-55-3days' ? 3 :
            statisticType === 'below-55-7days' ? 7 : 30;
          query = `
            WITH history_stats AS (
              SELECT 
                region, circle, division, sub_division, block,
                scheme_id, scheme_name, village_name, population,
                COUNT(CASE WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric < 55 THEN 1 END) as days_below_55
              FROM (
                SELECT DISTINCT ON (region, scheme_id, village_name, block, data_date)
                  region, circle, division, sub_division, block,
                  scheme_id, scheme_name, village_name, population, data_date, lpcd_value
                FROM water_scheme_data_history
                WHERE region IS NOT NULL 
                  AND data_date IS NOT NULL
                  ${region && region !== 'All Regions' ? `AND region = $1` : ''}
                  ${schemeIdFilterGeneric}
                ORDER BY region, scheme_id, village_name, block, data_date, uploaded_at DESC
              ) deduplicated
              GROUP BY region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, population
            )
            SELECT 
              region, circle, division, sub_division, block,
              scheme_id, scheme_name, village_name, population,
              days_below_55 as consecutive_days
            FROM history_stats
            WHERE days_below_55 >= ${daysThreshold}
            ORDER BY region, division, village_name
          `;
          break;

        default:
          return res.status(400).json({ error: "Invalid statistic type" });
      }

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No data found for export" });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LPCD Details');

      if (statisticType === 'connected') {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 15 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'ESR Name', key: 'esr_name', width: 25 },
          { header: 'Flow Meter Status', key: 'flow_meter_status', width: 18 },
          { header: 'Population', key: 'population', width: 12 },
          { header: 'LPCD (Day 7)', key: 'lpcd_value_day7', width: 15 },
          { header: 'Water (Day 7)', key: 'water_value_day7', width: 15 },
        ];
      } else if (statisticType.startsWith('below-55-')) {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 15 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'Population', key: 'population', width: 12 },
          { header: 'Days Below 55', key: 'consecutive_days', width: 15 },
        ];
      } else {
        worksheet.columns = [
          { header: 'Region', key: 'region', width: 20 },
          { header: 'Circle', key: 'circle', width: 20 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Sub Division', key: 'sub_division', width: 20 },
          { header: 'Block', key: 'block', width: 20 },
          { header: 'Scheme ID', key: 'scheme_id', width: 15 },
          { header: 'Scheme Name', key: 'scheme_name', width: 30 },
          { header: 'Village', key: 'village_name', width: 25 },
          { header: 'Population', key: 'population', width: 12 },
          { header: 'LPCD (Day 7)', key: 'lpcd_value_day7', width: 15 },
          { header: 'Water (Day 7)', key: 'water_value_day7', width: 15 },
          { header: 'Date', key: 'water_date_day7', width: 15 },
        ];
      }

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name || 'N/A',
          flow_meter_status: row.flow_meter_status || 'N/A',
          population: row.population || 'N/A',
          lpcd_value_day7: row.lpcd_value_day7 !== null ? Number(row.lpcd_value_day7).toFixed(1) : 'N/A',
          water_value_day7: row.water_value_day7 !== null ? Number(row.water_value_day7).toFixed(2) : 'N/A',
          water_date_day7: row.water_date_day7 || 'N/A',
          consecutive_days: row.consecutive_days || 'N/A',
        });
      });

      const fileName = `LPCD_${statisticLabels[statisticType]?.replace(/\s+/g, '_') || statisticType}_${region || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting LPCD details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export LPCD details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// =====================================================
// SCHEME LPCD ROUTES - Similar to Village LPCD routes
// =====================================================

// Get Scheme LPCD regional statistics (for Region Comparison and Regional Overview tabs)
router.get("/scheme-lpcd/regional-stats", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;
    console.log("Fetching Scheme LPCD regional statistics", { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // No matches
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN (${ids})`;
      }

      const query = `
        -- Mirror the exact query structure from /api/scheme-lpcd-data (scheme-lpcd-routes.ts)
        WITH village_counts AS (
          SELECT 
            vc_wsd.scheme_id,
            vc_wsd.block,
            vc_wsd.village_name,
            CASE WHEN vc_wsd.lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN vc_wsd.lpcd_value_day7 < 55 AND vc_wsd.lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN vc_wsd.lpcd_value_day7 = 0 OR vc_wsd.lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data vc_wsd
        ),
        deduplicated_villages AS (
          SELECT DISTINCT ON (dv_wsd.scheme_id, dv_wsd.block, dv_wsd.village_name)
            dv_wsd.scheme_id, dv_wsd.scheme_name, dv_wsd.region, dv_wsd.circle, dv_wsd.division, dv_wsd.sub_division, dv_wsd.block,
            dv_wsd.village_name, dv_wsd.population,
            dv_wsd.water_value_day1, dv_wsd.water_value_day2, dv_wsd.water_value_day3,
            dv_wsd.water_value_day4, dv_wsd.water_value_day5, dv_wsd.water_value_day6, dv_wsd.water_value_day7
          FROM water_scheme_data dv_wsd
          ORDER BY dv_wsd.scheme_id, dv_wsd.block, dv_wsd.village_name, dv_wsd.lpcd_value_day7 DESC NULLS LAST
        ),
        village_status AS (
          SELECT
            vs_vc.scheme_id, vs_vc.block, vs_vc.village_name,
            MAX(vs_vc.is_above_55) as has_above_55,
            MAX(vs_vc.is_below_55) as has_below_55,
            MAX(vs_vc.is_zero_supply) as has_zero_supply
          FROM village_counts vs_vc
          GROUP BY vs_vc.scheme_id, vs_vc.block, vs_vc.village_name
        ),
        lpcd_aggregation AS (
          SELECT
            la_vs.scheme_id, la_vs.block,
            COUNT(DISTINCT la_vs.village_name) as total_villages,
            SUM(CASE WHEN la_vs.has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN la_vs.has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN la_vs.has_above_55 = 0 AND la_vs.has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status la_vs
          GROUP BY la_vs.scheme_id, la_vs.block
        ),
        scheme_aggregation AS (
          SELECT 
            sa_wsd.scheme_id, sa_wsd.scheme_name, sa_wsd.region, sa_wsd.block,
            SUM(sa_wsd.population) as total_population,
            SUM(sa_wsd.water_value_day7) as total_water_day7,
            sa_la.total_villages, sa_la.villages_above_55, sa_la.villages_below_55, sa_la.villages_zero_supply
          FROM deduplicated_villages sa_wsd
          JOIN lpcd_aggregation sa_la ON sa_wsd.scheme_id = sa_la.scheme_id AND sa_wsd.block = sa_la.block
          GROUP BY sa_wsd.scheme_id, sa_wsd.scheme_name, sa_wsd.region, sa_wsd.block,
            sa_la.total_villages, sa_la.villages_above_55, sa_la.villages_below_55, sa_la.villages_zero_supply
        ),
        scheme_with_lpcd AS (
          SELECT
            swl.scheme_id, swl.scheme_name, swl.region, swl.block,
            swl.total_population, swl.total_villages,
            swl.villages_above_55, swl.villages_below_55, swl.villages_zero_supply,
            CASE WHEN swl.total_population > 0 THEN ROUND((swl.total_water_day7 * 100000) / swl.total_population, 2) ELSE 0 END as lpcd_value_day7
          FROM scheme_aggregation swl
          WHERE swl.region IS NOT NULL
          ${schemeIdFilter ? schemeIdFilter.replace('scheme_id', 'swl.scheme_id') : ''}
        ),
        unique_schemes AS (
          SELECT DISTINCT ON (us.scheme_name)
            us.region, us.total_population, us.total_villages, us.lpcd_value_day7, us.scheme_name, us.block
          FROM scheme_with_lpcd us
          WHERE us.scheme_name IS NOT NULL AND BTRIM(us.scheme_name) <> ''
          ORDER BY us.scheme_name, us.block
        ),
        scheme_stats AS (
          SELECT
            ss_us.region,
            COUNT(*) as total_schemes,
            SUM(ss_us.total_population) as total_population,
            SUM(ss_us.total_villages) as total_villages,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 >= 55 THEN 1 END) as schemes_above_55,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 < 55 AND ss_us.lpcd_value_day7 > 0 THEN 1 END) as schemes_below_55,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 = 0 OR ss_us.lpcd_value_day7 IS NULL THEN 1 END) as schemes_no_supply
          FROM unique_schemes ss_us
          GROUP BY ss_us.region
        ),
        -- Improved historical below-55 day counts using consecutive streak detection
        history_parsed AS (
          SELECT 
            hp_h.region, hp_h.scheme_name,
            CASE 
              WHEN hp_h.data_date::text ~ '^\d{4}-\d{2}-\d{2}$' THEN hp_h.data_date::date
              WHEN hp_h.data_date::text ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(hp_h.data_date::text, 'DD-Mon-YY')
              WHEN hp_h.data_date::text ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(hp_h.data_date::text || '-' || TO_CHAR(COALESCE(hp_h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(hp_h.uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(hp_h.data_date::text || '-' || (TO_CHAR(COALESCE(hp_h.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(hp_h.data_date::text || '-' || TO_CHAR(COALESCE(hp_h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date,
            hp_h.lpcd_value as lpcd
          FROM scheme_lpcd_data_history hp_h
          WHERE hp_h.region IS NOT NULL AND hp_h.data_date IS NOT NULL
        ),
        history_ranked AS (
          SELECT 
            hr_d.region, hr_d.scheme_name, hr_d.lpcd, hr_d.parsed_date,
            ROW_NUMBER() OVER (PARTITION BY hr_d.scheme_name ORDER BY hr_d.parsed_date DESC) as rn
          FROM (
            SELECT DISTINCT ON (hr_p.scheme_name, hr_p.parsed_date)
              hr_p.region, hr_p.scheme_name, hr_p.lpcd, hr_p.parsed_date
            FROM history_parsed hr_p
            WHERE hr_p.parsed_date IS NOT NULL
            ORDER BY hr_p.scheme_name, hr_p.parsed_date DESC
          ) hr_d
        ),
        streak_groups AS (
          SELECT
            sg_orig.region, sg_orig.scheme_name, sg_orig.rn, sg_orig.lpcd,
            sg_orig.rn - ROW_NUMBER() OVER (PARTITION BY sg_orig.scheme_name, (CASE WHEN sg_orig.lpcd < 55 AND sg_orig.lpcd > 0 THEN 1 ELSE 0 END) ORDER BY sg_orig.rn) as grp
          FROM history_ranked sg_orig
          WHERE sg_orig.lpcd IS NOT NULL
        ),
        current_streaks AS (
          SELECT 
            cs_sg.region, cs_sg.scheme_name, 
            COUNT(*) as streak_length
          FROM streak_groups cs_sg
          JOIN (
            SELECT latest_sg.scheme_name, latest_sg.grp 
            FROM streak_groups latest_sg
            WHERE latest_sg.rn = 1 AND latest_sg.lpcd < 55 AND latest_sg.lpcd > 0
          ) latest ON cs_sg.scheme_name = latest.scheme_name AND cs_sg.grp = latest.grp
          GROUP BY cs_sg.region, cs_sg.scheme_name
        ),
        consecutive_below_55 AS (
          SELECT
            cb_cs.region,
            COUNT(CASE WHEN cb_cs.streak_length >= 3 THEN 1 END) as below_55_3days,
            COUNT(CASE WHEN cb_cs.streak_length >= 7 THEN 1 END) as below_55_7days,
            COUNT(CASE WHEN cb_cs.streak_length >= 30 THEN 1 END) as below_55_30days
          FROM current_streaks cb_cs
          GROUP BY cb_cs.region
        )
        SELECT 
          f_ss.region,
          COALESCE(f_ss.total_schemes, 0) as total_schemes,
          COALESCE(f_ss.total_population, 0) as total_population,
          COALESCE(f_ss.total_villages, 0) as total_villages,
          COALESCE(f_ss.schemes_above_55, 0) as schemes_above_55,
          COALESCE(f_ss.schemes_below_55, 0) as schemes_below_55,
          COALESCE(f_ss.schemes_no_supply, 0) as schemes_no_supply,
          COALESCE(f_cb.below_55_3days, 0) as below_55_3days,
          COALESCE(f_cb.below_55_7days, 0) as below_55_7days,
          COALESCE(f_cb.below_55_30days, 0) as below_55_30days
        FROM scheme_stats f_ss
        LEFT JOIN consecutive_below_55 f_cb ON f_ss.region = f_cb.region
        WHERE f_ss.region IS NOT NULL
        ORDER BY f_ss.region
      `;

      const result = await client.query(query);

      const stats = result.rows.map((row: any) => ({
        region: row.region,
        totalSchemes: parseInt(row.total_schemes) || 0,
        totalPopulation: parseInt(row.total_population) || 0,
        totalVillages: parseInt(row.total_villages) || 0,
        schemesAbove55: parseInt(row.schemes_above_55) || 0,
        schemesBelow55: parseInt(row.schemes_below_55) || 0,
        schemesNoSupply: parseInt(row.schemes_no_supply) || 0,
        below55For3Days: parseInt(row.below_55_3days) || 0,
        below55For7Days: parseInt(row.below_55_7days) || 0,
        below55For30Days: parseInt(row.below_55_30days) || 0,
      }));

      res.json({
        success: true,
        data: stats
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD regional statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD regional statistics",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD details by statistic type
router.get("/scheme-lpcd/details/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching Scheme LPCD details for type: ${statisticType}, region: ${region || 'all'}, filterType: ${filterType || fullyCompleted}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // No matches
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND sldh.scheme_id IN (${ids})`;
      }

      let query = '';
      const params: any[] = [];
      let paramIndex = 1;

      const regionFilter = region && region !== 'All Regions'
        ? `AND sldh.region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      // BaseQuery with JOIN to get fallback dashboard_url 
      const baseQuery = `
        SELECT DISTINCT ON (sldh.region, sldh.scheme_id, sldh.block)
            sldh.region, sldh.circle, sldh.division, sldh.sub_division, sldh.block,
            sldh.scheme_id, sldh.scheme_name, sldh.total_population, sldh.total_villages, 
            sldh.villages_below_55, sldh.villages_above_55, sldh.villages_zero_supply,
            sldh.water_value, sldh.lpcd_value, sldh.data_date, 
            sldh.dashboard_url as history_url,
            ss.dashboard_url as status_url,
            COALESCE(NULLIF(ss.dashboard_url, ''), sldh.dashboard_url) as dashboard_url
        FROM scheme_lpcd_data_history sldh
        LEFT JOIN scheme_status ss ON sldh.scheme_id = ss.scheme_id AND sldh.scheme_name = ss.scheme_name
        WHERE sldh.region IS NOT NULL
          ${regionFilter}
          ${schemeIdFilter}
        ORDER BY sldh.region, sldh.scheme_id, sldh.block, 
          CASE 
            WHEN sldh.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN sldh.data_date::date
            WHEN sldh.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(sldh.data_date, 'DD-Mon-YY')
            WHEN sldh.data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
              CASE
                WHEN TO_DATE(sldh.data_date || '-' || TO_CHAR(COALESCE(sldh.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(sldh.uploaded_at, CURRENT_DATE) + interval '1 month')
                THEN TO_DATE(sldh.data_date || '-' || (TO_CHAR(COALESCE(sldh.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(sldh.data_date || '-' || TO_CHAR(COALESCE(sldh.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END DESC, sldh.uploaded_at DESC
      `;

      switch (statisticType) {
        case 'total-schemes':
        case 'totalSchemes':
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            ORDER BY region, scheme_id
          `;
          break;

        case 'schemesAbove55': // Renamed from 'schemes-above-55' to match existing frontend calls
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 55
            ORDER BY region, scheme_id
          `;
          break;

        case 'schemesBelow55': // Renamed from 'schemes-below-55' to match existing frontend calls
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55
            ORDER BY region, scheme_id
          `;
          break;

        case 'schemesNoSupply': // Renamed from 'schemes-no-supply' to match existing frontend calls
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            WHERE lpcd_value IS NULL OR lpcd_value::numeric = 0
            ORDER BY region, scheme_id
          `;
          break;

        case 'below55For3Days': // Renamed from 'below-55-3days' to match existing frontend calls
        case 'below55For7Days': // Renamed from 'below-55-7days' to match existing frontend calls
        case 'below55For30Days': // Renamed from 'below-55-30days' to match existing frontend calls
          const daysThreshold = statisticType === 'below55For3Days' ? 3 :
            statisticType === 'below55For7Days' ? 7 : 30;

          query = `
            WITH history_stats AS (
              SELECT 
                region, scheme_id, scheme_name, block, total_population,
                COUNT(CASE WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric < 55 THEN 1 END) as days_below_55
              FROM (
                SELECT DISTINCT ON (region, scheme_id, block, data_date)
                  region, scheme_id, scheme_name, block, total_population, data_date, lpcd_value
                FROM scheme_lpcd_data_history sldh
                WHERE region IS NOT NULL 
                  AND data_date IS NOT NULL
                  ${regionFilter}
                  ${schemeIdFilter}
                ORDER BY region, scheme_id, block, data_date, uploaded_at DESC
              ) deduplicated
              GROUP BY region, scheme_id, scheme_name, block, total_population
            )
            SELECT 
              region, scheme_id, scheme_name, block, total_population,
              days_below_55 as consecutive_days
            FROM history_stats
            WHERE days_below_55 >= ${daysThreshold}
            ORDER BY region, scheme_id
          `;
          break;

        default:
          return res.status(400).json({ error: "Invalid statistic type" });
      }

      const result = await client.query(query, params);

      res.json({
        success: true,
        type: statisticType,
        region: region || 'all',
        count: result.rows.length,
        data: result.rows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: parseInt(row.total_population) || 0,
          total_villages: parseInt(row.total_villages) || 0,
          villages_below_55: parseInt(row.villages_below_55) || 0,
          villages_above_55: parseInt(row.villages_above_55) || 0,
          villages_zero_supply: parseInt(row.villages_zero_supply) || 0,
          water_value: row.water_value ? parseFloat(row.water_value) : null,
          lpcd_value: row.lpcd_value ? parseFloat(row.lpcd_value) : null,
          data_date: row.data_date,
          dashboard_url: row.dashboard_url,
          consecutive_days: row.consecutive_days ? parseInt(row.consecutive_days) : null, // For consecutive days stats
        }))
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export Scheme LPCD details to Excel
router.get("/scheme-lpcd/details-export/:statisticType", async (req, res) => {
  try {
    const { statisticType } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting Scheme LPCD details for type: ${statisticType}, region: ${region || 'all'}, filterType: ${filterType || fullyCompleted}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // No matches
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN (${ids})`;
      }

      let query = '';
      const params: any[] = [];
      let paramIndex = 1;

      const regionFilter = region && region !== 'All Regions'
        ? `AND region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      const statisticLabels: Record<string, string> = {
        'schemesAbove55': 'Schemes Above 55 LPCD',
        'schemesBelow55': 'Schemes Below 55 LPCD',
        'schemesNoSupply': 'Schemes No Supply',
      };

      // Base query part for DISTINCT ON latest data
      const baseQuery = `
        SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value, lpcd_value, data_date
        FROM scheme_lpcd_data_history
        WHERE region IS NOT NULL
          ${regionFilter}
          ${schemeIdFilter}
        ORDER BY region, scheme_id, block, 
          CASE 
            WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
            WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
              CASE
                WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END DESC, uploaded_at DESC
      `;

      switch (statisticType) {
        case 'schemesAbove55':
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 55
            ORDER BY region, scheme_id
          `;
          break;
        case 'schemesBelow55':
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55
            ORDER BY region, scheme_id
          `;
          break;
        case 'schemesNoSupply':
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            WHERE lpcd_value IS NULL OR lpcd_value::numeric = 0
            ORDER BY region, scheme_id
          `;
          break;
        case 'below55For3Days':
        case 'below55For7Days':
        case 'below55For30Days':
          const daysThreshold = statisticType === 'below55For3Days' ? 3 :
            statisticType === 'below55For7Days' ? 7 : 30;

          query = `
            WITH history_stats AS (
              SELECT 
                region, circle, division, sub_division, block,
                scheme_id, scheme_name, total_population,
                COUNT(CASE WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric < 55 THEN 1 END) as days_below_55
              FROM (
                SELECT DISTINCT ON (region, scheme_id, block, data_date)
                  region, circle, division, sub_division, block, scheme_id, scheme_name, total_population, data_date, lpcd_value
                FROM scheme_lpcd_data_history
                WHERE region IS NOT NULL 
                  AND data_date IS NOT NULL
                  ${regionFilter}
                  ${schemeIdFilter}
                ORDER BY region, scheme_id, block, data_date, uploaded_at DESC
              ) deduplicated
              GROUP BY region, circle, division, sub_division, block, scheme_id, scheme_name, total_population
            )
            SELECT 
              region, circle, division, sub_division, block,
              scheme_id, scheme_name, total_population,
              days_below_55 as consecutive_days
            FROM history_stats
            WHERE days_below_55 >= ${daysThreshold}
            ORDER BY region, scheme_id
          `;
          break;
        default:
          query = `
            WITH latest_data AS (${baseQuery})
            SELECT * FROM latest_data
            ORDER BY region, scheme_id
          `;
      }

      const result = await client.query(query, params);


      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme LPCD Data');

      worksheet.columns = [
        { header: 'Region', key: 'region', width: 20 },
        { header: 'Circle', key: 'circle', width: 20 },
        { header: 'Division', key: 'division', width: 20 },
        { header: 'Sub Division', key: 'sub_division', width: 20 },
        { header: 'Block', key: 'block', width: 20 },
        { header: 'Scheme ID', key: 'scheme_id', width: 15 },
        { header: 'Scheme Name', key: 'scheme_name', width: 30 },
        { header: 'Total Population', key: 'total_population', width: 15 },
        { header: 'Total Villages', key: 'total_villages', width: 12 },
        { header: 'Villages >55', key: 'villages_above_55', width: 12 },
        { header: 'Villages <55', key: 'villages_below_55', width: 12 },
        { header: 'Villages Zero Supply', key: 'villages_zero_supply', width: 18 },
        { header: 'Water Value', key: 'water_value', width: 12 },
        { header: 'LPCD Value', key: 'lpcd_value', width: 12 },
        { header: 'Date', key: 'data_date', width: 12 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: row.total_population || 0,
          total_villages: row.total_villages || 0,
          villages_above_55: row.villages_above_55 || 0,
          villages_below_55: row.villages_below_55 || 0,
          villages_zero_supply: row.villages_zero_supply || 0,
          water_value: row.water_value !== null ? Number(row.water_value).toFixed(2) : 'N/A',
          lpcd_value: row.lpcd_value !== null ? Number(row.lpcd_value).toFixed(1) : 'N/A',
          data_date: row.data_date || 'N/A',
        });
      });

      const fileName = `Scheme_LPCD_${statisticLabels[statisticType]?.replace(/\s+/g, '_') || statisticType}_${region || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting Scheme LPCD details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export Scheme LPCD details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD division summary
router.get("/scheme-lpcd/division-summary", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching Scheme LPCD division summary for region: ${region || 'all'}`, { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN (${ids})`;
      }

      const params: any[] = [];
      let paramIndex = 1;
      const regionFilter = region && region !== 'All Regions'
        ? `AND region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      const query = `
        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, division, scheme_id, block, lpcd_value, water_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY region, scheme_id, block, 
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
        )
        SELECT 
          region,
          division,
          COUNT(DISTINCT scheme_id || '-' || COALESCE(block, '')) as total_schemes,
          COUNT(DISTINCT CASE 
            WHEN (water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0)
            THEN scheme_id || '-' || COALESCE(block, '')
          END) as schemes_with_water,
          COUNT(DISTINCT CASE 
            WHEN (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)
            THEN scheme_id || '-' || COALESCE(block, '')
          END) as schemes_no_water,
          COUNT(DISTINCT CASE 
            WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55 
            THEN scheme_id || '-' || COALESCE(block, '')
          END) as schemes_above_55,
          COUNT(DISTINCT CASE 
            WHEN ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0))
                 AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)
            THEN scheme_id || '-' || COALESCE(block, '')
          END) as schemes_below_55
        FROM latest_scheme_data
        WHERE region IS NOT NULL AND division IS NOT NULL
        GROUP BY region, division
        ORDER BY region, division
      `;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          region: row.region,
          division: row.division,
          totalSchemes: parseInt(row.total_schemes) || 0,
          schemesWithWater: parseInt(row.schemes_with_water) || 0,
          schemesNoWater: parseInt(row.schemes_no_water) || 0,
          schemesAbove55: parseInt(row.schemes_above_55) || 0,
          schemesBelow55: parseInt(row.schemes_below_55) || 0,
        }))
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD division summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD division summary",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD division details (schemes in a division)
router.get("/scheme-lpcd/division-details/:division/:metric", async (req, res) => {
  try {
    const { division, metric } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching Scheme LPCD division details for division: ${division}, metric: ${metric}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = '';
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN (${ids})`;
      }

      const params: any[] = [division];
      let paramIndex = 2;
      const regionFilter = region && region !== 'All Regions'
        ? `AND region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      let metricFilter = '';
      switch (metric) {
        case 'withWater':
          metricFilter = 'AND ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0))';
          break;
        case 'noWater':
          metricFilter = 'AND (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)';
          break;
        case 'above55':
          metricFilter = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55';
          break;
        case 'below55':
          metricFilter = 'AND ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0)) AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)';
          break;
      }

      const query = `
        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value, lpcd_value, data_date, dashboard_url
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
            AND division = $1
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY region, scheme_id, block, 
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
        )
        SELECT lsd.*, COALESCE(NULLIF(ss.dashboard_url, ''), lsd.dashboard_url) as dashboard_url
        FROM latest_scheme_data lsd
        LEFT JOIN scheme_status ss ON lsd.scheme_id = ss.scheme_id AND lsd.scheme_name = ss.scheme_name
        WHERE 1=1
          ${metricFilter}
        ORDER BY lsd.region, lsd.scheme_id, lsd.block
      `;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: parseInt(row.total_population) || 0,
          total_villages: parseInt(row.total_villages) || 0,
          villages_below_55: parseInt(row.villages_below_55) || 0,
          villages_above_55: parseInt(row.villages_above_55) || 0,
          villages_zero_supply: parseInt(row.villages_zero_supply) || 0,
          water_value: row.water_value ? parseFloat(row.water_value) : null,
          lpcd_value: row.lpcd_value ? parseFloat(row.lpcd_value) : null,
          data_date: row.data_date,
          dashboard_url: row.dashboard_url
        })),
        count: result.rows.length
      });

      // DEBUG: Log first few rows to check URL sources
      if (result.rows.length > 0 && result.rows[0].history_url !== undefined) {
        console.log(`DEBUG: Validation of LPCD DETAILS dashboard_url sources for ${metric} (First 5 rows):`);
        result.rows.slice(0, 5).forEach((r: any) => {
          console.log(`Scheme: ${r.scheme_id}, History: '${r.history_url}', Status: '${r.status_url}' => Selected: '${r.dashboard_url}'`);
        });
      }
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD division details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD division details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export Scheme LPCD division details to Excel
router.get("/scheme-lpcd/division-details-export/:division/:metric", async (req, res) => {
  try {
    const { division, metric } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting Scheme LPCD division details for division: ${division}, metric: ${metric}, filterType: ${filterType || fullyCompleted}`);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = '';
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN (${ids})`;
      }

      const params: any[] = [division];
      let paramIndex = 2;
      const regionFilter = region && region !== 'All Regions'
        ? `AND region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      const metricLabels: Record<string, string> = {
        'withWater': 'With Water',
        'noWater': 'No Water',
        'above55': 'Above 55 LPCD',
        'below55': 'Below 55 LPCD',
      };

      let metricFilter = '';
      switch (metric) {
        case 'withWater':
          metricFilter = 'AND ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0))';
          break;
        case 'noWater':
          metricFilter = 'AND (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)';
          break;
        case 'above55':
          metricFilter = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55';
          break;
        case 'below55':
          metricFilter = 'AND ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0)) AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)';
          break;
      }

      const query = `
        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value, lpcd_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
            AND division = $1
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY region, scheme_id, block, 
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
        )
        SELECT lsd.*, ss.dashboard_url
        FROM latest_scheme_data lsd
        LEFT JOIN scheme_status ss ON lsd.scheme_id = ss.scheme_id
        WHERE 1=1
          ${metricFilter}
        ORDER BY lsd.region, lsd.scheme_id, lsd.block
      `;

      const result = await client.query(query, params);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme LPCD Data');

      worksheet.columns = [
        { header: 'Region', key: 'region', width: 20 },
        { header: 'Circle', key: 'circle', width: 20 },
        { header: 'Division', key: 'division', width: 20 },
        { header: 'Sub Division', key: 'sub_division', width: 20 },
        { header: 'Block', key: 'block', width: 20 },
        { header: 'Scheme ID', key: 'scheme_id', width: 15 },
        { header: 'Scheme Name', key: 'scheme_name', width: 30 },
        { header: 'Total Population', key: 'total_population', width: 15 },
        { header: 'Total Villages', key: 'total_villages', width: 12 },
        { header: 'Villages >55', key: 'villages_above_55', width: 12 },
        { header: 'Villages <55', key: 'villages_below_55', width: 12 },
        { header: 'Water Value', key: 'water_value', width: 12 },
        { header: 'LPCD Value', key: 'lpcd_value', width: 12 },
        { header: 'Date', key: 'data_date', width: 12 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: row.total_population || 0,
          total_villages: row.total_villages || 0,
          villages_above_55: row.villages_above_55 || 0,
          villages_below_55: row.villages_below_55 || 0,
          water_value: row.water_value !== null ? Number(row.water_value).toFixed(2) : 'N/A',
          lpcd_value: row.lpcd_value !== null ? Number(row.lpcd_value).toFixed(1) : 'N/A',
          data_date: row.data_date || 'N/A',
        });
      });

      const fileName = `Scheme_LPCD_${division}_${metricLabels[metric]?.replace(/\s+/g, '_') || metric}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting Scheme LPCD division details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export Scheme LPCD division details",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD day-wise breakdown - OPTIMIZED with window functions
router.get("/scheme-lpcd/day-wise-breakdown", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching Scheme LPCD day-wise breakdown for region: ${region || 'all'}`, { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // No matches
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND h.scheme_id IN (${ids})`;
      }

      const regionFilter = region && region !== 'All Regions' ? `AND h.region = $1` : '';
      const params = region && region !== 'All Regions' ? [region] : [];

      // OPTIMIZED: Use window functions for consecutive day calculation
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
            scheme_id,
            COALESCE(block, '') as block,
            lpcd_value::numeric as lpcd_value,
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
          WHERE data_date IS NOT NULL
            AND lpcd_value IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id,
            block,
            lpcd_value,
            parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT 
            scheme_id,
            block,
            rn,
            is_below_55,
            is_above_55,
            has_water,
            no_water,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, is_below_55 ORDER BY rn) as grp_below_55,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, is_above_55 ORDER BY rn) as grp_above_55,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, has_water ORDER BY rn) as grp_with_water,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, no_water ORDER BY rn) as grp_no_water
          FROM ranked
          WHERE rn <= 30
        ),
        consecutive_streaks AS (
          SELECT 
            scheme_id,
            block,
            MAX(CASE WHEN is_below_55 = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.block = with_groups.block 
               AND wg2.is_below_55 = 1 
               AND wg2.grp_below_55 = with_groups.grp_below_55)
            ELSE 0 END) as consecutive_below_55,
            MAX(CASE WHEN is_above_55 = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.block = with_groups.block 
               AND wg2.is_above_55 = 1 
               AND wg2.grp_above_55 = with_groups.grp_above_55)
            ELSE 0 END) as consecutive_above_55,
            MAX(CASE WHEN has_water = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.block = with_groups.block 
               AND wg2.has_water = 1 
               AND wg2.grp_with_water = with_groups.grp_with_water)
            ELSE 0 END) as consecutive_with_water,
            MAX(CASE WHEN no_water = 1 AND rn = 1 THEN 
              (SELECT COUNT(*) FROM with_groups wg2 
               WHERE wg2.scheme_id = with_groups.scheme_id 
               AND wg2.block = with_groups.block 
               AND wg2.no_water = 1 
               AND wg2.grp_no_water = with_groups.grp_no_water)
            ELSE 0 END) as consecutive_no_water
          FROM with_groups
          GROUP BY scheme_id, block
        ),
        day_counts AS (
          SELECT LEAST(consecutive_below_55, 30) as days_count, 'below_55' as metric_type
          FROM consecutive_streaks WHERE consecutive_below_55 > 0
          UNION ALL
          SELECT LEAST(consecutive_above_55, 30), 'above_55'
          FROM consecutive_streaks WHERE consecutive_above_55 > 0
          UNION ALL
          SELECT LEAST(consecutive_with_water, 30), 'with_water'
          FROM consecutive_streaks WHERE consecutive_with_water > 0
          UNION ALL
          SELECT LEAST(consecutive_no_water, 30), 'no_water'
          FROM consecutive_streaks WHERE consecutive_no_water > 0
        )
        SELECT 
          gs.days,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'below_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as below_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'above_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as above_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'with_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as with_water,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'no_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as no_water
        FROM (SELECT generate_series(1, 30) as days) gs
        LEFT JOIN day_counts dc ON TRUE
        GROUP BY gs.days
        ORDER BY gs.days DESC
      `;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          days: parseInt(row.days),
          below_55: parseInt(row.below_55) || 0,
          above_55: parseInt(row.above_55) || 0,
          no_water: parseInt(row.no_water) || 0,
          with_water: parseInt(row.with_water) || 0,
        }))
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD day-wise breakdown:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD day-wise breakdown",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD day-wise breakdown for all regions - OPTIMIZED single query
router.get("/scheme-lpcd/day-wise-breakdown/all-regions", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;
    console.log("Fetching Scheme LPCD day-wise breakdown for all regions", { fullyCompleted, filterType });

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND h.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // OPTIMIZED: Single query that processes all regions at once
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
            region,
            scheme_id,
            COALESCE(block, '') as block,
            lpcd_value::numeric as lpcd_value,
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
          WHERE data_date IS NOT NULL
          ${schemeIdFilter}
            AND lpcd_value IS NOT NULL
            AND region IS NOT NULL
          ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            region, scheme_id, block, lpcd_value, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY region, scheme_id, block ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT 
            region, scheme_id, block, rn, is_below_55, is_above_55, has_water, no_water,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, block, is_below_55 ORDER BY rn) as grp_below_55,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, block, is_above_55 ORDER BY rn) as grp_above_55,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, block, has_water ORDER BY rn) as grp_with_water,
            rn - ROW_NUMBER() OVER (PARTITION BY region, scheme_id, block, no_water ORDER BY rn) as grp_no_water
          FROM ranked WHERE rn <= 30
        ),
        first_row_info AS (
          SELECT region, scheme_id, block, 
                 is_below_55 as first_below_55, grp_below_55,
                 is_above_55 as first_above_55, grp_above_55,
                 has_water as first_has_water, grp_with_water,
                 no_water as first_no_water, grp_no_water
          FROM with_groups WHERE rn = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.region, wg.scheme_id, wg.block,
            SUM(CASE WHEN fri.first_below_55 = 1 AND wg.is_below_55 = 1 AND wg.grp_below_55 = fri.grp_below_55 THEN 1 ELSE 0 END) as consecutive_below_55,
            SUM(CASE WHEN fri.first_above_55 = 1 AND wg.is_above_55 = 1 AND wg.grp_above_55 = fri.grp_above_55 THEN 1 ELSE 0 END) as consecutive_above_55,
            SUM(CASE WHEN fri.first_has_water = 1 AND wg.has_water = 1 AND wg.grp_with_water = fri.grp_with_water THEN 1 ELSE 0 END) as consecutive_with_water,
            SUM(CASE WHEN fri.first_no_water = 1 AND wg.no_water = 1 AND wg.grp_no_water = fri.grp_no_water THEN 1 ELSE 0 END) as consecutive_no_water
          FROM with_groups wg
          JOIN first_row_info fri ON wg.region = fri.region AND wg.scheme_id = fri.scheme_id AND wg.block = fri.block
          GROUP BY wg.region, wg.scheme_id, wg.block
        ),
        day_counts AS (
          SELECT region, LEAST(consecutive_below_55, 30) as days_count, 'below_55' as metric_type
          FROM consecutive_counts WHERE consecutive_below_55 > 0
          UNION ALL
          SELECT region, LEAST(consecutive_above_55, 30), 'above_55'
          FROM consecutive_counts WHERE consecutive_above_55 > 0
          UNION ALL
          SELECT region, LEAST(consecutive_with_water, 30), 'with_water'
          FROM consecutive_counts WHERE consecutive_with_water > 0
          UNION ALL
          SELECT region, LEAST(consecutive_no_water, 30), 'no_water'
          FROM consecutive_counts WHERE consecutive_no_water > 0
        )
        SELECT 
          dc.region,
          gs.days,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'below_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as below_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'above_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as above_55,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'with_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as with_water,
          COALESCE(SUM(CASE WHEN dc.metric_type = 'no_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as no_water
        FROM (SELECT generate_series(1, 30) as days) gs
        CROSS JOIN (SELECT DISTINCT region FROM day_counts) regions
        LEFT JOIN day_counts dc ON dc.region = regions.region
        GROUP BY dc.region, gs.days
        ORDER BY dc.region, gs.days DESC
      `;

      const result = await client.query(query);

      // Group results by region
      const allRegionData: { [region: string]: any[] } = {};
      result.rows.forEach((row: any) => {
        if (!row.region) return;
        if (!allRegionData[row.region]) {
          allRegionData[row.region] = [];
        }
        allRegionData[row.region].push({
          days: parseInt(row.days),
          below_55: parseInt(row.below_55) || 0,
          above_55: parseInt(row.above_55) || 0,
          with_water: parseInt(row.with_water) || 0,
          no_water: parseInt(row.no_water) || 0,
        });
      });

      res.json({
        success: true,
        data: allRegionData
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD day-wise breakdown for all regions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD day-wise breakdown for all regions",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD day-wise schemes list - OPTIMIZED with proper consecutive day calculation
router.get("/scheme-lpcd/day-wise-schemes/:metric/:days", async (req, res) => {
  try {
    const { metric, days } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Fetching Scheme LPCD day-wise schemes for metric: ${metric}, days: ${days}, region: ${region || 'all'}`, { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const daysNum = parseInt(days);

      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
          // No matches
        }
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND h.scheme_id IN (${ids})`;
      }

      const params: any[] = [daysNum];
      let paramIndex = 2;
      const regionFilter = region && region !== 'All Regions'
        ? `AND h.region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      // Map metric names to flag columns
      let metricFlag = 'is_below_55';
      switch (metric) {
        case 'below55':
        case 'below_55':
          metricFlag = 'is_below_55';
          break;
        case 'above55':
        case 'above_55':
          metricFlag = 'is_above_55';
          break;
        case 'noSupply':
        case 'no_water':
          metricFlag = 'no_water';
          break;
        case 'with_water':
          metricFlag = 'has_water';
          break;
      }

      // OPTIMIZED: Use proper consecutive day calculation matching the breakdown
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
            scheme_id,
            COALESCE(block, '') as block,
            region, circle, division, sub_division, scheme_name,
            total_population, total_villages, dashboard_url,
            lpcd_value::numeric as lpcd_value,
            water_value,
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
          WHERE data_date IS NOT NULL
            AND lpcd_value IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id, block, region, circle, division, sub_division, scheme_name,
            total_population, total_villages, dashboard_url,
            lpcd_value, water_value, data_date, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT *,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, ${metricFlag} ORDER BY rn) as grp
          FROM ranked WHERE rn <= 30
        ),
        first_row_groups AS (
          SELECT scheme_id, block, grp
          FROM with_groups 
          WHERE rn = 1 AND ${metricFlag} = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.scheme_id, wg.block,
            COUNT(*) as consecutive_days
          FROM with_groups wg
          INNER JOIN first_row_groups frg 
            ON wg.scheme_id = frg.scheme_id 
            AND wg.block = frg.block 
            AND wg.grp = frg.grp
          WHERE wg.${metricFlag} = 1
          GROUP BY wg.scheme_id, wg.block
        ),
        latest_data AS (
          SELECT * FROM ranked WHERE rn = 1
        )
        SELECT 
          ld.region, ld.circle, ld.division, ld.sub_division, ld.block,
          ld.scheme_id, ld.scheme_name, ld.total_population, ld.total_villages,
          COALESCE(cc.consecutive_days, 0) as consecutive_days,
          ld.lpcd_value as latest_lpcd_value,
          ld.water_value as latest_water_value,
          ld.data_date as latest_date,
          COALESCE(NULLIF(ss.dashboard_url, ''), ld.dashboard_url) as dashboard_url
        FROM latest_data ld
        LEFT JOIN consecutive_counts cc ON ld.scheme_id = cc.scheme_id AND ld.block = cc.block
        LEFT JOIN scheme_status ss ON ld.scheme_id = ss.scheme_id AND ld.scheme_name = ss.scheme_name
        WHERE COALESCE(cc.consecutive_days, 0) >= $1
        ORDER BY COALESCE(cc.consecutive_days, 0) DESC, ld.region, ld.scheme_name
      `;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: parseInt(row.total_population) || 0,
          total_villages: parseInt(row.total_villages) || 0,
          consecutive_days: parseInt(row.consecutive_days) || 0,
          latest_lpcd_value: row.latest_lpcd_value ? parseFloat(row.latest_lpcd_value) : null,
          latest_water_value: row.latest_water_value ? parseFloat(row.latest_water_value) : null,
          latest_date: row.latest_date,
          dashboard_url: row.dashboard_url
        })),
        count: result.rows.length
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD day-wise schemes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD day-wise schemes",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export Scheme LPCD day-wise schemes to Excel
router.get("/scheme-lpcd/day-wise-schemes-export/:metric/:days", async (req, res) => {
  try {
    const { metric, days } = req.params;
    const { region, fullyCompleted, filterType } = req.query;

    console.log(`Exporting Scheme LPCD day-wise schemes for metric: ${metric}, days: ${days}`, { fullyCompleted, filterType });

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const daysNum = parseInt(days);

      // Get filtered scheme IDs if filter is enabled
      let schemeIdFilter = "";
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND h.scheme_id IN (${ids})`;
      }

      const params: any[] = [daysNum];
      let paramIndex = 2;
      const regionFilter = region && region !== 'All Regions'
        ? `AND h.region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      // Map metric names to flag columns
      let metricFlag = 'is_below_55';
      switch (metric) {
        case 'below55':
        case 'below_55':
          metricFlag = 'is_below_55';
          break;
        case 'above55':
        case 'above_55':
          metricFlag = 'is_above_55';
          break;
        case 'noSupply':
        case 'no_water':
          metricFlag = 'no_water';
          break;
        case 'with_water':
          metricFlag = 'has_water';
          break;
      }

      const metricLabels: Record<string, string> = {
        'below55': 'Below 55 LPCD',
        'above55': 'Above 55 LPCD',
        'noSupply': 'No Supply',
        'with_water': 'With Water'
      };

      // OPTIMIZED: Use proper consecutive day calculation (SAME AS LIST VIEW)
      const query = `
        WITH 
        deduplicated AS (
          SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
            scheme_id,
            COALESCE(block, '') as block,
            region, circle, division, sub_division, scheme_name,
            total_population, total_villages,
            lpcd_value::numeric as lpcd_value,
            water_value,
            data_date,
            CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
          WHERE data_date IS NOT NULL
            AND lpcd_value IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
        ),
        ranked AS (
          SELECT 
            scheme_id, block, region, circle, division, sub_division, scheme_name,
            total_population, total_villages,
            lpcd_value, water_value, data_date, parsed_date,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST) as rn,
            CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
            CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
          FROM deduplicated
          WHERE parsed_date IS NOT NULL
        ),
        with_groups AS (
          SELECT *,
            rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, block, ${metricFlag} ORDER BY rn) as grp
          FROM ranked WHERE rn <= 30
        ),
        first_row_groups AS (
          SELECT scheme_id, block, grp
          FROM with_groups 
          WHERE rn = 1 AND ${metricFlag} = 1
        ),
        consecutive_counts AS (
          SELECT 
            wg.scheme_id, wg.block,
            COUNT(*) as consecutive_days
          FROM with_groups wg
          INNER JOIN first_row_groups frg 
            ON wg.scheme_id = frg.scheme_id 
            AND wg.block = frg.block 
            AND wg.grp = frg.grp
          WHERE wg.${metricFlag} = 1
          GROUP BY wg.scheme_id, wg.block
        ),
        latest_data AS (
          SELECT * FROM ranked WHERE rn = 1
        )
        SELECT 
          ld.region, ld.circle, ld.division, ld.sub_division, ld.block,
          ld.scheme_id, ld.scheme_name, ld.total_population, ld.total_villages,
          COALESCE(cc.consecutive_days, 0) as consecutive_days,
          ld.lpcd_value as latest_lpcd_value,
          ld.water_value as latest_water_value,
          ld.data_date as latest_date
        FROM latest_data ld
        LEFT JOIN consecutive_counts cc ON ld.scheme_id = cc.scheme_id AND ld.block = cc.block
        WHERE COALESCE(cc.consecutive_days, 0) >= $1
        ORDER BY COALESCE(cc.consecutive_days, 0) DESC, ld.region, ld.scheme_name
      `;

      const result = await client.query(query, params);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme LPCD Day-Wise');

      worksheet.columns = [
        { header: 'Region', key: 'region', width: 20 },
        { header: 'Circle', key: 'circle', width: 20 },
        { header: 'Division', key: 'division', width: 20 },
        { header: 'Sub Division', key: 'sub_division', width: 20 },
        { header: 'Block', key: 'block', width: 20 },
        { header: 'Scheme ID', key: 'scheme_id', width: 15 },
        { header: 'Scheme Name', key: 'scheme_name', width: 30 },
        { header: 'Total Population', key: 'total_population', width: 15 },
        { header: 'Total Villages', key: 'total_villages', width: 12 },
        { header: 'Consecutive Days', key: 'consecutive_days', width: 15 },
        { header: 'Latest LPCD', key: 'latest_lpcd_value', width: 12 },
        { header: 'Latest Water', key: 'latest_water_value', width: 12 },
        { header: 'Latest Date', key: 'latest_date', width: 12 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: row.total_population || 0,
          total_villages: row.total_villages || 0,
          consecutive_days: row.consecutive_days || 0,
          latest_lpcd_value: row.latest_lpcd_value !== null ? Number(row.latest_lpcd_value).toFixed(1) : 'N/A',
          latest_water_value: row.latest_water_value !== null ? Number(row.latest_water_value).toFixed(2) : 'N/A',
          latest_date: row.latest_date || 'N/A',
        });
      });

      const fileName = `Scheme_LPCD_${metricLabels[metric]?.replace(/\s+/g, '_') || metric}_${days}Days_${region || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting Scheme LPCD day-wise schemes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export Scheme LPCD day-wise schemes",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD region comparison (all regions with current day data)
router.get("/scheme-lpcd/region-comparison", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;
    console.log("Fetching Scheme LPCD region comparison data", { fullyCompleted, filterType });

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        // No matches
      }
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND calculated.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get latest data date from water_scheme_data (assuming day7 is latest)
      const latestDateResult = await client.query(`
        SELECT MAX(lpcd_date_day7) as latest_date 
        FROM water_scheme_data 
        WHERE lpcd_date_day7 IS NOT NULL
      `);
      const latestDate = latestDateResult.rows[0]?.latest_date || new Date().toISOString().split('T')[0];

      const query = `
        -- First, get a clean, deduplicated view of the raw village data with correct LPCD counts
        WITH village_counts AS (
          SELECT 
            scheme_id,
            block,
            village_name,
            CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data
        ),
        
        -- Create deduplicated village data with only one row per village
        deduplicated_villages AS (
          SELECT DISTINCT ON (scheme_id, block, village_name)
            scheme_id,
            scheme_name,
            region,
            block,
            village_name,
            population,
            water_value_day1,
            water_value_day2,
            water_value_day3,
            water_value_day4,
            water_value_day5,
            water_value_day6,
            water_value_day7
          FROM water_scheme_data
          ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
        ),
        
        -- First summarize by village to get single status per village
        village_status AS (
          SELECT
            scheme_id,
            block,
            village_name,
            MAX(is_above_55) as has_above_55,
            MAX(is_below_55) as has_below_55,
            MAX(is_zero_supply) as has_zero_supply
          FROM village_counts
          GROUP BY scheme_id, block, village_name
        ),
        
        -- Then aggregate to scheme/block level
        lpcd_aggregation AS (
          SELECT
            scheme_id,
            block,
            COUNT(DISTINCT village_name) as total_villages,
            SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status
          GROUP BY scheme_id, block
        ),

        -- Now aggregate the deduplicated data with correct village counts
        scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            wsd.block,
            SUM(wsd.population) as total_population,
            
            -- Water supply aggregation for ALL 7 days
            SUM(wsd.water_value_day1) as total_water_day1,
            SUM(wsd.water_value_day2) as total_water_day2,
            SUM(wsd.water_value_day3) as total_water_day3,
            SUM(wsd.water_value_day4) as total_water_day4,
            SUM(wsd.water_value_day5) as total_water_day5,
            SUM(wsd.water_value_day6) as total_water_day6,
            SUM(wsd.water_value_day7) as total_water_day7
          FROM 
            deduplicated_villages wsd
          JOIN
            lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
          GROUP BY 
            wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block
        ),
        
        -- Calculate the LPCD values for each scheme
        scheme_calculated_values AS (
          SELECT 
            scheme_id,
            scheme_name,
            region,
            block,
            
            -- Calculate the LPCD values for each day
            CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day2 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day2,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day3 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day3,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day4 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day4,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day5 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day5,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day6 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day6,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,

            total_water_day7
          FROM scheme_aggregation
        )
        
        -- Final aggregation by region
        SELECT 
          region,
          COUNT(*) as total_schemes,
          SUM(CASE 
            WHEN latest_lpcd_value > 55 
            THEN 1 
            ELSE 0 
          END) as above_55,
          SUM(CASE 
            WHEN latest_lpcd_value > 0 AND latest_lpcd_value <= 55 
            THEN 1 
            ELSE 0 
          END) as below_55,
          SUM(CASE 
            WHEN latest_lpcd_value > 0 
            THEN 1 
            ELSE 0 
          END) as with_water,
          SUM(CASE 
            WHEN latest_lpcd_value = 0 
            THEN 1 
            ELSE 0 
          END) as no_water
        FROM (
          SELECT 
            calculated.*,
            COALESCE(
              lpcd_value_day7, 
              lpcd_value_day6, 
              lpcd_value_day5, 
              lpcd_value_day4, 
              lpcd_value_day3, 
              lpcd_value_day2, 
              lpcd_value_day1, 
              0
            ) as latest_lpcd_value,
            total_water_day7 as latest_water_value
          FROM (
            SELECT DISTINCT ON (region, scheme_name) *
            FROM scheme_calculated_values
            WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
            ORDER BY region, scheme_name, block
          ) calculated
          WHERE region IS NOT NULL
          ${schemeIdFilter}
        ) final_data
        GROUP BY region
        ORDER BY region
      `;

      const result = await client.query(query);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          region: row.region,
          total_schemes: parseInt(row.total_schemes) || 0,
          above_55: parseInt(row.above_55) || 0,
          below_55: parseInt(row.below_55) || 0,
          with_water: parseInt(row.with_water) || 0,
          no_water: parseInt(row.no_water) || 0,
        })),
        latestDate
      });
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD region comparison:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD region comparison",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Scheme LPCD region comparison schemes list (current day data)
router.get("/scheme-lpcd/region-comparison-schemes/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, fullyCompleted, dates, filterType } = req.query;

    console.log(`Fetching Scheme LPCD region comparison schemes for category: ${category}, region: ${region || 'all'}, filterType: ${filterType || fullyCompleted}, dates: ${dates}`);

    // Get filtered scheme IDs if filter is enabled
    let schemeIdFilter = "";
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND sldh.scheme_id IN (${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const params: any[] = [];
      let paramIndex = 1;
      const regionFilter = region && region !== 'All Regions'
        ? `AND sldh.region = $${paramIndex++}`
        : '';
      if (region && region !== 'All Regions') params.push(region);

      let query = '';

      if (category.startsWith('weekly_')) {
        if (!dates) {
          return res.status(400).json({ success: false, error: "Dates required for weekly comparison" });
        }

        const dateList = (dates as string).split(',');
        // normalize query dates logic if needed, but assuming direct string match or simple normalization
        // Using a simpler approach: Filter where data_date matches ANY of the provided dates

        const metric = category.replace('weekly_', '');
        let havingCondition = '';
        if (metric === 'above_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) >= 55';
        } else if (metric === 'below_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) > 0 AND (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) < 55';
        } else if (metric === 'no_water') {
          havingCondition = '((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) IS NULL OR (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) = 0)';
        } else {
          havingCondition = '1=1';
        }

        // Pass dates as parameter array
        const dateParams = dateList.map((_, i) => `$${paramIndex++}`).join(',');
        params.push(...dateList);

        query = `
            WITH weekly_data AS (
                SELECT DISTINCT ON (sldh.region, sldh.scheme_id, sldh.block, sldh.data_date)
                    sldh.region, sldh.circle, sldh.division, sldh.sub_division, 
                    COALESCE(NULLIF(TRIM(sldh.block), ''), ss.block) as block,
                    sldh.scheme_id, sldh.scheme_name, sldh.total_population, sldh.total_villages,
                    sldh.lpcd_value, sldh.water_value, sldh.data_date, COALESCE(NULLIF(ss.dashboard_url, ''), sldh.dashboard_url) as dashboard_url
                FROM scheme_lpcd_data_history sldh
                LEFT JOIN scheme_status ss ON ss.scheme_id = sldh.scheme_id AND ss.scheme_name = sldh.scheme_name
                WHERE sldh.region IS NOT NULL
                ${regionFilter}
                ${schemeIdFilter}
                AND sldh.data_date IN (${dateParams})
                ORDER BY sldh.region, sldh.scheme_id, sldh.block, sldh.data_date, sldh.uploaded_at DESC
            )
            SELECT
                region, MAX(circle) as circle, MAX(division) as division, MAX(sub_division) as sub_division, block,
                scheme_id, MAX(scheme_name) as scheme_name, MAX(total_population) as total_population, MAX(total_villages) as total_villages,
                ROUND((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0), 2) as lpcd_value,
                ROUND((SUM(COALESCE(NULLIF(TRIM(water_value::text), '')::numeric, 0)) / 7.0), 2) as water_value,
                MAX(data_date) as data_date,
                (ARRAY_AGG(dashboard_url ORDER BY TO_DATE(data_date, 'DD-Mon-YY') DESC))[1] as dashboard_url
            FROM weekly_data
            GROUP BY region, scheme_id, block
            HAVING ${havingCondition}
            ORDER BY region, scheme_id 
         `;
      } else {

        let metricCondition = '';
        switch (category) {
          case 'above_55':
            metricCondition = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric > 55';
            break;
          case 'below_55':
            metricCondition = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55';
            break;
          case 'with_water':
            metricCondition = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric > 0';
            break;
          case 'no_water':
            metricCondition = 'AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)';
            break;
          default:
            metricCondition = '';
        }

        let updatedMetricCondition = metricCondition
          .replace(/lpcd_value/g, 'ld.latest_lpcd_value')
          .replace(/water_value/g, 'ld.latest_water_value');
        let updatedRegionFilter = regionFilter.replace(/sldh\./g, 'ld.');
        let updatedSchemeIdFilter = schemeIdFilter.replace(/sldh\./g, 'ld.');

        query = `
        WITH village_counts AS (
          SELECT 
            scheme_id,
            block,
            village_name,
            CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data
        ),
        deduplicated_villages AS (
          SELECT DISTINCT ON (scheme_id, block, village_name)
            scheme_id, scheme_name, region, block, village_name, population,
            water_value_day1, water_value_day2, water_value_day3, water_value_day4,
            water_value_day5, water_value_day6, water_value_day7
          FROM water_scheme_data
          ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
        ),
        village_status AS (
          SELECT scheme_id, block, village_name,
            MAX(is_above_55) as has_above_55,
            MAX(is_below_55) as has_below_55,
            MAX(is_zero_supply) as has_zero_supply
          FROM village_counts
          GROUP BY scheme_id, block, village_name
        ),
        lpcd_aggregation AS (
          SELECT scheme_id, block,
            COUNT(DISTINCT village_name) as total_villages,
            SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status
          GROUP BY scheme_id, block
        ),
        scheme_aggregation AS (
          SELECT 
            wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block,
            SUM(wsd.population) as total_population,
            SUM(wsd.water_value_day1) as total_water_day1,
            SUM(wsd.water_value_day2) as total_water_day2,
            SUM(wsd.water_value_day3) as total_water_day3,
            SUM(wsd.water_value_day4) as total_water_day4,
            SUM(wsd.water_value_day5) as total_water_day5,
            SUM(wsd.water_value_day6) as total_water_day6,
            SUM(wsd.water_value_day7) as total_water_day7
          FROM deduplicated_villages wsd
          JOIN lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
          GROUP BY wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block
        ),
        scheme_calculated_values AS (
          SELECT scheme_id, scheme_name, region, block,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day2 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day2,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day3 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day3,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day4 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day4,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day5 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day5,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day6 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day6,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
            total_water_day1, total_water_day2, total_water_day3,
            total_water_day4, total_water_day5, total_water_day6, total_water_day7
          FROM scheme_aggregation
        ),
        live_data AS (
          SELECT 
            calculated.*,
            COALESCE(
              lpcd_value_day7, 
              lpcd_value_day6, 
              lpcd_value_day5, 
              lpcd_value_day4, 
              lpcd_value_day3, 
              lpcd_value_day2, 
              lpcd_value_day1, 
              0
            ) as latest_lpcd_value,
            total_water_day7 as latest_water_value
          FROM (
            SELECT DISTINCT ON (region, scheme_name) *
            FROM scheme_calculated_values
            WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
            ORDER BY region, scheme_name, block
          ) calculated
        ),
        latest_history AS (
          SELECT DISTINCT ON (sldh.scheme_id, sldh.block)
            sldh.scheme_id, sldh.block,
            sldh.circle, sldh.division, sldh.sub_division, sldh.data_date,
            COALESCE(NULLIF(ss.dashboard_url, ''), sldh.dashboard_url) as dashboard_url
          FROM scheme_lpcd_data_history sldh
          LEFT JOIN scheme_status ss ON ss.scheme_id = sldh.scheme_id AND ss.scheme_name = sldh.scheme_name
          ORDER BY sldh.scheme_id, sldh.block, sldh.uploaded_at DESC
        )
        SELECT * FROM (
          SELECT DISTINCT ON (ld.scheme_id)
            ld.region, lh.circle, lh.division, lh.sub_division, ld.block,
            ld.scheme_id, ld.scheme_name, 
            sa.total_population, la.total_villages,
            la.villages_above_55 as villages_above_55, 
            la.villages_below_55 as villages_below_55, 
            la.villages_zero_supply as villages_zero_supply,
            ld.latest_lpcd_value as lpcd_value, 
            ld.latest_water_value as water_value, 
            lh.data_date, 
            lh.dashboard_url
          FROM live_data ld
          LEFT JOIN latest_history lh ON ld.scheme_id = lh.scheme_id AND ld.block = lh.block
          LEFT JOIN lpcd_aggregation la ON ld.scheme_id = la.scheme_id AND ld.block = la.block
          LEFT JOIN scheme_aggregation sa ON ld.scheme_id = sa.scheme_id AND ld.block = sa.block
          WHERE ld.region IS NOT NULL
            ${updatedRegionFilter}
            ${updatedSchemeIdFilter}
            ${updatedMetricCondition}
          ORDER BY ld.scheme_id, ld.block
        ) as t
        ORDER BY region, scheme_name, block
      `;
      }

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          region: row.region,
          total_schemes: parseInt(row.total_schemes) || 0,
          above_55: parseInt(row.above_55) || 0,
          below_55: parseInt(row.below_55) || 0,
          with_water: parseInt(row.with_water) || 0,
          no_water: parseInt(row.no_water) || 0,
          // Re-map fields that are needed for the frontend
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,  // Added for issue matching
          scheme_name: row.scheme_name,
          total_population: parseInt(row.total_population) || 0,
          total_villages: parseInt(row.total_villages) || 0,
          lpcd_value: row.lpcd_value ? parseFloat(row.lpcd_value) : null,
          water_value: row.water_value ? parseFloat(row.water_value) : null,
          data_date: row.data_date,
          dashboard_url: row.dashboard_url
        })),
        count: result.rows.length
      });

      // DEBUG: Log first few rows to check URL sources
      if (result.rows.length > 0 && result.rows[0].history_url !== undefined) {
        console.log("DEBUG: Validation of dashboard_url sources (First 5 rows):");
        result.rows.slice(0, 5).forEach((r: any) => {
          console.log(`Scheme: ${r.scheme_id}, History: '${r.history_url}', Status: '${r.status_url}' => Selected: '${r.dashboard_url}'`);
        });
      }
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error fetching Scheme LPCD region comparison schemes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Scheme LPCD region comparison schemes",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export Current Day Scheme LPCD region comparison schemes to Excel
router.get("/scheme-lpcd/region-comparison-schemes-export-current/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, fullyCompleted, dates, filterType } = req.query;

    console.log(`Exporting Current Scheme LPCD comparison for category: ${category}, dates: ${dates} `);

    // Fetch filtered schemes
    let schemeIdFilter = '';
    const db = await getDB();
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

    if (filteredIds) {
      const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
      schemeIdFilter = `AND scheme_id IN(${ids})`;
    }

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      const params: any[] = [];
      let paramIndex = 1;
      const regionFilter = region && region !== 'All Regions'
        ? `AND region = $${paramIndex++} `
        : '';
      if (region && region !== 'All Regions') params.push(region);

      let metricCondition = '';

      let query = '';

      if (category.startsWith('weekly_')) {
        if (!dates) {
          return res.status(400).json({ success: false, error: "Dates required for weekly comparison export" });
        }
        const dateList = (dates as string).split(',');
        // normalize query dates logic if needed, but assuming direct string match or simple normalization

        const metric = category.replace('weekly_', '');
        let havingCondition = '';

        if (metric === 'above_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) > 55';
        } else if (metric === 'below_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) > 0 AND (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) <= 55';
        } else if (metric === 'no_water') {
          havingCondition = '((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) IS NULL OR (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) = 0)';
        }

        // Pass dates as parameter array
        const dateParams = dateList.map((_, i) => `$${paramIndex++} `).join(',');
        params.push(...dateList);

        query = `
        WITH weekly_data AS (
          SELECT DISTINCT ON (scheme_id, village_name, data_date)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            lpcd_value, water_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
          ${regionFilter}
          AND(
            data_date IN(${dateParams})
          )
          ORDER BY scheme_id, village_name, data_date, uploaded_at DESC
        )
        SELECT
            region, MAX(circle) as circle, MAX(division) as division, MAX(sub_division) as sub_division, block, MAX(completion_status) as completion_status,
            scheme_id, MAX(scheme_name) as scheme_name, MAX(total_population) as total_population, MAX(total_villages) as total_villages,
            ROUND((SUM(COALESCE(NULLIF(TRIM(lpcd_value:: text), '')::numeric, 0)) / 7.0), 2) as lpcd_value,
            ROUND((SUM(COALESCE(NULLIF(TRIM(water_value:: text), '')::numeric, 0)) / 7.0), 2) as water_value,
            MAX(data_date) as data_date
        FROM(
            SELECT *, NULL as completion_status FROM weekly_data
        ) t
        GROUP BY region, scheme_id, block
        HAVING ${havingCondition}
        ORDER BY region, scheme_id
            `;
      } else {

        switch (category) {
          case 'above_55':
            metricCondition = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric > 55';
            break;
          case 'below_55':
            metricCondition = 'AND lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55';
            break;
          case 'with_water':
            metricCondition = 'AND water_value IS NOT NULL AND water_value::numeric > 0';
            break;
          case 'no_water':
            metricCondition = 'AND (water_value IS NULL OR water_value::numeric = 0)';
            break;
          default:
            metricCondition = '';
        }

        query = `
        WITH latest_scheme_data AS(
              SELECT DISTINCT ON(region, scheme_id, block)
            region, circle, division, sub_division, block,
              scheme_id, scheme_name, total_population, total_villages,
              lpcd_value, water_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
            ${regionFilter}
            ${schemeIdFilter}
          ORDER BY region, scheme_id, block,
              CASE 
              WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date:: date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'):: int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
          )
        SELECT *
            FROM latest_scheme_data
        WHERE 1 = 1
          ${metricCondition}
        ORDER BY region, scheme_id, block
            `;
      }

      const result = await client.query(query, params);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme LPCD Comparison');

      worksheet.columns = [
        { header: 'Region', key: 'region', width: 15 },
        { header: 'Circle', key: 'circle', width: 15 },
        { header: 'Division', key: 'division', width: 15 },
        { header: 'Sub Division', key: 'sub_division', width: 15 },
        { header: 'Block', key: 'block', width: 15 },
        { header: 'Scheme ID', key: 'scheme_id', width: 15 },
        { header: 'Scheme Name', key: 'scheme_name', width: 30 },
        { header: 'Total Pop', key: 'total_population', width: 12 },
        { header: 'Villages', key: 'total_villages', width: 10 },
        { header: 'LPCD', key: 'lpcd_value', width: 10 },
        { header: 'Water Value', key: 'water_value', width: 12 },
        { header: 'Date', key: 'data_date', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: parseInt(row.total_population) || 0,
          total_villages: parseInt(row.total_villages) || 0,
          lpcd_value: row.lpcd_value ? parseFloat(row.lpcd_value) : null,
          water_value: row.water_value ? parseFloat(row.water_value) : null,
          data_date: row.data_date,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = scheme_lpcd_comparison_${category}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting Scheme LPCD comparison:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export Scheme LPCD comparison",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export Scheme LPCD region comparison schemes to Excel
router.get("/scheme-lpcd/region-comparison-schemes-export/:category/:day", async (req, res) => {
  try {
    const { category, day } = req.params;
    const { region, dates, fullyCompleted, filterType } = req.query;

    console.log(`Exporting Scheme LPCD region comparison schemes for category: ${category}, day: ${day}, dates: ${dates}, fullyCompleted: ${fullyCompleted}, filterType: ${filterType} `);

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get filtered scheme IDs
      let schemeIdFilter = '';
      const db = await getDB();
      const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);

      if (filteredIds) {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN(${ids})`;
      }
      const dayNum = parseInt(day);
      const params: any[] = [dayNum];
      let paramIndex = 2;
      const regionFilter = region && region !== 'All Regions'
        ? `AND region = $${paramIndex++} `
        : '';
      if (region && region !== 'All Regions') params.push(region);

      // Remove duplicate param push - already done above
      // if (region && region !== 'All Regions') params.push(region);

      let query = '';

      const categoryLabels: Record<string, string> = {
        'above55': 'Above 55 LPCD',
        'below55': 'Below 55 LPCD',
        'weekly_above_55': 'Weekly Avg >55 LPCD',
        'weekly_below_55': 'Weekly Avg <55 LPCD',
        'weekly_no_water': 'Weekly Avg No Water',
      };

      if (category.startsWith('weekly_')) {
        if (!dates) {
          return res.status(400).json({ success: false, error: "Dates required for weekly comparison export" });
        }
        const dateList = (dates as string).split(',');
        let paramIndex2 = params.length + 1;

        const metric = category.replace('weekly_', '');
        let havingCondition = '';

        if (metric === 'above_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) >= 55';
        } else if (metric === 'below_55') {
          havingCondition = '(SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) > 0 AND (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) < 55';
        } else if (metric === 'no_water') {
          havingCondition = '((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) IS NULL OR (SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), \'\')::numeric, 0)) / 7.0) = 0)';
        }

        const dateParams = dateList.map((_, i) => `$${paramIndex2++} `).join(',');
        params.push(...dateList);

        query = `
        WITH weekly_data AS (
          SELECT DISTINCT ON (region, scheme_id, block, data_date)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            lpcd_value, water_value, data_date, dashboard_url
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
          ${regionFilter}
          ${schemeIdFilter}
          AND $1:: int IS NOT NULL-- Fix: usage of dayNum param to avoid postgres binding error
          AND(
              data_date IN(${dateParams})
            )
          ORDER BY region, scheme_id, block, data_date, uploaded_at DESC
        )
        SELECT
            region, MAX(circle) as circle, MAX(division) as division, MAX(sub_division) as sub_division, block, MAX(completion_status) as completion_status,
            scheme_id, MAX(scheme_name) as scheme_name, MAX(total_population) as total_population, MAX(total_villages) as total_villages,
            ROUND((SUM(COALESCE(NULLIF(TRIM(lpcd_value:: text), ''):: numeric, 0)) / 7.0), 2) as lpcd_value,
            ROUND((SUM(COALESCE(NULLIF(TRIM(water_value:: text), ''):: numeric, 0)) / 7.0), 2) as water_value,
            MAX(data_date) as lpcd_date
        FROM(
            SELECT *, NULL as completion_status FROM weekly_data
        ) t
        GROUP BY region, scheme_id, block
        HAVING ${havingCondition}
        ORDER BY region, scheme_id
          `;
      } else {


        let metricCondition = '';
        switch (category) {
          case 'above_55':
            metricCondition = 'AND ld.latest_lpcd_value IS NOT NULL AND ld.latest_lpcd_value::numeric >= 55';
            break;
          case 'below_55':
            metricCondition = 'AND ld.latest_lpcd_value IS NOT NULL AND ld.latest_lpcd_value::numeric > 0 AND ld.latest_lpcd_value::numeric < 55';
            break;
          case 'with_water':
            metricCondition = 'AND ld.latest_lpcd_value IS NOT NULL AND ld.latest_lpcd_value::numeric > 0';
            break;
          case 'no_water':
            metricCondition = 'AND (ld.latest_lpcd_value IS NULL OR ld.latest_lpcd_value::numeric = 0)';
            break;
          default:
            metricCondition = '';
        }

        let updatedRegionFilter = region && region !== 'All Regions' ? `AND ld.region = $${paramIndex - 1}` : '';
        let updatedSchemeIdFilter = schemeIdFilter ? schemeIdFilter.replace(/scheme_id IN/g, 'ld.scheme_id IN') : '';

        query = `
        WITH village_counts AS (
          SELECT 
            scheme_id,
            block,
            village_name,
            CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data
        ),
        deduplicated_villages AS (
          SELECT DISTINCT ON (scheme_id, block, village_name)
            scheme_id, scheme_name, region, block, village_name, population,
            water_value_day1, water_value_day2, water_value_day3, water_value_day4,
            water_value_day5, water_value_day6, water_value_day7
          FROM water_scheme_data
          ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
        ),
        village_status AS (
          SELECT scheme_id, block, village_name,
            MAX(is_above_55) as has_above_55,
            MAX(is_below_55) as has_below_55,
            MAX(is_zero_supply) as has_zero_supply
          FROM village_counts
          GROUP BY scheme_id, block, village_name
        ),
        lpcd_aggregation AS (
          SELECT scheme_id, block,
            COUNT(DISTINCT village_name) as total_villages,
            SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status
          GROUP BY scheme_id, block
        ),
        scheme_aggregation AS (
          SELECT 
            wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block,
            SUM(wsd.population) as total_population,
            SUM(wsd.water_value_day1) as total_water_day1,
            SUM(wsd.water_value_day2) as total_water_day2,
            SUM(wsd.water_value_day3) as total_water_day3,
            SUM(wsd.water_value_day4) as total_water_day4,
            SUM(wsd.water_value_day5) as total_water_day5,
            SUM(wsd.water_value_day6) as total_water_day6,
            SUM(wsd.water_value_day7) as total_water_day7
          FROM deduplicated_villages wsd
          JOIN lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
          GROUP BY wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block
        ),
        scheme_calculated_values AS (
          SELECT scheme_id, scheme_name, region, block,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day2 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day2,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day3 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day3,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day4 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day4,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day5 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day5,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day6 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day6,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
            total_water_day1, total_water_day2, total_water_day3,
            total_water_day4, total_water_day5, total_water_day6, total_water_day7
          FROM scheme_aggregation
        ),
        live_data AS (
          SELECT 
            calculated.*,
            COALESCE(
              lpcd_value_day7, 
              lpcd_value_day6, 
              lpcd_value_day5, 
              lpcd_value_day4, 
              lpcd_value_day3, 
              lpcd_value_day2, 
              lpcd_value_day1, 
              0
            ) as latest_lpcd_value,
            total_water_day7 as latest_water_value
          FROM (
            SELECT DISTINCT ON (region, scheme_name) *
            FROM scheme_calculated_values
            WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
            ORDER BY region, scheme_name, block
          ) calculated
        ),
        latest_history AS (
          SELECT DISTINCT ON (sldh.scheme_id, sldh.block)
            sldh.scheme_id, sldh.block,
            sldh.circle, sldh.division, sldh.sub_division, sldh.data_date,
            COALESCE(NULLIF(ss.dashboard_url, ''), sldh.dashboard_url) as dashboard_url
          FROM scheme_lpcd_data_history sldh
          LEFT JOIN scheme_status ss ON ss.scheme_id = sldh.scheme_id AND ss.scheme_name = sldh.scheme_name
          ORDER BY sldh.scheme_id, sldh.block, sldh.uploaded_at DESC
        )
        SELECT * FROM (
          SELECT DISTINCT ON (ld.scheme_id)
            ld.region, lh.circle, lh.division, lh.sub_division, ld.block,
            ld.scheme_id, ld.scheme_name, 
            sa.total_population, la.total_villages,
            1 as consecutive_days,
            ld.latest_lpcd_value as latest_lpcd_value, 
            ld.latest_water_value as latest_water_value, 
            lh.data_date as latest_date, 
            lh.dashboard_url
          FROM live_data ld
          LEFT JOIN latest_history lh ON ld.scheme_id = lh.scheme_id AND ld.block = lh.block
          LEFT JOIN lpcd_aggregation la ON ld.scheme_id = la.scheme_id AND ld.block = la.block
          LEFT JOIN scheme_aggregation sa ON ld.scheme_id = sa.scheme_id AND ld.block = sa.block
          WHERE ld.region IS NOT NULL
            AND $1::int IS NOT NULL -- Consume dayNum to fix PG error
            ${updatedRegionFilter}
            ${updatedSchemeIdFilter}
            ${metricCondition}
          ORDER BY ld.scheme_id, ld.block
        ) as t
        ORDER BY region, scheme_name, block
      `;

      }

      const result = await client.query(query, params);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme LPCD Region Comparison');

      worksheet.columns = [
        { header: 'Region', key: 'region', width: 20 },
        { header: 'Circle', key: 'circle', width: 20 },
        { header: 'Division', key: 'division', width: 20 },
        { header: 'Sub Division', key: 'sub_division', width: 20 },
        { header: 'Block', key: 'block', width: 20 },
        { header: 'Scheme ID', key: 'scheme_id', width: 15 },
        { header: 'Scheme Name', key: 'scheme_name', width: 30 },
        { header: 'Total Population', key: 'total_population', width: 15 },
        { header: 'Total Villages', key: 'total_villages', width: 12 },
        { header: 'Consecutive Days', key: 'consecutive_days', width: 15 },
        { header: 'Latest LPCD', key: 'latest_lpcd_value', width: 12 },
        { header: 'Latest Water', key: 'latest_water_value', width: 12 },
        { header: 'Latest Date', key: 'latest_date', width: 12 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach((row: any) => {
        worksheet.addRow({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          total_population: row.total_population || 0,
          total_villages: row.total_villages || 0,
          consecutive_days: row.consecutive_days || 0,
          latest_lpcd_value: row.latest_lpcd_value !== null ? Number(row.latest_lpcd_value).toFixed(1) : 'N/A',
          latest_water_value: row.latest_water_value !== null ? Number(row.latest_water_value).toFixed(2) : 'N/A',
          latest_date: row.latest_date || 'N/A',
        });
      });

      const fileName = `Scheme_LPCD_Region_${categoryLabels[category]?.replace(/\s+/g, '_') || category}_${day}Days_${region || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename = "${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
      pool.end();
    }
  } catch (error) {
    console.error("Error exporting Scheme LPCD region comparison schemes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export Scheme LPCD region comparison schemes",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;