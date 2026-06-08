import { Router } from "express";
import { z } from "zod";
import { eq, sql, and, desc, asc, like, inArray } from "drizzle-orm";
import { getDB } from "../db";
import { communicationStatus, schemeStatuses, waterSchemeData, chlorineData, pressureData, waterConsumption } from "../../shared/schema";
import multer from "multer";
import * as csv from "csv-parse";
import fs from "fs";
import { getFilteredSchemeIds } from "./filter-utils";
import { sendAutomaticOfflineEmails } from "../services/email-service";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Get communication status overview with geographic aggregation
router.get("/overview", async (req, res) => {
  try {
    const db = await getDB();
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subdivision = req.query.subdivision as string;
    const block = req.query.block as string;
    const waterSupply = req.query.waterSupply as string;
    const agencyType = req.query.agencyType as string;
    const filterType = req.query.filterType as string;
    const fullyCompleted = req.query.fullyCompleted as string;

    // Build filter conditions
    const conditions = [];
    if (region && region !== "all")
      conditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== "all")
      conditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== "all")
      conditions.push(eq(communicationStatus.division, division));
    if (subdivision && subdivision !== "all")
      conditions.push(eq(communicationStatus.sub_division, subdivision));
    if (block && block !== "all")
      conditions.push(eq(communicationStatus.block, block));

    // Handle standard filter types (like on schemes page)
    if (filterType || fullyCompleted) {
      const filteredSchemeIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType);
      if (filteredSchemeIds) {
        if (filteredSchemeIds.includes('NO_MATCHES')) {
          conditions.push(sql`1 = 0`); // No matches
        } else {
          conditions.push(inArray(communicationStatus.scheme_id, filteredSchemeIds));
        }
      }
    } else {
      // Fallback to legacy waterSupply and agencyType filters if filterType is not provided
      if (waterSupply && waterSupply !== "all") {
        let subQueryCondition;
        if (waterSupply.toLowerCase() === "no") {
          subQueryCondition = sql`lower(${schemeStatuses.water_supply}) = 'no' OR ${schemeStatuses.water_supply} IS NULL OR trim(${schemeStatuses.water_supply}) = ''`;
        } else {
          subQueryCondition = sql`lower(${schemeStatuses.water_supply}) = lower(${waterSupply})`;
        }

        conditions.push(
          inArray(
            communicationStatus.scheme_id,
            db.select({ scheme_id: schemeStatuses.scheme_id })
              .from(schemeStatuses)
              .where(subQueryCondition)
          )
        );
      }

      if (agencyType && agencyType !== "all" && agencyType !== "ALL") {
        conditions.push(
          inArray(
            communicationStatus.scheme_id,
            db.select({ scheme_id: schemeStatuses.scheme_id })
              .from(schemeStatuses)
              .where(eq(schemeStatuses.agency_type, agencyType))
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const stats = await db
      .select({
        total_esrs: sql<number>`count(*)`,
        total_schemes: sql<number>`count(distinct ${communicationStatus.scheme_id})`,
        chlorine_online: sql<number>`sum(case when ${communicationStatus.chlorine_status} = 'Online' then 1 else 0 end)`,
        pressure_online: sql<number>`sum(case when ${communicationStatus.pressure_status} = 'Online' then 1 else 0 end)`,
        flow_meter_online: sql<number>`sum(case when ${communicationStatus.flow_meter_status} = 'Online' then 1 else 0 end)`,
        chlorine_connected: sql<number>`sum(case when ${communicationStatus.chlorine_connected} = 'Connected' then 1 else 0 end)`,
        pressure_connected: sql<number>`sum(case when ${communicationStatus.pressure_connected} = 'Connected' then 1 else 0 end)`,
        flow_meter_connected: sql<number>`sum(case when ${communicationStatus.flow_meter_connected} = 'Connected' then 1 else 0 end)`,
        chlorine_offline: sql<number>`sum(case when ${communicationStatus.chlorine_status} = 'Offline' then 1 else 0 end)`,
        pressure_offline: sql<number>`sum(case when ${communicationStatus.pressure_status} = 'Offline' then 1 else 0 end)`,
        flow_meter_offline: sql<number>`sum(case when ${communicationStatus.flow_meter_status} = 'Offline' then 1 else 0 end)`,
        chlorine_less_72h: sql<number>`sum(case when ${communicationStatus.chlorine_0h_72h} = '1' then 1 else 0 end)`,
        chlorine_more_72h: sql<number>`sum(case when ${communicationStatus.chlorine_72h} = '1' then 1 else 0 end)`,
        pressure_less_72h: sql<number>`sum(case when ${communicationStatus.pressure_0h_72h} = '1' then 1 else 0 end)`,
        pressure_more_72h: sql<number>`sum(case when ${communicationStatus.pressure_72h} = '1' then 1 else 0 end)`,
        flow_meter_less_72h: sql<number>`sum(case when ${communicationStatus.flow_meter_0h_72h} = '1' then 1 else 0 end)`,
        flow_meter_more_72h: sql<number>`sum(case when ${communicationStatus.flow_meter_72h} = '1' then 1 else 0 end)`,
      })
      .from(communicationStatus)
      .where(whereClause);

    res.json(
      stats[0] || {
        total_esrs: 0,
        total_schemes: 0,
        chlorine_online: 0,
        pressure_online: 0,
        flow_meter_online: 0,
        chlorine_connected: 0,
        pressure_connected: 0,
        flow_meter_connected: 0,
        chlorine_less_72h: 0,
        chlorine_more_72h: 0,
        pressure_less_72h: 0,
        pressure_more_72h: 0,
        flow_meter_less_72h: 0,
        flow_meter_more_72h: 0,
      },
    );
  } catch (error) {
    console.error("Error fetching communication status overview:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch communication status overview" });
  }
});

// Get regional statistics
router.get("/stats", async (req, res) => {
  try {
    const db = await getDB();

    const stats = await db
      .select({
        region: communicationStatus.region,
        total_records: sql<number>`count(*)`,
        total_schemes: sql<number>`count(distinct ${communicationStatus.scheme_id})`,
        total_villages: sql<number>`count(distinct ${communicationStatus.village_name})`,
        online_chlorine: sql<number>`sum(case when ${communicationStatus.chlorine_status} = 'Online' then 1 else 0 end)`,
        online_pressure: sql<number>`sum(case when ${communicationStatus.pressure_status} = 'Online' then 1 else 0 end)`,
        online_flow_meter: sql<number>`sum(case when ${communicationStatus.flow_meter_status} = 'Online' then 1 else 0 end)`,
      })
      .from(communicationStatus)
      .groupBy(communicationStatus.region)
      .orderBy(asc(communicationStatus.region));

    res.json(stats);
  } catch (error) {
    console.error("Error fetching communication status stats:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch communication status stats" });
  }
});

// Get unique schemes with communication status
router.get("/schemes", async (req, res) => {
  try {
    const db = await getDB();
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subdivision = req.query.subdivision as string;
    const block = req.query.block as string;
    const waterSupply = req.query.waterSupply as string;
    const agencyType = req.query.agencyType as string;
    const filterType = req.query.filterType as string;
    const fullyCompleted = req.query.fullyCompleted as string;

    // Build filter conditions
    const conditions = [];
    if (region && region !== "all")
      conditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== "all")
      conditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== "all")
      conditions.push(eq(communicationStatus.division, division));
    if (subdivision && subdivision !== "all")
      conditions.push(eq(communicationStatus.sub_division, subdivision));
    if (block && block !== "all")
      conditions.push(eq(communicationStatus.block, block));

    // Handle standard filter types (like on schemes page)
    if (filterType || fullyCompleted) {
      const filteredSchemeIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType);
      if (filteredSchemeIds) {
        if (filteredSchemeIds.includes('NO_MATCHES')) {
          conditions.push(sql`1 = 0`); // No matches
        } else {
          conditions.push(inArray(communicationStatus.scheme_id, filteredSchemeIds));
        }
      }
    } else {
      // Fallback to legacy waterSupply and agencyType filters if filterType is not provided
      if (waterSupply && waterSupply !== "all") {
        let subQueryCondition;
        if (waterSupply.toLowerCase() === "no") {
          subQueryCondition = sql`lower(${schemeStatuses.water_supply}) = 'no' OR ${schemeStatuses.water_supply} IS NULL OR trim(${schemeStatuses.water_supply}) = ''`;
        } else {
          subQueryCondition = sql`lower(${schemeStatuses.water_supply}) = lower(${waterSupply})`;
        }

        conditions.push(
          inArray(
            communicationStatus.scheme_id,
            db.select({ scheme_id: schemeStatuses.scheme_id })
              .from(schemeStatuses)
              .where(subQueryCondition)
          )
        );
      }

      if (agencyType && agencyType !== "all" && agencyType !== "ALL") {
        conditions.push(
          inArray(
            communicationStatus.scheme_id,
            db.select({ scheme_id: schemeStatuses.scheme_id })
              .from(schemeStatuses)
              .where(eq(schemeStatuses.agency_type, agencyType))
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const schemes = await db
      .select({
        scheme_id: communicationStatus.scheme_id,
        scheme_name: communicationStatus.scheme_name,
        village_name: communicationStatus.village_name,
        esr_name: communicationStatus.esr_name,
        region: communicationStatus.region,
        circle: communicationStatus.circle,
        division: communicationStatus.division,
        sub_division: communicationStatus.sub_division,
        block: communicationStatus.block,
        chlorine_connected: communicationStatus.chlorine_connected,
        pressure_connected: communicationStatus.pressure_connected,
        flow_meter_connected: communicationStatus.flow_meter_connected,
        chlorine_status: communicationStatus.chlorine_status,
        pressure_status: communicationStatus.pressure_status,
        flow_meter_status: communicationStatus.flow_meter_status,
        overall_status: communicationStatus.overall_status,
        chlorine_0h_72h: communicationStatus.chlorine_0h_72h,
        chlorine_72h: communicationStatus.chlorine_72h,
        pressure_0h_72h: communicationStatus.pressure_0h_72h,
        pressure_72h: communicationStatus.pressure_72h,
        flow_meter_0h_72h: communicationStatus.flow_meter_0h_72h,
        flow_meter_72h: communicationStatus.flow_meter_72h,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        chlorine_value_7: chlorineData.chlorine_value_7,
        pressure_value_7: pressureData.pressure_value_7,
        water_value_day7: waterConsumption.water_value_day7,
      })
      .from(communicationStatus)
      .leftJoin(
        waterSchemeData,
        and(
          eq(communicationStatus.scheme_id, waterSchemeData.scheme_id),
          eq(communicationStatus.village_name, waterSchemeData.village_name)
        )
      )
      .leftJoin(
        chlorineData,
        and(
          eq(communicationStatus.scheme_id, chlorineData.scheme_id),
          eq(communicationStatus.village_name, chlorineData.village_name),
          eq(communicationStatus.esr_name, chlorineData.esr_name)
        )
      )
      .leftJoin(
        pressureData,
        and(
          eq(communicationStatus.scheme_id, pressureData.scheme_id),
          eq(communicationStatus.village_name, pressureData.village_name),
          eq(communicationStatus.esr_name, pressureData.esr_name)
        )
      )
      .leftJoin(
        waterConsumption,
        and(
          eq(communicationStatus.scheme_id, waterConsumption.scheme_id),
          eq(communicationStatus.village_name, waterConsumption.village_name),
          eq(communicationStatus.esr_name, waterConsumption.esr_name)
        )
      )
      .where(whereClause)
      .orderBy(
        asc(communicationStatus.scheme_name),
        asc(communicationStatus.village_name),
      );

    res.json(schemes);
  } catch (error) {
    console.error("Error fetching communication status schemes:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch communication status schemes" });
  }
});

// Get filter options with cascading filters
router.get("/filters", async (req, res) => {
  try {
    const db = await getDB();
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subdivision = req.query.subdivision as string;

    // Get regions (always show all regions)
    const regions = await db
      .selectDistinct({ value: communicationStatus.region })
      .from(communicationStatus)
      .where(
        sql`${communicationStatus.region} is not null and ${communicationStatus.region} != ''`,
      )
      .orderBy(asc(communicationStatus.region));

    // Get circles filtered by region
    const circleConditions = [];
    if (region && region !== "all")
      circleConditions.push(eq(communicationStatus.region, region));
    const circleWhereClause =
      circleConditions.length > 0 ? and(...circleConditions) : undefined;

    const circles = await db
      .selectDistinct({ value: communicationStatus.circle })
      .from(communicationStatus)
      .where(
        circleWhereClause
          ? and(
            circleWhereClause,
            sql`${communicationStatus.circle} is not null and ${communicationStatus.circle} != ''`,
          )
          : sql`${communicationStatus.circle} is not null and ${communicationStatus.circle} != ''`,
      )
      .orderBy(asc(communicationStatus.circle));

    // Get divisions filtered by region and circle
    const divisionConditions = [];
    if (region && region !== "all")
      divisionConditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== "all")
      divisionConditions.push(eq(communicationStatus.circle, circle));
    const divisionWhereClause =
      divisionConditions.length > 0 ? and(...divisionConditions) : undefined;

    const divisions = await db
      .selectDistinct({ value: communicationStatus.division })
      .from(communicationStatus)
      .where(
        divisionWhereClause
          ? and(
            divisionWhereClause,
            sql`${communicationStatus.division} is not null and ${communicationStatus.division} != ''`,
          )
          : sql`${communicationStatus.division} is not null and ${communicationStatus.division} != ''`,
      )
      .orderBy(asc(communicationStatus.division));

    // Get subdivisions filtered by region, circle, and division
    const subdivisionConditions = [];
    if (region && region !== "all")
      subdivisionConditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== "all")
      subdivisionConditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== "all")
      subdivisionConditions.push(eq(communicationStatus.division, division));
    const subdivisionWhereClause =
      subdivisionConditions.length > 0
        ? and(...subdivisionConditions)
        : undefined;

    const subdivisions = await db
      .selectDistinct({ value: communicationStatus.sub_division })
      .from(communicationStatus)
      .where(
        subdivisionWhereClause
          ? and(
            subdivisionWhereClause,
            sql`${communicationStatus.sub_division} is not null and ${communicationStatus.sub_division} != ''`,
          )
          : sql`${communicationStatus.sub_division} is not null and ${communicationStatus.sub_division} != ''`,
      )
      .orderBy(asc(communicationStatus.sub_division));

    // Get blocks filtered by region, circle, division, and subdivision
    const blockConditions = [];
    if (region && region !== "all")
      blockConditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== "all")
      blockConditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== "all")
      blockConditions.push(eq(communicationStatus.division, division));
    if (subdivision && subdivision !== "all")
      blockConditions.push(eq(communicationStatus.sub_division, subdivision));
    const blockWhereClause =
      blockConditions.length > 0 ? and(...blockConditions) : undefined;

    const blocks = await db
      .selectDistinct({ value: communicationStatus.block })
      .from(communicationStatus)
      .where(
        blockWhereClause
          ? and(
            blockWhereClause,
            sql`${communicationStatus.block} is not null and ${communicationStatus.block} != ''`,
          )
          : sql`${communicationStatus.block} is not null and ${communicationStatus.block} != ''`,
      )
      .orderBy(asc(communicationStatus.block));

    res.json({
      regions: regions.map((r) => r.value),
      circles: circles.map((c) => c.value),
      divisions: divisions.map((d) => d.value),
      subdivisions: subdivisions.map((s) => s.value),
      blocks: blocks.map((b) => b.value),
    });
  } catch (error) {
    console.error("Error fetching communication status filters:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch communication status filters" });
  }
});

// Import communication status data from CSV
router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const db = await getDB();
    const filePath = req.file.path;

    // Read and parse CSV with UTF-8 BOM cleanup
    let fileContent = fs.readFileSync(filePath, "utf8");

    // Remove UTF-8 BOM if present
    if (fileContent.charCodeAt(0) === 0xfeff) {
      fileContent = fileContent.slice(1);
    }

    const records: any[] = [];

    const parser = csv.parse({
      skip_empty_lines: true,
      trim: true,
    });

    parser.on("data", (row: string[]) => {
      records.push(row);
    });

    await new Promise((resolve, reject) => {
      parser.on("end", resolve);
      parser.on("error", reject);
      parser.write(fileContent);
      parser.end();
    });

    console.log(`Parsed ${records.length} records from CSV`);

    let inserted = 0;
    let updated = 0;

    // Process records one by one to preserve last_seen timestamps
    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      const recordData = {
        region: (row[0] || "").replace(/^\uFEFF/, "").trim(),
        circle: (row[1] || "").trim(),
        division: (row[2] || "").trim(),
        sub_division: (row[3] || "").trim(),
        block: (row[4] || "").trim(),
        scheme_id: (row[5] || "").trim(),
        scheme_name: (row[6] || "").trim(),
        village_name: (row[7] || "").trim(),
        esr_name: (row[8] || "").trim(),
        chlorine_connected: (row[9] || "").trim(),
        pressure_connected: (row[10] || "").trim(),
        flow_meter_connected: (row[11] || "").trim(),
        chlorine_status: (row[12] || "").trim(),
        pressure_status: (row[13] || "").trim(),
        flow_meter_status: (row[14] || "").trim(),
        overall_status: (row[15] || "").trim(),
        chlorine_0h_72h: (row[16] || "").trim(),
        chlorine_72h: (row[17] || "").trim(),
        pressure_0h_72h: (row[18] || "").trim(),
        pressure_72h: (row[19] || "").trim(),
        flow_meter_0h_72h: (row[20] || "").trim(),
        flow_meter_72h: (row[21] || "").trim(),
      };

      // Check if record exists
      const existingRecord = await db
        .select()
        .from(communicationStatus)
        .where(
          and(
            eq(communicationStatus.scheme_id, recordData.scheme_id),
            eq(communicationStatus.village_name, recordData.village_name),
            eq(communicationStatus.esr_name, recordData.esr_name)
          )
        )
        .limit(1);

      if (existingRecord.length > 0) {
        // Record exists - update it
        const updateData: any = {
          ...recordData,
          updated_at: new Date()
        };

        // Only update last_seen (chlorine) if new chlorine_status is Online (case-insensitive)
        if (recordData.chlorine_status?.trim().toLowerCase() === 'online') {
          updateData.last_seen = new Date();
        } else {
          // Preserve existing last_seen value for offline/N/A chlorine devices
          updateData.last_seen = existingRecord[0].last_seen;
        }

        // Only update pressure_last_seen if new pressure_status is Online (case-insensitive)
        if (recordData.pressure_status?.trim().toLowerCase() === 'online') {
          updateData.pressure_last_seen = new Date();
        } else {
          // Preserve existing pressure_last_seen value for offline/N/A pressure devices
          updateData.pressure_last_seen = existingRecord[0].pressure_last_seen;
        }

        await db
          .update(communicationStatus)
          .set(updateData)
          .where(
            and(
              eq(communicationStatus.scheme_id, recordData.scheme_id),
              eq(communicationStatus.village_name, recordData.village_name),
              eq(communicationStatus.esr_name, recordData.esr_name)
            )
          );
        updated++;
      } else {
        // New record - insert it (last_seen and updated_at will be set by defaultNow())
        await db.insert(communicationStatus).values(recordData);
        inserted++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log(
      `Successfully imported communication status records: ${inserted} inserted, ${updated} updated`,
    );

    // Automatically send offline sensor emails to vendors
    try {
      console.log("Starting automatic email notifications for offline sensors...");
      await sendAutomaticOfflineEmails();
    } catch (emailErr) {
      console.error("Failed to send automatic offline sensor emails:", emailErr);
    }

    res.json({
      message: "Communication status data imported successfully",
      inserted,
      updated,
      total: records.length,
    });
  } catch (error) {
    console.error("Error importing communication status data:", error);

    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res
      .status(500)
      .json({ error: "Failed to import communication status data" });
  }
});

// Download communication status data as CSV/Excel
router.get("/download", async (req, res) => {
  try {
    const db = await getDB();
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subdivision = req.query.subdivision as string;
    const block = req.query.block as string;
    const search = req.query.search as string;
    const waterSupply = req.query.waterSupply as string;
    const agencyType = req.query.agencyType as string;
    const filterType = req.query.filterType as string;
    const fullyCompleted = req.query.fullyCompleted as string;

    // Build filter conditions
    const conditions = [];
    if (region && region !== "all")
      conditions.push(eq(communicationStatus.region, region));
    if (circle && circle !== "all")
      conditions.push(eq(communicationStatus.circle, circle));
    if (division && division !== "all")
      conditions.push(eq(communicationStatus.division, division));
    if (subdivision && subdivision !== "all")
      conditions.push(eq(communicationStatus.sub_division, subdivision));
    if (block && block !== "all")
      conditions.push(eq(communicationStatus.block, block));

    // Handle standard filter types (like on schemes page)
    if (filterType || fullyCompleted) {
      const filteredSchemeIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType);
      if (filteredSchemeIds) {
        if (filteredSchemeIds.includes('NO_MATCHES')) {
          conditions.push(sql`1 = 0`); // No matches
        } else {
          conditions.push(inArray(communicationStatus.scheme_id, filteredSchemeIds));
        }
      }
    } else {
      // Fallback to legacy waterSupply and agencyType filters if filterType is not provided
      if (waterSupply && waterSupply !== "all") {
        let subQueryCondition;
        if (waterSupply.toLowerCase() === "no") {
          subQueryCondition = sql`lower(${schemeStatuses.water_supply}) = 'no' OR ${schemeStatuses.water_supply} IS NULL OR trim(${schemeStatuses.water_supply}) = ''`;
        } else {
          subQueryCondition = sql`lower(${schemeStatuses.water_supply}) = lower(${waterSupply})`;
        }

        conditions.push(
          inArray(
            communicationStatus.scheme_id,
            db.select({ scheme_id: schemeStatuses.scheme_id })
              .from(schemeStatuses)
              .where(subQueryCondition)
          )
        );
      }

      if (agencyType && agencyType !== "all" && agencyType !== "ALL") {
        conditions.push(
          inArray(
            communicationStatus.scheme_id,
            db.select({ scheme_id: schemeStatuses.scheme_id })
              .from(schemeStatuses)
              .where(eq(schemeStatuses.agency_type, agencyType))
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch data with filters
    let data = await db
      .select()
      .from(communicationStatus)
      .where(whereClause)
      .orderBy(
        asc(communicationStatus.region),
        asc(communicationStatus.scheme_name),
      );

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase().trim();
      data = data.filter(
        (record: any) =>
          record.scheme_name?.toLowerCase().includes(searchLower) ||
          record.village_name?.toLowerCase().includes(searchLower) ||
          record.esr_name?.toLowerCase().includes(searchLower) ||
          record.scheme_id?.toLowerCase().includes(searchLower) ||
          record.region?.toLowerCase().includes(searchLower) ||
          record.circle?.toLowerCase().includes(searchLower) ||
          record.division?.toLowerCase().includes(searchLower),
      );
    }

    // Create CSV content
    const headers = [
      "Region",
      "Circle",
      "Division",
      "Sub Division",
      "Block",
      "Scheme ID",
      "Scheme Name",
      "Village Name",
      "ESR Name",
      "Chlorine Connected",
      "Pressure Connected",
      "Flow Meter Connected",
      "Chlorine Status",
      "Pressure Status",
      "Flow Meter Status",
      "Overall Status",
      "Chlorine 0h-72h",
      "Chlorine >72h",
      "Pressure 0h-72h",
      "Pressure >72h",
      "Flow Meter 0h-72h",
      "Flow Meter >72h",
    ];

    const csvRows = [
      headers.join(","),
      ...data.map((record: any) =>
        [
          record.region || "",
          record.circle || "",
          record.division || "",
          record.sub_division || "",
          record.block || "",
          record.scheme_id || "",
          `"${(record.scheme_name || "").replace(/"/g, '""')}"`,
          `"${(record.village_name || "").replace(/"/g, '""')}"`,
          `"${(record.esr_name || "").replace(/"/g, '""')}"`,
          record.chlorine_connected || "",
          record.pressure_connected || "",
          record.flow_meter_connected || "",
          record.chlorine_status || "",
          record.pressure_status || "",
          record.flow_meter_status || "",
          record.overall_status || "",
          record.chlorine_0h_72h || "",
          record.chlorine_72h || "",
          record.pressure_0h_72h || "",
          record.pressure_72h || "",
          record.flow_meter_0h_72h || "",
          record.flow_meter_72h || "",
        ].join(","),
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Set headers for file download
    const filename = `communication_status_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", csvContent.length);

    res.send(csvContent);
  } catch (error) {
    console.error("Error downloading communication status data:", error);
    res
      .status(500)
      .json({ error: "Failed to download communication status data" });
  }
});

export default router;
