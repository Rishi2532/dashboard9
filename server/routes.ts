import type { Express, Response, NextFunction } from "express";
import { createServer as createHttpServer, type Server } from "http";
import { storage, type WaterSchemeDataFilter } from "./storage";
import {
  insertRegionSchema,
  insertSchemeStatusSchema,
  regions,
  loginSchema,
  registerUserSchema,
  InsertSchemeStatus,
  insertWaterSchemeDataSchema,
  waterSchemeData,
  schemeStatuses,
  InsertWaterSchemeData,
  UpdateWaterSchemeData,
  mqttTopicConfigurations,
  insertMqttTopicConfigurationSchema,
  MqttTopicConfiguration,
  vendors,
} from "@shared/schema";
import { z } from "zod";
import { updateRegionSummaries, resetRegionData, getDB } from "./db";
import { eq, sql, and, asc } from "drizzle-orm";
import "express-session";
import multer from "multer";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { log } from "./vite";
import { fileURLToPath } from "url";
import * as cp from "child_process";
import { promisify } from "util";
import { importCsvHandler } from "./routes/admin/import-csv";
import aiRoutes from "./routes/ai";
import waterSchemeRoutes from "./routes/water-scheme-routes";
import lpcdImportRoutes from "./routes/admin/import-lpcd";
import chlorineRoutes from "./routes/chlorine-routes";
import pressureRoutes from "./routes/pressure-routes";
import waterConsumptionRoutes from "./routes/water-consumption-routes";
import { importSchemeLpcdFromCSV } from "./scheme-lpcd-importer";
import communicationRoutes from "./routes/communication-routes";
import translationRoutes from "./routes/translation";
import schemeLpcdRoutes from "./routes/scheme-lpcd-routes";
import reportsRoutes from "./routes/reports";
import populationRoutes from "./routes/population-routes";
import esrRoutes from "./routes/esr-routes";
import communicationStatusRoutes from "./routes/communication-status-routes";
import villageRoutes from "./routes/village-routes";
import helpdeskRoutes from "./routes/helpdesk-routes";
import schemeAnalysisRoutes from "./routes/scheme-analysis-routes";
import categoryDataRoutes from "./routes/category-data-routes";
import nlpChatbotRoutes from "./routes/nlp-chatbot-routes";
import smartReportsRoutes from "./routes/smart-reports-routes";
import monthlyReportsRoutes from "./routes/monthly-reports-routes";
import chatbotHelpdeskRoutes from "./routes/chatbot/helpdesk-routes";
import combinedEsrDownloadRoutes from "./routes/combined-esr-download-routes";
import issueReportingRoutes from "./routes/issue-reporting-routes";
import flowmeterRoutes from "./routes/flowmeter-routes";
// import { mqttService } from "./mqtt-service";

const exec = promisify(cp.exec);

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Express Request type to include session properties
declare module "express-session" {
  interface Session {
    userId?: number;
    isAdmin?: boolean;
  }
}

import { Request } from "express";

// Authentication middleware - checks if user is logged in
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized. Please login." });
  }
  next();
};

// Admin authorization middleware - checks if logged in user is an admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res
      .status(403)
      .json({ message: "Forbidden. Admin privileges required." });
  }
  next();
};

// Define external API key (from env or fallback)
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || "MAHAJAL_IOT_SECURE_KEY_25";

// Dual-Authentication middleware - checks if user has valid API key OR is logged in
const requireApiKeyOrAuth = (req: Request, res: Response, next: NextFunction) => {
  // 1. Check for valid API key in headers
  const apiKey = req.headers["x-external-proxy-key"] || req.headers["x-api-key"];
  if (apiKey && apiKey === EXTERNAL_API_KEY) {
    return next(); // API Key is valid, allow access
  }
  
  // 2. Fallback to standard session authentication
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Please provide a valid API key (X-External-Proxy-Key) or login." 
    });
  }
  
  next(); // Session is valid, allow access
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure file upload middleware with memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

  // API routes

  // Mount AI routes
  app.use("/api/ai", aiRoutes);

  // Mount water scheme routes
  app.use("/api/water-scheme-data", requireApiKeyOrAuth, waterSchemeRoutes);

  // Mount scheme LPCD routes
  app.use("/api/scheme-lpcd-data", requireApiKeyOrAuth, schemeLpcdRoutes);

  // Mount reports routes for Excel file uploads/downloads
  app.use("/api/reports", reportsRoutes);

  // Mount LPCD import routes (admin-only)
  app.use("/api/admin", requireAdmin, lpcdImportRoutes);

  // Mount chlorine data routes
  app.use("/api/chlorine", requireApiKeyOrAuth, chlorineRoutes);

  // Mount pressure data routes
  app.use("/api/pressure", requireApiKeyOrAuth, pressureRoutes);

  // Mount water consumption data routes
  app.use("/api/water-consumption", requireApiKeyOrAuth, waterConsumptionRoutes);

  // Mount communication status routes
  app.use("/api/communication", requireApiKeyOrAuth, communicationRoutes);

  // Mount translation routes
  app.use("/api/translation", translationRoutes);

  // Mount population tracking routes
  app.use("/api/population-tracking", requireApiKeyOrAuth, populationRoutes);

  // Mount ESR monitoring routes
  app.use("/api/esr", requireApiKeyOrAuth, esrRoutes);

  // Mount communication status routes
  app.use("/api/communication-status", requireApiKeyOrAuth, communicationStatusRoutes);

  // Mount village data routes (admin only)
  app.use("/api/villages", requireAdmin, villageRoutes);

  // Mount helpdesk routes (protected)
  app.use("/api/helpdesk", requireAuth, helpdeskRoutes);

  // Mount issue reporting routes (protected)
  app.use("/api/issue-reporting", requireAuth, issueReportingRoutes);

  // Mount chatbot helpdesk routes (protected)
  app.use("/api/chatbot/helpdesk", requireAuth, chatbotHelpdeskRoutes);

  // Mount scheme analysis routes
  app.use("/api/scheme-analysis", requireApiKeyOrAuth, schemeAnalysisRoutes);

  // Mount category data routes (keyword-based queries for water scheme categories)
  app.use("/api/category-data", requireApiKeyOrAuth, categoryDataRoutes);

  // Mount NLP chatbot routes
  app.use("/api/nlp-chatbot", requireApiKeyOrAuth, nlpChatbotRoutes);

  // Mount Smart Reports routes
  app.use("/api/smart-reports", smartReportsRoutes);

  // Mount Monthly Reports
  app.use("/api/monthly-reports", requireAdmin, monthlyReportsRoutes);

  // Mount Combined ESR Download routes
  app.use("/api/combined-esr-download", combinedEsrDownloadRoutes);

  // Mount flowmeter statistics routes
  app.use("/api/flowmeter", flowmeterRoutes);

  // Vendor API endpoints - get vendors by region
  app.get("/api/vendors", async (req, res) => {
    try {
      const db = await getDB();
      const region = req.query.region as string;

      if (region) {
        // Get vendors for specific region
        const regionVendors = await db
          .select()
          .from(vendors)
          .where(eq(vendors.region, region));
        res.json(regionVendors);
      } else {
        // Get all vendors
        const allVendors = await db.select().from(vendors);
        res.json(allVendors);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // MQTT Topic Status endpoint (legacy route for MQTT Monitor page)
  app.get("/api/check-topic/:topic", async (req, res) => {
    try {
      const topicId = req.params.topic;
      const sensorType = req.query.sensor_type as string;
      const chlorineType = req.query.chlorine_type as string;

      if (!topicId) {
        return res.status(400).json({ message: "Topic ID is required" });
      }

      if (!sensorType) {
        return res.status(400).json({ message: "Sensor type is required" });
      }

      const topicStatus = await mqttService.getTopicStatus(topicId);

      // Determine communication status based on sensor type
      let isCommunicating = false;

      // For flow meter and chlorine, status is PURELY based on Flow_Error and Cl_Error (not time-based)
      // For pressure, use time-based status
      if (sensorType === "pressure") {
        // Pressure: Use standard time-based communication status
        isCommunicating = topicStatus.status === "communicating";
      } else if (topicStatus.last_value) {
        // Flow Meter and Chlorine: Determine status from Flow_Error and Cl_Error
        try {
          const lastValue = JSON.parse(topicStatus.last_value);
          const flowError =
            lastValue.Flow_Error !== undefined
              ? String(lastValue.Flow_Error)
              : null;
          const clError =
            lastValue.Cl_Error !== undefined
              ? String(lastValue.Cl_Error)
              : null;

          if (sensorType === "flow_meter") {
            // Flow Meter: Communicating if Flow_Error=0 AND Cl_Error=1
            isCommunicating = flowError === "0" && clError === "1";
          } else if (sensorType === "chlorine") {
            if (chlorineType === "4-20mA") {
              // Chlorine (4-20mA): Communicating if (Flow_Error=1 AND Cl_Error=0) OR (both errors=1)
              isCommunicating =
                (flowError === "1" && clError === "0") ||
                (flowError === "1" && clError === "1");
            } else {
              // Chlorine (Rs 485 or blank): Communicating if Flow_Error=1 AND Cl_Error=0 (both=1 means not communicating)
              isCommunicating = flowError === "1" && clError === "0";
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, topic is not communicating
          console.error("Error parsing last_value JSON:", parseError);
          isCommunicating = false;
        }
      } else {
        // No last_value data available, topic is not communicating
        isCommunicating = false;
      }

      // Return the result with the updated status
      res.json({
        ...topicStatus,
        status: isCommunicating ? "communicating" : "not communicated",
      });
    } catch (error) {
      console.error("Error checking topic status:", error);
      res.status(500).json({ message: "Failed to check topic status" });
    }
  });

  // MQTT Topic Status endpoint (for new MQTT Topic Configuration page)
  app.get("/api/topic-status/:topicId", async (req, res) => {
    try {
      const topicId = req.params.topicId;

      if (!topicId) {
        return res.status(400).json({ message: "Topic ID is required" });
      }

      const topicStatus = await mqttService.getTopicStatus(topicId);

      // Convert to format expected by frontend
      const response = {
        isOnline: topicStatus.status === "communicating",
        lastValue: topicStatus.last_value,
        lastSeen: topicStatus.last_seen,
      };

      res.json(response);
    } catch (error) {
      console.error("Error checking topic status:", error);
      res.status(500).json({ message: "Failed to check topic status" });
    }
  });

  // MQTT Topic Configuration endpoints
  app.get("/api/mqtt-topic-config", async (req, res) => {
    try {
      const db = await getDB();
      const configurations = await db.select().from(mqttTopicConfigurations);
      res.json({
        success: true,
        data: configurations,
      });
    } catch (error) {
      console.error("Error fetching MQTT topic configurations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch MQTT topic configurations",
      });
    }
  });

  // Excel Upload for MQTT Topic Configuration (Admin only)
  // Supports Excel files with 6 sheets: Amravati, Nashik, Konkan, Pune, CS, and Nagpur
  app.post(
    "/api/mqtt-topic-config/upload-csv",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const ExcelJS = await import("exceljs");
        const Workbook = ExcelJS.default.Workbook;
        const workbook = new Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const db = await getDB();

        // Clear existing data
        await db.delete(mqttTopicConfigurations);

        // Expected sheet names
        const sheetNames = [
          "Amravati",
          "Nashik",
          "Konkan",
          "Pune",
          "CS",
          "Nagpur",
        ];

        let totalImported = 0;
        const importStats: Record<string, number> = {};

        // Process each sheet
        for (const sheetName of sheetNames) {
          const worksheet = workbook.getWorksheet(sheetName);
          if (!worksheet) {
            console.log(`Sheet ${sheetName} not found, skipping...`);
            importStats[sheetName] = 0;
            continue;
          }

          let sheetImported = 0;
          const rows = worksheet.getSheetValues();

          // Skip header row (row 1)
          for (let i = 2; i < rows.length; i++) {
            const row: any = rows[i];
            if (!row || row.length === 0) continue;

            // Map columns to database fields (assuming same structure as before)
            const record: any = {
              server: sheetName, // Add server/sheet name
              sr_no: row[1] ? parseInt(String(row[1])) : null,
              region: row[2] ? String(row[2]) : null,
              circle: row[3] ? String(row[3]) : null,
              division: row[4] ? String(row[4]) : null,
              sub_division: row[5] ? String(row[5]) : null,
              block: row[6] ? String(row[6]) : null,
              scheme_id_name: row[7] ? String(row[7]) : null,
              vendor: row[8] ? String(row[8]) : null,
              village: row[9] ? String(row[9]) : null,
              reservoir: row[10] ? String(row[10]) : null,
              message_type: row[11] ? String(row[11]) : null,
              topic_for_flow_meter: row[12] ? String(row[12]) : null,
              topic_for_cl: row[13] ? String(row[13]) : null,
              type_of_cl: row[14] ? String(row[14]) : null,
              topic_for_pressure: row[15] ? String(row[15]) : null,
              received_date: row[16] ? String(row[16]) : null,
              date_of_integration: row[17] ? String(row[17]) : null,
            };

            // Skip empty rows
            if (!record.region && !record.scheme_id_name && !record.village) {
              continue;
            }

            await db.insert(mqttTopicConfigurations).values(record);
            sheetImported++;
            totalImported++;
          }

          importStats[sheetName] = sheetImported;
        }

        res.json({
          success: true,
          message: `Successfully imported ${totalImported} MQTT topic configurations from ${Object.keys(importStats).length} sheets`,
          count: totalImported,
          details: importStats,
        });
      } catch (error) {
        console.error("Error importing MQTT topic configurations:", error);
        res.status(500).json({
          success: false,
          message: "Failed to import MQTT topic configurations",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Excel export endpoint for MQTT Topic Configuration (Admin only)
  // Creates Summary sheet (by broker server) + 6 region sheets (Amravati, Nashik, Konkan, Pune, CS, Nagpur) with broker server column
  app.get("/api/mqtt-topic-config/export", requireAdmin, async (req, res) => {
    try {
      const ExcelJS = await import("exceljs");
      const Workbook = ExcelJS.default.Workbook;
      const db = await getDB();
      const configurations = await db.select().from(mqttTopicConfigurations);

      // Create a new workbook
      const workbook = new Workbook();

      // Define region names
      const serverNames = [
        "Amravati",
        "Nashik",
        "Konkan",
        "Pune",
        "CS",
        "Nagpur",
      ];

      // Define broker servers
      const brokerServers = [
        { name: "Primary Server", ip: "14.99.99.166" },
        { name: "Secondary Server", ip: "49.50.99.188" },
      ];

      // Helper function to check if a topic meets communication criteria
      // For flow meter and chlorine: status is PURELY based on Flow_Error and Cl_Error (not time-based)
      // For pressure: uses time-based status
      const checkTopicCommunication = (
        topicStatus: any,
        sensorType: "flow_meter" | "chlorine" | "pressure",
        chlorineType?: string,
      ): boolean => {
        // Pressure uses time-based status
        if (sensorType === "pressure") {
          return topicStatus.status === "communicating";
        }

        // Flow meter and chlorine require last_value with Flow_Error and Cl_Error
        if (!topicStatus.last_value) {
          return false;
        }

        try {
          const lastValue = JSON.parse(topicStatus.last_value);
          const flowError =
            lastValue.Flow_Error !== undefined
              ? String(lastValue.Flow_Error)
              : null;
          const clError =
            lastValue.Cl_Error !== undefined
              ? String(lastValue.Cl_Error)
              : null;

          if (sensorType === "flow_meter") {
            // Flow Meter: Communicating if Flow_Error=0 AND Cl_Error=1
            return flowError === "0" && clError === "1";
          } else if (sensorType === "chlorine") {
            if (chlorineType === "4-20mA") {
              // Chlorine (4-20mA): Communicating if (Flow_Error=1 AND Cl_Error=0) OR (both errors=1)
              return (
                (flowError === "1" && clError === "0") ||
                (flowError === "1" && clError === "1")
              );
            } else {
              // Chlorine (Rs 485 or blank): Communicating if Flow_Error=1 AND Cl_Error=0 (both=1 means not communicating)
              return flowError === "1" && clError === "0";
            }
          }
        } catch (parseError) {
          return false;
        }

        return false;
      };

      // Calculate summary statistics by MQTT broker server
      const summaryData: {
        server: string;
        flowMeter: number;
        cl: number;
        pressure: number;
        total: number;
      }[] = [];

      for (const broker of brokerServers) {
        let flowMeterActive = 0;
        let clActive = 0;
        let pressureActive = 0;

        // Check all topics across all configurations
        for (const config of configurations) {
          if (config.topic_for_flow_meter) {
            try {
              const topicStatus = await mqttService.getTopicStatus(
                config.topic_for_flow_meter,
              );
              if (
                checkTopicCommunication(topicStatus, "flow_meter") &&
                topicStatus.broker_server === broker.name
              ) {
                flowMeterActive++;
              }
            } catch (error) {
              // Topic not active
            }
          }

          if (config.topic_for_cl) {
            try {
              const topicStatus = await mqttService.getTopicStatus(
                config.topic_for_cl,
              );
              const chlorineType = config.type_of_cl || "other";
              if (
                checkTopicCommunication(
                  topicStatus,
                  "chlorine",
                  chlorineType,
                ) &&
                topicStatus.broker_server === broker.name
              ) {
                clActive++;
              }
            } catch (error) {
              // Topic not active
            }
          }

          if (config.topic_for_pressure) {
            try {
              const topicStatus = await mqttService.getTopicStatus(
                config.topic_for_pressure,
              );
              if (
                checkTopicCommunication(topicStatus, "pressure") &&
                topicStatus.broker_server === broker.name
              ) {
                pressureActive++;
              }
            } catch (error) {
              // Topic not active
            }
          }
        }

        const total = flowMeterActive + clActive + pressureActive;
        summaryData.push({
          server: `${broker.name} (${broker.ip})`,
          flowMeter: flowMeterActive,
          cl: clActive,
          pressure: pressureActive,
          total,
        });
      }

      // Create Summary sheet
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Server", key: "server", width: 35 },
        { header: "Flow Active", key: "flowMeter", width: 15 },
        { header: "CL Active", key: "cl", width: 15 },
        { header: "Pressure Active", key: "pressure", width: 18 },
        { header: "Total", key: "total", width: 12 },
      ];

      // Style summary header
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Add summary data rows
      for (const data of summaryData) {
        summarySheet.addRow(data);
      }

      // Add borders to summary sheet
      summarySheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Define columns for region sheets (now includes Broker Server column)
      const columns = [
        { header: "Sr.No", key: "sr_no", width: 8 },
        { header: "Region", key: "region", width: 15 },
        { header: "Circle", key: "circle", width: 15 },
        { header: "Division", key: "division", width: 15 },
        { header: "Sub Division", key: "sub_division", width: 15 },
        { header: "Block", key: "block", width: 15 },
        { header: "Scheme ID Name", key: "scheme_id_name", width: 25 },
        { header: "Vendor", key: "vendor", width: 15 },
        { header: "Village", key: "village", width: 20 },
        { header: "Reservoir", key: "reservoir", width: 20 },
        { header: "Message Type", key: "message_type", width: 15 },
        {
          header: "Topic For Flow Meter",
          key: "topic_for_flow_meter",
          width: 30,
        },
        {
          header: "Broker Server (Flow)",
          key: "broker_server_flow",
          width: 30,
        },
        { header: "Topic For CL", key: "topic_for_cl", width: 30 },
        { header: "Broker Server (CL)", key: "broker_server_cl", width: 30 },
        { header: "Type of CL", key: "type_of_cl", width: 12 },
        { header: "Topic For Pressure", key: "topic_for_pressure", width: 30 },
        {
          header: "Broker Server (Pressure)",
          key: "broker_server_pressure",
          width: 30,
        },
        { header: "Received Date", key: "received_date", width: 15 },
        {
          header: "Date of Integration",
          key: "date_of_integration",
          width: 15,
        },
      ];

      // Create a sheet for each region
      for (const serverName of serverNames) {
        const worksheet = workbook.addWorksheet(serverName);
        worksheet.columns = columns;

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Filter configurations for this region
        const serverConfigs = configurations.filter(
          (c) => c.server === serverName,
        );

        // Add data rows with broker server information (only for topics meeting communication criteria)
        for (const config of serverConfigs) {
          // Get broker server for each topic (only if it meets communication criteria)
          let brokerServerFlow = "";
          let brokerServerCl = "";
          let brokerServerPressure = "";

          if (config.topic_for_flow_meter) {
            try {
              const topicStatus = await mqttService.getTopicStatus(
                config.topic_for_flow_meter,
              );
              // Only show server if topic meets communication criteria
              if (
                checkTopicCommunication(topicStatus, "flow_meter") &&
                topicStatus.broker_server
              ) {
                const broker = brokerServers.find(
                  (b) => b.name === topicStatus.broker_server,
                );
                brokerServerFlow = broker
                  ? `${broker.name} (${broker.ip})`
                  : topicStatus.broker_server;
              }
            } catch (error) {
              // Topic not found
            }
          }

          if (config.topic_for_cl) {
            try {
              const topicStatus = await mqttService.getTopicStatus(
                config.topic_for_cl,
              );
              const chlorineType = config.type_of_cl || "other";
              // Only show server if topic meets communication criteria
              if (
                checkTopicCommunication(
                  topicStatus,
                  "chlorine",
                  chlorineType,
                ) &&
                topicStatus.broker_server
              ) {
                const broker = brokerServers.find(
                  (b) => b.name === topicStatus.broker_server,
                );
                brokerServerCl = broker
                  ? `${broker.name} (${broker.ip})`
                  : topicStatus.broker_server;
              }
            } catch (error) {
              // Topic not found
            }
          }

          if (config.topic_for_pressure) {
            try {
              const topicStatus = await mqttService.getTopicStatus(
                config.topic_for_pressure,
              );
              // Only show server if topic meets communication criteria
              if (
                checkTopicCommunication(topicStatus, "pressure") &&
                topicStatus.broker_server
              ) {
                const broker = brokerServers.find(
                  (b) => b.name === topicStatus.broker_server,
                );
                brokerServerPressure = broker
                  ? `${broker.name} (${broker.ip})`
                  : topicStatus.broker_server;
              }
            } catch (error) {
              // Topic not found
            }
          }

          const rowData = {
            sr_no: config.sr_no || "",
            region: config.region || "",
            circle: config.circle || "",
            division: config.division || "",
            sub_division: config.sub_division || "",
            block: config.block || "",
            scheme_id_name: config.scheme_id_name || "",
            vendor: config.vendor || "",
            village: config.village || "",
            reservoir: config.reservoir || "",
            message_type: config.message_type || "",
            topic_for_flow_meter: config.topic_for_flow_meter || "",
            broker_server_flow: brokerServerFlow,
            topic_for_cl: config.topic_for_cl || "",
            broker_server_cl: brokerServerCl,
            type_of_cl: config.type_of_cl || "",
            topic_for_pressure: config.topic_for_pressure || "",
            broker_server_pressure: brokerServerPressure,
            received_date: config.received_date || "",
            date_of_integration: config.date_of_integration || "",
          };

          worksheet.addRow(rowData);
        }

        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });
      }

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers for file download
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `mqtt-topic-configurations-${timestamp}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);

      res.send(buffer);
    } catch (error) {
      console.error("Error generating Excel export:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate Excel export",
      });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body using registerUserSchema (includes confirm password)
      const registerData = registerUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(
        registerData.username,
      );
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Remove confirmPassword before creating user as it's not in our database schema
      const { confirmPassword, ...userData } = registerData;

      // Create the new user
      const newUser = await storage.createUser(userData);

      // Return success without sensitive data
      res.status(201).json({
        message: "User registered successfully",
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid registration data",
          errors: error.errors,
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.validateUserCredentials(
        credentials.username,
        credentials.password,
      );

      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Set a session value to track login
      if (req.session) {
        req.session.userId = user.id;
        req.session.isAdmin = user.role === "admin";
      }

      // Log the user login with IP address and user agent
      try {
        const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
        const userAgent = req.get("User-Agent") || "unknown";
        const sessionId = req.sessionID;

        await storage.logUserLogin(user, ipAddress, userAgent, sessionId);
        console.log(
          `User login logged: ${user.username} (${user.name}) at ${new Date().toISOString()}`,
        );
      } catch (logError) {
        console.error("Error logging user login:", logError);
        // Don't fail the login if logging fails
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        isAdmin: user.role === "admin",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid login data",
          errors: error.errors,
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Check auth status
  app.get("/api/auth/status", (req, res) => {
    // Prevent browser from caching auth status
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    const isLoggedIn = !!(req.session && req.session.userId);
    const isAdmin = !!(req.session && req.session.isAdmin === true);
    res.json({ isLoggedIn, isAdmin });
  });

  // Get current user details
  app.get("/api/auth/user", async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user details excluding password
      const { password, ...userDetails } = user;
      res.json(userDetails);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // Get user login logs with activities (admin only)
  app.get("/api/auth/login-logs", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const userId = req.query.userId
        ? parseInt(req.query.userId as string)
        : undefined;

      let logs;
      if (userId) {
        logs = await storage.getUserLoginLogsByUserId(userId, limit);
      } else {
        logs = await storage.getUserLoginLogs(limit);
      }

      // Fetch activities for each session
      const logsWithActivities = await Promise.all(
        logs.map(async (log: any) => {
          if (log.session_id) {
            const activities = await storage.getUserActivityLogsBySession(
              log.session_id,
              20,
            );
            return { ...log, activities };
          }
          return { ...log, activities: [] };
        }),
      );

      res.json(logsWithActivities);
    } catch (error) {
      console.error("Error fetching login logs:", error);
      res.status(500).json({ message: "Failed to fetch login logs" });
    }
  });

  // Log user activity (for authenticated users)
  app.post("/api/auth/log-activity", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const {
        activity_type,
        activity_description,
        file_name,
        file_type,
        page_url,
        metadata,
        filter_applied,
        export_format,
        data_count,
        scheme_filter,
        region_filter,
      } = req.body;

      if (!activity_type || !activity_description) {
        return res
          .status(400)
          .json({ message: "Activity type and description are required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Enhanced metadata for comprehensive tracking
      const enhancedMetadata = {
        ...metadata,
        filter_applied,
        export_format,
        data_count,
        scheme_filter,
        region_filter,
        timestamp: new Date().toISOString(),
        referer: req.get("Referer"),
        user_role: user.role,
      };

      const activity = await storage.logUserActivity({
        user_id: user.id,
        username: user.username,
        session_id: req.sessionID,
        activity_type,
        activity_description,
        file_name: file_name || null,
        file_type: file_type || null,
        page_url: page_url || req.get("Referer") || null,
        ip_address: req.ip || req.connection.remoteAddress || null,
        user_agent: req.get("User-Agent") || null,
        metadata: enhancedMetadata,
      });

      res.json(activity);
    } catch (error) {
      console.error("Error logging user activity:", error);
      res.status(500).json({ message: "Failed to log activity" });
    }
  });

  // Get user activities (admin only)
  app.get("/api/auth/activities", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const userId = req.query.userId
        ? parseInt(req.query.userId as string)
        : undefined;

      const activities = await storage.getUserActivityLogs(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    if (req.session && req.session.userId) {
      const sessionId = req.sessionID;

      try {
        // Log the logout time in the database
        await storage.logUserLogout(sessionId);
        console.log(`User logout logged for session: ${sessionId}`);
      } catch (error) {
        console.error("Error logging logout:", error);
      }

      // Explicitly clear the session cookie
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      req.session.destroy((err: Error | null) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } else {
      res.json({ message: "Not logged in" });
    }
  });

  // Get all regions
  app.get("/api/regions", async (req, res) => {
    try {
      const view = (req.query.view as "ALL" | "INSTRUMENTED") || "ALL";
      const regions = await storage.getAllRegions(view);
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  // Get scope totals from scheme_progress_summary, optionally filtered by region.
  // Joins to scheme_status on scheme_id to resolve the region for each scheme.
  app.get("/api/scheme-progress-summary/scope", async (req, res) => {
    try {
      const region = (req.query.region as string) || "all";
      const db = await getDB();
      const filterByRegion = region && region !== "all";
      // Some rows in scheme_progress_summary use a surrogate `scheme_id` and
      // store the real scheme identifier in `scheme_name`. We resolve the
      // region by matching scheme_status.scheme_id against EITHER column.
      const result = await db.execute(sql`
        SELECT
          COUNT(DISTINCT scheme_id)::bigint AS total_schemes,
          COALESCE(SUM(number_of_villages), 0)::bigint AS total_villages,
          COALESCE(SUM(COALESCE(number_of_esr,0) + COALESCE(number_of_gsr,0) + COALESCE(number_of_mbr,0)), 0)::bigint AS total_esr,
          COALESCE(SUM(total_flowmeter_scope), 0)::bigint AS total_flowmeter_scope,
          COALESCE(SUM(total_rca_scope), 0)::bigint AS total_rca_scope,
          COALESCE(SUM(total_pt_scope), 0)::bigint AS total_pt_scope
        FROM scheme_progress_summary
        ${filterByRegion ? sql`WHERE region = ${region}` : sql``}
      `);
      const row = (result as any).rows ? (result as any).rows[0] : (result as any)[0];
      const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));
      res.json({
        totalSchemes: toNum(row?.total_schemes),
        totalVillages: toNum(row?.total_villages),
        totalEsr: toNum(row?.total_esr),
        totalFlowmeterScope: toNum(row?.total_flowmeter_scope),
        totalRcaScope: toNum(row?.total_rca_scope),
        totalPtScope: toNum(row?.total_pt_scope),
      });
    } catch (error) {
      console.error("Error fetching scheme progress scope:", error);
      res.status(500).json({ message: "Failed to fetch scope summary" });
    }
  });

  // Get region summary (filtered by region if provided)
    app.get("/api/regions/summary", async (req, res) => {
    try {
      const regionName = req.query.region as string;
      const view = (req.query.view as "ALL" | "INSTRUMENTED") || "ALL";
      // Handle "all" value as no specific region
      const regionNameToUse = regionName === "all" ? undefined : regionName;
      const summary = await storage.getRegionSummary(
        regionNameToUse,
        undefined,
        undefined,
        undefined,
        undefined,
        view,
      );
      res.json(summary);
    } catch (error) {
      console.error("Error fetching region summary:", error);
      res.status(500).json({ message: "Failed to fetch region summary" });
    }
  });

  // Get summary for a specific region by name (used by chatbot)
  app.get("/api/regions/:name/summary", async (req, res) => {
    try {
      const regionName = req.params.name;
      const summary = await storage.getRegionSummary(regionName);
      res.json(summary);
    } catch (error) {
      console.error(
        `Error fetching summary for region ${req.params.name}:`,
        error,
      );
      res.status(500).json({ message: "Failed to fetch region summary" });
    }
  });

  // Get today's updates (new and completed items)
  app.get("/api/updates/today", async (req, res) => {
    try {
      const todayUpdates = await storage.getTodayUpdates();
      res.json(todayUpdates);
    } catch (error) {
      console.error("Error fetching today's updates:", error);
      res.status(500).json({ message: "Failed to fetch today's updates" });
    }
  });

  // Get a specific region by name
  app.get("/api/regions/:name", async (req, res) => {
    try {
      const regionName = req.params.name;
      const region = await storage.getRegionByName(regionName);

      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }

      res.json(region);
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ message: "Failed to fetch region" });
    }
  });

  // Create a new region
  app.post("/api/regions", async (req, res) => {
    try {
      const regionData = insertRegionSchema.parse(req.body);
      const newRegion = await storage.createRegion(regionData);
      res.status(201).json(newRegion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid region data",
          errors: error.errors,
        });
      }
      console.error("Error creating region:", error);
      res.status(500).json({ message: "Failed to create region" });
    }
  });

  // Update an existing region
  app.put("/api/regions/:id", async (req, res) => {
    try {
      const regionId = parseInt(req.params.id);

      if (isNaN(regionId)) {
        return res.status(400).json({ message: "Invalid region ID" });
      }

      const regionData = req.body;

      // Ensure the ID in the path matches the ID in the body
      if (regionData.region_id !== regionId) {
        return res.status(400).json({ message: "Region ID mismatch" });
      }

      const existingRegion = await storage.getRegionByName(
        regionData.region_name,
      );

      if (!existingRegion) {
        return res.status(404).json({ message: "Region not found" });
      }

      const updatedRegion = await storage.updateRegion(regionData);
      res.json(updatedRegion);
    } catch (error) {
      console.error("Error updating region:", error);
      res.status(500).json({ message: "Failed to update region" });
    }
  });

  // Get all schemes with optional region, status, and scheme_id filters
  // Get filter options for schemes with cascading logic
  app.get("/api/schemes/filters", async (req, res) => {
    try {
      const region = req.query.region as string;
      const circle = req.query.circle as string;
      const division = req.query.division as string;
      const subdivision = req.query.subdivision as string;
      const agencyType = req.query.agencyType as string;

      const db = await storage.getDb();

      // Common condition for agency type
      const agencyCondition = agencyType && agencyType !== "ALL" 
        ? eq(schemeStatuses.agency_type, agencyType) 
        : undefined;

      // Get regions (filtered by agency type if provided)
      const regionConditions = [];
      if (agencyCondition) regionConditions.push(agencyCondition);
      regionConditions.push(sql`${schemeStatuses.region} is not null and ${schemeStatuses.region} != ''`);
      
      const regionsList = await db
        .selectDistinct({ value: schemeStatuses.region })
        .from(schemeStatuses)
        .where(and(...regionConditions))
        .orderBy(asc(schemeStatuses.region));

      // Get circles filtered by region and agency
      const circleConditions = [];
      if (region && region !== "all")
        circleConditions.push(eq(schemeStatuses.region, region));
      if (agencyCondition) circleConditions.push(agencyCondition);
      circleConditions.push(sql`${schemeStatuses.circle} is not null and ${schemeStatuses.circle} != ''`);

      const circles = await db
        .selectDistinct({ value: schemeStatuses.circle })
        .from(schemeStatuses)
        .where(and(...circleConditions))
        .orderBy(asc(schemeStatuses.circle));

      // Get divisions filtered by region, circle and agency
      const divisionConditions = [];
      if (region && region !== "all")
        divisionConditions.push(eq(schemeStatuses.region, region));
      if (circle && circle !== "all")
        divisionConditions.push(eq(schemeStatuses.circle, circle));
      if (agencyCondition) divisionConditions.push(agencyCondition);
      divisionConditions.push(sql`${schemeStatuses.division} is not null and ${schemeStatuses.division} != ''`);

      const divisions = await db
        .selectDistinct({ value: schemeStatuses.division })
        .from(schemeStatuses)
        .where(and(...divisionConditions))
        .orderBy(asc(schemeStatuses.division));

      // Get subdivisions filtered by region, circle, division and agency
      const subdivisionConditions = [];
      if (region && region !== "all")
        subdivisionConditions.push(eq(schemeStatuses.region, region));
      if (circle && circle !== "all")
        subdivisionConditions.push(eq(schemeStatuses.circle, circle));
      if (division && division !== "all")
        subdivisionConditions.push(eq(schemeStatuses.division, division));
      if (agencyCondition) subdivisionConditions.push(agencyCondition);
      subdivisionConditions.push(sql`${schemeStatuses.sub_division} is not null and ${schemeStatuses.sub_division} != ''`);

      const subdivisions = await db
        .selectDistinct({ value: schemeStatuses.sub_division })
        .from(schemeStatuses)
        .where(and(...subdivisionConditions))
        .orderBy(asc(schemeStatuses.sub_division));

      // Get blocks filtered by all parent geographical levels and agency
      const blockConditions = [];
      if (region && region !== "all")
        blockConditions.push(eq(schemeStatuses.region, region));
      if (circle && circle !== "all")
        blockConditions.push(eq(schemeStatuses.circle, circle));
      if (division && division !== "all")
        blockConditions.push(eq(schemeStatuses.division, division));
      if (subdivision && subdivision !== "all")
        blockConditions.push(eq(schemeStatuses.sub_division, subdivision));
      if (agencyCondition) blockConditions.push(agencyCondition);
      blockConditions.push(sql`${schemeStatuses.block} is not null and ${schemeStatuses.block} != ''`);

      const blocks = await db
        .selectDistinct({ value: schemeStatuses.block })
        .from(schemeStatuses)
        .where(and(...blockConditions))
        .orderBy(asc(schemeStatuses.block));

      res.json({
        regions: regionsList.map((r: any) => r.value),
        circles: circles.map((c: any) => c.value),
        divisions: divisions.map((d: any) => d.value),
        subdivisions: subdivisions.map((s: any) => s.value),
        blocks: blocks.map((b: any) => b.value),
      });
    } catch (error) {
      console.error("Error fetching scheme filter options:", error);
      res.status(500).json({ error: "Failed to fetch filter options" });
    }
  });

  app.get("/api/schemes", async (req, res) => {
    try {
      const regionName = req.query.region as string;
      const status = req.query.status as string;
      const schemeId = req.query.scheme_id as string;
      const mjpCommissioned = req.query.mjp_commissioned as string;
      const mjpFullyCompleted = req.query.mjp_fully_completed as string;
      const circle = req.query.circle as string;
      const division = req.query.division as string;
      const subdivision = req.query.subdivision as string;
      const block = req.query.block as string;
      const agencyType = req.query.agencyType as string;
      const viewType = (req.query.view_type as string) || "summary";
      // Default to consolidated view (true) for summary, non-consolidated (false) for detailed
      const consolidated =
        req.query.consolidated === "true" ||
        (req.query.consolidated === undefined && viewType === "summary");

      console.log(
        `Request params: region=${regionName}, circle=${circle}, division=${division}, subdivision=${subdivision}, block=${block}, status=${status}, schemeId=${schemeId}, mjpCommissioned=${mjpCommissioned}, mjpFullyCompleted=${mjpFullyCompleted}, agencyType=${agencyType}, consolidated=${consolidated}, viewType=${viewType}`,
      );

      let schemes;

      if (regionName && regionName !== "all") {
        // Use consolidated schemes for the region
        if (consolidated) {
          console.log(
            `Filtering for consolidated schemes in region=${regionName}, status=${status}, agencyType=${agencyType}`,
          );
          schemes = await storage.getConsolidatedSchemesByRegion(
            regionName,
            status,
            schemeId,
            circle,
            division,
            subdivision,
            block,
            agencyType,
          );
        } else {
          // Use original non-consolidated method
          console.log(
            `Filtering for all scheme instances in region=${regionName}, status=${status}, agencyType=${agencyType}`,
          );
          schemes = await storage.getSchemesByRegion(
            regionName,
            status,
            schemeId,
            circle,
            division,
            subdivision,
            block,
            agencyType,
          );
        }
        console.log(`Found ${schemes.length} schemes for region ${regionName}`);
      } else {
        // Get all schemes across regions
        if (consolidated) {
          console.log(`Getting consolidated schemes with status=${status}, agencyType=${agencyType}`);
          schemes = await storage.getConsolidatedSchemes(
            status,
            schemeId,
            circle,
            division,
            subdivision,
            block,
            agencyType,
          );
        } else {
          // Use original non-consolidated method
          console.log(`Getting all scheme instances with status=${status}, agencyType=${agencyType}`);
          schemes = await storage.getAllSchemes(
            status,
            schemeId,
            circle,
            division,
            subdivision,
            block,
            agencyType,
          );
        }
        console.log(`Found ${schemes.length} schemes across all regions`);
      }

      // Double-check that we're returning only schemes for the requested region
      if (regionName && regionName !== "all") {
        schemes = schemes.filter((scheme) => scheme.region === regionName);
        console.log(
          `After filtering: ${schemes.length} schemes for region ${regionName}`,
        );
      }

      // Apply MJP commissioned filter if specified
      if (mjpCommissioned && mjpCommissioned !== "all") {
        schemes = schemes.filter(
          (scheme) => scheme.mjp_commissioned === mjpCommissioned,
        );
        console.log(
          `After MJP commissioned filtering: ${schemes.length} schemes with mjp_commissioned=${mjpCommissioned}`,
        );
      }

      // Apply MJP fully completed filter if specified
      if (mjpFullyCompleted && mjpFullyCompleted !== "all") {
        schemes = schemes.filter(
          (scheme) => scheme.mjp_fully_completed === mjpFullyCompleted,
        );
        console.log(
          `After MJP fully completed filtering: ${schemes.length} schemes with mjp_fully_completed=${mjpFullyCompleted}`,
        );
      }

      res.json(schemes);
    } catch (error) {
      console.error("Error fetching schemes:", error);
      res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });

  // Get scheme counts with both filtered count and total from regions table
  app.get("/api/schemes/counts", async (req, res) => {
    try {
      const regionName = req.query.region as string;

      let filteredSchemeCount = 0;
      let totalSchemeCount = 0;

      const circle = req.query.circle as string;
      const division = req.query.division as string;
      const subdivision = req.query.subdivision as string;
      const block = req.query.block as string;

      if (regionName && regionName !== "all") {
        // Get filtered scheme count from scheme_status table for specific region
        const schemes = await storage.getConsolidatedSchemesByRegion(
          regionName,
          undefined,
          undefined,
          circle,
          division,
          subdivision,
          block,
        );
        filteredSchemeCount = schemes.length;

        // Get total scheme count from regions table
        const region = await storage.getRegionByName(regionName);
        totalSchemeCount = region?.total_schemes_integrated || 0;
      } else {
        // Get all schemes count from scheme_status table
        const schemes = await storage.getAllSchemes(
          undefined,
          undefined,
          circle,
          division,
          subdivision,
          block,
        );
        filteredSchemeCount = schemes.length;

        // Get total scheme count from all regions
        const allRegions = await storage.getAllRegions();
        totalSchemeCount = allRegions.reduce(
          (sum, region) => sum + (region.total_schemes_integrated || 0),
          0,
        );
      }

      res.json({
        filteredCount: filteredSchemeCount,
        totalCount: totalSchemeCount,
        region: regionName || "all",
      });
    } catch (error) {
      console.error("Error fetching scheme counts:", error);
      res.status(500).json({ message: "Failed to fetch scheme counts" });
    }
  });

  // Get a specific scheme by ID
  app.get("/api/schemes/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;
      const block = req.query.block ? String(req.query.block) : undefined;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      console.log(`Fetching scheme ${schemeId} (block: ${block || "any"})`);

      const scheme = block
        ? await storage.getSchemeByIdAndBlock(schemeId, block)
        : await storage.getSchemeById(schemeId);

      if (!scheme) {
        console.log(`Scheme ${schemeId} not found`);
        return res.status(404).json({ message: "Scheme not found" });
      }

      res.json(scheme);
    } catch (error) {
      console.error("Error fetching scheme:", error);
      res.status(500).json({ message: "Failed to fetch scheme" });
    }
  });

  // Get block-specific dashboard URLs for a scheme
  app.get("/api/schemes/block-dashboards/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      const blockDashboards = await storage.getSchemeBlockDashboards(schemeId);
      res.json(blockDashboards);
    } catch (error) {
      console.error("Error fetching block dashboards:", error);
      res.status(500).json({ message: "Failed to fetch block dashboards" });
    }
  });

  // Get water scheme data for a specific scheme (for scheme details page)
  app.get("/api/water-scheme-data/by-scheme/:schemeId", async (req, res) => {
    try {
      const schemeId = req.params.schemeId;
      const block = req.query.block as string | undefined;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      // Fetch water scheme data for the scheme
      const waterData = await storage.getWaterSchemeDataByScheme(
        schemeId,
        block,
      );

      // Fetch village completion status data for the scheme
      const villageCompletionData = await storage.getVillagesByScheme(
        schemeId,
        block,
      );

      // Create a lookup map for village completion status
      const villageCompletionMap = new Map();
      villageCompletionData.forEach((village) => {
        const key = `${village.village_name}`;
        villageCompletionMap.set(key, village.fully_completion_village_status);
      });

      // Merge completion status into water data
      const enrichedWaterData = waterData.map((waterRecord) => ({
        ...waterRecord,
        fully_completion_village_status:
          villageCompletionMap.get(waterRecord.village_name) || null,
      }));

      res.json(enrichedWaterData);
    } catch (error) {
      console.error("Error fetching water scheme data:", error);
      res.status(500).json({ message: "Failed to fetch water scheme data" });
    }
  });

  // Get ESR data for a specific scheme (for scheme details page)
  app.get("/api/scheme-esr-data/:schemeId", async (req, res) => {
    try {
      const schemeId = req.params.schemeId;
      const block = req.query.block as string | undefined;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      // Fetch chlorine data for the scheme
      const chlorineData = await storage.getChlorineDataByScheme(
        schemeId,
        block,
      );

      // Fetch pressure data for the scheme
      const pressureData = await storage.getPressureDataByScheme(
        schemeId,
        block,
      );

      // Combine the data by ESR
      const esrMap = new Map();

      // Process chlorine data
      chlorineData?.forEach((item) => {
        const key = `${item.village_name}:${item.esr_name}`;
        if (!esrMap.has(key)) {
          esrMap.set(key, {
            village_name: item.village_name,
            esr_name: item.esr_name,
            scheme_id: item.scheme_id,
            scheme_name: item.scheme_name,
          });
        }

        const esr = esrMap.get(key);
        // Get the most recent chlorine value (including 0 values)
        const allChlorineValues = [
          item.chlorine_value_7,
          item.chlorine_value_6,
          item.chlorine_value_5,
          item.chlorine_value_4,
          item.chlorine_value_3,
          item.chlorine_value_2,
          item.chlorine_value_1,
        ];

        // Find the most recent non-null value (including 0)
        let recentChlorine = null;
        for (const val of allChlorineValues) {
          if (val !== null && val !== undefined) {
            const numVal = parseFloat(val.toString());
            if (!isNaN(numVal)) {
              recentChlorine = numVal;
              break;
            }
          }
        }

        esr.chlorine_value = recentChlorine;
      });

      // Process pressure data
      pressureData?.forEach((item) => {
        const key = `${item.village_name}:${item.esr_name}`;
        if (!esrMap.has(key)) {
          esrMap.set(key, {
            village_name: item.village_name,
            esr_name: item.esr_name,
            scheme_id: item.scheme_id,
            scheme_name: item.scheme_name,
          });
        }

        const esr = esrMap.get(key);
        // Get the most recent pressure value
        const pressureValues = [
          item.pressure_value_7,
          item.pressure_value_6,
          item.pressure_value_5,
          item.pressure_value_4,
          item.pressure_value_3,
          item.pressure_value_2,
          item.pressure_value_1,
        ]
          .map((val) =>
            val !== null && val !== undefined
              ? parseFloat(val.toString())
              : null,
          )
          .filter((val) => val !== null && !isNaN(val) && val > 0);

        esr.pressure_value =
          pressureValues.length > 0 ? pressureValues[0] : null;
      });

      const result = Array.from(esrMap.values());
      res.json(result);
    } catch (error) {
      console.error("Error fetching ESR data:", error);
      res.status(500).json({ message: "Failed to fetch ESR data" });
    }
  });

  // Get schemes by name (for multi-block schemes)
  app.get("/api/schemes/by-name/:name", async (req, res) => {
    try {
      const schemeName = req.params.name;
      const blockName = req.query.block as string | undefined;

      if (!schemeName || schemeName.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme name" });
      }

      const schemes = await storage.getSchemesByName(schemeName);

      if (!schemes || schemes.length === 0) {
        return res
          .status(404)
          .json({ message: "No schemes found with this name" });
      }

      // If "All Blocks" is specified or no block specified, return aggregated data
      if (!blockName || blockName === "All Blocks") {
        // If there's only one scheme/block, just return it
        if (schemes.length === 1) {
          return res.json({ ...schemes[0], block: "All Blocks" });
        }

        // Create an aggregated scheme object that sums up numerical values
        // Start with the first scheme's data
        const aggregatedScheme = { ...schemes[0] };

        // Fields to sum up across all blocks
        const numericFields = [
          "number_of_village",
          "total_villages_integrated",
          "fully_completed_villages",
          "no_of_functional_village",
          "no_of_partial_village",
          "no_of_non_functional_village",
          "total_number_of_esr",
          "total_esr_integrated",
          "no_fully_completed_esr",
          "balance_to_complete_esr",
          "flow_meters_connected",
          "pressure_transmitter_connected",
          "residual_chlorine_analyzer_connected",
        ];

        // Reset the numeric fields in our aggregate result to 0
        for (const field of numericFields) {
          if (field in aggregatedScheme) {
            (aggregatedScheme as any)[field] = 0;
          }
        }

        // Sum up the numeric fields from all blocks
        console.log(
          `Aggregating ${schemes.length} blocks for scheme ${schemeName}`,
        );
        for (const scheme of schemes) {
          console.log(`Adding block ${scheme.block} data`);
          for (const field of numericFields) {
            if (field in scheme && typeof (scheme as any)[field] === "number") {
              // Use += to sum up the values
              (aggregatedScheme as any)[field] =
                ((aggregatedScheme as any)[field] || 0) + ((scheme as any)[field] || 0);
              console.log(
                `${field}: ${(scheme as any)[field]} => Total: ${(aggregatedScheme as any)[field]}`,
              );
            }
          }
        }

        // Set special flags for the aggregated result
        (aggregatedScheme as any).isAggregated = true;
        aggregatedScheme.block = "All Blocks";

        console.log("Final aggregated data:", aggregatedScheme);
        return res.json(aggregatedScheme);
      }

      // If a specific block is specified, filter schemes by block
      console.log(
        `Filtering for block: "${blockName}" in ${schemes.length} schemes`,
      );

      // First get a list of all available blocks from the database for this scheme
      const availableBlocks = await storage.getBlocksByScheme(schemeName);
      console.log("Available blocks:", availableBlocks);

      // FIRST: Try to get data from CSV imports (most up-to-date)
      console.log(
        `Trying to get the latest CSV data for scheme "${schemeName}" and block "${blockName}"`,
      );
      const csvData = await storage.getSchemeDataFromCsvImports(
        schemeName,
        blockName,
      );

      if (csvData) {
        console.log(
          `Found CSV data for scheme "${schemeName}" and block "${blockName}"`,
        );

        // Use the CSV data as our primary source of truth
        // But make sure to include any additional fields from the scheme_status record too

        // Get a template scheme_status record to use for missing fields
        let templateScheme = null;

        // Try to find an exact match first
        for (const scheme of schemes) {
          if ((scheme.block || "").toLowerCase() === blockName.toLowerCase()) {
            templateScheme = scheme;
            break;
          }
        }

        // If no exact match, try partial matching
        if (!templateScheme) {
          for (const scheme of schemes) {
            const schemeBlock = (scheme.block || "").toLowerCase();
            const requestedBlockLower = blockName.toLowerCase();

            if (
              schemeBlock.includes(requestedBlockLower) ||
              requestedBlockLower.includes(schemeBlock)
            ) {
              templateScheme = scheme;
              break;
            }
          }
        }

        // If still no match, just use the first scheme as a template
        if (!templateScheme && schemes.length > 0) {
          templateScheme = schemes[0];
        }

        // Merge the CSV data with the template scheme data
        const mergedData = {
          ...templateScheme,
          ...csvData,
          block: blockName, // Ensure the block is set correctly
        };

        console.log(
          `Returning merged CSV data for scheme "${schemeName}" and block "${blockName}"`,
        );
        return res.json(mergedData);
      }

      // SECOND: If no CSV data, fall back to the traditional approach
      console.log(
        `No CSV data found, falling back to scheme_status table for "${schemeName}" and block "${blockName}"`,
      );

      // Try to find an exact match first
      let filteredSchemes = schemes.filter((scheme) => {
        // Handle null or undefined block values
        const schemeBlock = scheme.block || "";
        const requestedBlock = blockName || "";

        // Exact case-insensitive comparison
        return schemeBlock.toLowerCase() === requestedBlock.toLowerCase();
      });

      // If no exact match, try partial matching for CSV imported data
      if (filteredSchemes.length === 0 && blockName) {
        console.log(
          `No exact match found for block "${blockName}", trying partial match...`,
        );

        // Try to find the block using partial matching (in case of CSV import data)
        filteredSchemes = schemes.filter((scheme) => {
          // Check if the block name contains the requested block or vice versa
          const schemeBlock = (scheme.block || "").toLowerCase();
          const requestedBlockLower = blockName.toLowerCase();

          return (
            schemeBlock.includes(requestedBlockLower) ||
            requestedBlockLower.includes(schemeBlock)
          );
        });

        if (filteredSchemes.length > 0) {
          console.log(
            `Found ${filteredSchemes.length} schemes with partial block match for "${blockName}"`,
          );
        }
      }

      console.log(
        `Found ${filteredSchemes.length} schemes matching block "${blockName}"`,
      );

      if (filteredSchemes.length > 0) {
        // Send only the first matching scheme instead of an array
        return res.json(filteredSchemes[0]);
      } else {
        // If we still have no matches, check if this block exists in the database
        // but just doesn't have any scheme_status records yet
        const blockExists = availableBlocks.some(
          (block) => block.toLowerCase() === (blockName || "").toLowerCase(),
        );

        if (blockExists) {
          console.log(
            `Block "${blockName}" exists but has no scheme_status records, creating template`,
          );

          // Use the first scheme as a template and change the block
          const templateScheme = { ...schemes[0] };
          templateScheme.block = blockName;

          // Clear numeric values since this is a new block with no data yet
          const numericFields = [
            "number_of_village",
            "total_villages_integrated",
            "fully_completed_villages",
            "no_of_functional_village",
            "no_of_partial_village",
            "no_of_non_functional_village",
            "total_number_of_esr",
            "total_esr_integrated",
            "no_fully_completed_esr",
            "balance_to_complete_esr",
            "flow_meters_connected",
            "pressure_transmitter_connected",
            "residual_chlorine_analyzer_connected",
          ];

          for (const field of numericFields) {
            if (field in templateScheme) {
              (templateScheme as any)[field] = 0;
            }
          }

          return res.json(templateScheme);
        }

        console.log(
          "No schemes found for the specified block, returning all schemes",
        );
        // If the block wasn't found, still return the aggregate view
        return res.json(schemes);
      }
    } catch (error) {
      console.error("Error fetching schemes by name:", error);
      res.status(500).json({ message: "Failed to fetch schemes by name" });
    }
  });

  // Get aggregated data for a scheme across all blocks
  app.get("/api/schemes/aggregate/:name", async (req, res) => {
    try {
      const schemeName = req.params.name;

      if (!schemeName || schemeName.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme name" });
      }

      // Removed special hardcoded handling for 105 Villages RRWSS
      // Now we use dynamic aggregation from actual database values for all schemes

      const schemes = await storage.getSchemesByName(schemeName);

      if (!schemes || schemes.length === 0) {
        return res
          .status(404)
          .json({ message: "No schemes found with this name" });
      }

      // If there's only one scheme/block, just return it
      if (schemes.length === 1) {
        return res.json({ ...schemes[0], block: "All Blocks" });
      }

      // Create an aggregated scheme object that sums up numerical values
      // Start with the first scheme's data
      const aggregatedScheme = { ...schemes[0] };

      // Fields to sum up across all blocks
      const numericFields = [
        "number_of_village",
        "total_villages_integrated",
        "fully_completed_villages",
        "no_of_functional_village",
        "no_of_partial_village",
        "no_of_non_functional_village",
        "total_number_of_esr",
        "total_esr_integrated",
        "no_fully_completed_esr",
        "balance_to_complete_esr",
        "flow_meters_connected",
        "pressure_transmitter_connected",
        "residual_chlorine_analyzer_connected",
      ];

      // Reset the numeric fields in our aggregate result to 0
      for (const field of numericFields) {
        if (field in aggregatedScheme) {
          (aggregatedScheme as any)[field] = 0;
        }
      }

      // Sum up the numeric fields from all blocks
      console.log(
        `Aggregating ${schemes.length} blocks for scheme ${schemeName}`,
      );
      for (const scheme of schemes) {
        console.log(`Adding block ${scheme.block} data`);
        for (const field of numericFields) {
          if (field in scheme && typeof (scheme as any)[field] === "number") {
            // Use += to sum up the values
            (aggregatedScheme as any)[field] =
              ((aggregatedScheme as any)[field] || 0) + ((scheme as any)[field] || 0);
            console.log(
              `${field}: ${(scheme as any)[field]} => Total: ${(aggregatedScheme as any)[field]}`,
            );
          }
        }
      }

      // Set special flags for the aggregated result
      (aggregatedScheme as any).isAggregated = true;
      aggregatedScheme.block = "All Blocks";

      console.log("Final aggregated data:", aggregatedScheme);
      res.json(aggregatedScheme);
    } catch (error) {
      console.error("Error aggregating scheme data:", error);
      res.status(500).json({ message: "Failed to aggregate scheme data" });
    }
  });

  // Get all scheme status data
  app.get("/api/scheme-status", async (req, res) => {
    try {
      console.log("Fetching all scheme status data");
      const schemes = await storage.getAllSchemes();

      // Transform scheme data to include completion status
      const schemeStatusData = schemes.map((scheme) => ({
        scheme_id: scheme.scheme_id,
        scheme_name: scheme.scheme_name,
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division,
        sub_division: scheme.sub_division,
        block: scheme.block,
        completion_status:
          scheme.fully_completion_scheme_status ||
          (scheme.mjp_fully_completed === "Fully Completed"
            ? "Fully Completed"
            : "In Progress"),
        total_villages: scheme.total_villages_integrated || 0,
        completed_villages: scheme.fully_completed_villages || 0,
        total_esr: scheme.total_esr_integrated || 0,
        completed_esr: scheme.no_fully_completed_esr || 0,
        number_of_village: scheme.number_of_village || 0, // Add the number_of_village field
      }));

      console.log(`Returning ${schemeStatusData.length} scheme status records`);
      res.json(schemeStatusData);
    } catch (error) {
      console.error("Error fetching scheme status:", error);
      res.status(500).json({ message: "Failed to fetch scheme status" });
    }
  });

  // Get schemes by geographic filter (region, division, subdivision, circle, block)
  app.get("/api/schemes/geographic", async (req, res) => {
    try {
      // Extract geographic filters from query params
      const region = (req.query.region as string) || "all";
      const division = (req.query.division as string) || "all";
      const subdivision = (req.query.subdivision as string) || "all";
      const circle = (req.query.circle as string) || "all";
      const block = (req.query.block as string) || "all";

      console.log(`Getting schemes with geographic filters: 
        region=${region}, division=${division}, subdivision=${subdivision}, 
        circle=${circle}, block=${block}`);

      // Start with all schemes
      let schemes = await storage.getAllSchemes();

      // Apply filters
      if (region !== "all") {
        schemes = schemes.filter((scheme) => scheme.region === region);
      }

      if (division !== "all") {
        schemes = schemes.filter((scheme) => scheme.division === division);
      }

      if (subdivision !== "all") {
        schemes = schemes.filter(
          (scheme) => scheme.sub_division === subdivision,
        );
      }

      if (circle !== "all") {
        schemes = schemes.filter((scheme) => scheme.circle === circle);
      }

      if (block !== "all") {
        schemes = schemes.filter((scheme) => scheme.block === block);
      }

      console.log(
        `Found ${schemes.length} schemes matching geographic filters`,
      );

      // Return the filtered schemes
      return res.json(schemes);
    } catch (error) {
      console.error("Error getting schemes by geographic filter:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch schemes by geographic filter" });
    }
  });

  // Get blocks for a specific scheme name
  app.get("/api/schemes/blocks/:name", async (req, res) => {
    try {
      const schemeName = req.params.name;
      console.log(`Received request for blocks of scheme: "${schemeName}"`);

      if (!schemeName || schemeName.trim() === "") {
        console.log("Invalid scheme name provided");
        return res.status(400).json({ message: "Invalid scheme name" });
      }

      console.log(`Looking up blocks for scheme: "${schemeName}"`);
      const blocks = await storage.getBlocksByScheme(schemeName);

      console.log(
        `Found ${blocks.length} blocks for scheme "${schemeName}": ${JSON.stringify(blocks)}`,
      );

      // Make sure blocks are not empty or contain only empty strings
      const validBlocks = blocks.filter(
        (block) => block && block.trim() !== "",
      );

      console.log(`Valid blocks: ${validBlocks.length}`);

      if (validBlocks.length > 0) {
        console.log(
          `Returning ${validBlocks.length} blocks for scheme "${schemeName}"`,
        );
        res.json(validBlocks);
      } else {
        console.log(
          `No valid blocks found for scheme "${schemeName}", checking scheme records directly`,
        );

        // Fallback: Try to get scheme data directly and extract blocks
        const schemes = await storage.getSchemesByName(schemeName);
        console.log(
          `Found ${schemes.length} scheme records with name "${schemeName}"`,
        );

        if (schemes.length > 0) {
          const extractedBlocks = schemes
            .map((scheme) => scheme.block)
            .filter((block) => block && block.trim() !== "");

          console.log(
            `Extracted ${extractedBlocks.length} blocks from scheme records: ${JSON.stringify(extractedBlocks)}`,
          );

          // Return unique blocks only
          const uniqueBlocks = [...new Set(extractedBlocks)];
          console.log(`Returning ${uniqueBlocks.length} unique blocks`);
          res.json(uniqueBlocks);
        } else {
          console.log(`No scheme records found, returning empty blocks array`);
          res.json([]);
        }
      }
    } catch (error) {
      console.error("Error fetching blocks for scheme:", error);
      res.status(500).json({ message: "Failed to fetch blocks for scheme" });
    }
  });

  // Create a new scheme
  app.post("/api/schemes", async (req, res) => {
    try {
      const schemeData = insertSchemeStatusSchema.parse(req.body);
      const newScheme = await storage.createScheme(schemeData);
      res.status(201).json(newScheme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid scheme data",
          errors: error.errors,
        });
      }
      console.error("Error creating scheme:", error);
      res.status(500).json({ message: "Failed to create scheme" });
    }
  });

  // Update an existing scheme
  app.put("/api/schemes/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      const schemeData = req.body;

      // Ensure the ID in the path matches the ID in the body
      if (schemeData.scheme_id !== schemeId) {
        return res.status(400).json({ message: "Scheme ID mismatch" });
      }

      const existingScheme = await storage.getSchemeById(schemeId);

      if (!existingScheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }

      const updatedScheme = await storage.updateScheme(schemeData);
      res.json(updatedScheme);
    } catch (error) {
      console.error("Error updating scheme:", error);
      res.status(500).json({ message: "Failed to update scheme" });
    }
  });

  // Delete a scheme (admin only)
  app.delete("/api/schemes/:id", requireAdmin, async (req, res) => {
    try {
      const schemeId = req.params.id;
      // FIXED: Get block from query params if provided
      const block = req.query.block ? String(req.query.block) : undefined;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      // FIXED: If block is specified, get scheme by ID and block
      const existingScheme =
        block !== undefined
          ? await storage.getSchemeByIdAndBlock(schemeId, block)
          : await storage.getSchemeById(schemeId);

      if (!existingScheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }

      // FIXED: Pass block to deleteScheme to delete specific scheme+block combination
      await storage.deleteScheme(schemeId, existingScheme.block);

      // Return the deleted scheme info and success message
      res.json({
        success: true,
        message: `Scheme '${existingScheme.scheme_name}' has been deleted successfully`,
        deletedScheme: {
          scheme_id: existingScheme.scheme_id,
          scheme_name: existingScheme.scheme_name,
          region_name: existingScheme.region,
        },
      });
    } catch (error) {
      console.error("Error deleting scheme:", error);
      res.status(500).json({ message: "Failed to delete scheme" });
    }
  });

  // Delete all schemes (admin only)
  app.delete("/api/schemes/all/confirm", requireAdmin, async (req, res) => {
    try {
      console.log("Deleting all schemes from database...");

      // Delete all schemes
      const deletedCount = await storage.deleteAllSchemes();

      // Update region summaries after deletion
      await updateRegionSummaries();

      // Force refresh of today's updates
      await storage.getTodayUpdates();

      res.json({
        success: true,
        message: `All schemes have been deleted successfully. Total schemes deleted: ${deletedCount}`,
        deletedCount,
      });
    } catch (error) {
      console.error("Error deleting all schemes:", error);
      res.status(500).json({ message: "Failed to delete all schemes" });
    }
  });

  // --------------------- Water Scheme Data API Routes ---------------------

  // Get all water scheme data with optional filters
  app.get("/api/water-scheme-data", async (req, res) => {
    try {
      // Extract query parameters for filtering
      const region = req.query.region as string | undefined;
      const minLpcd = req.query.minLpcd
        ? parseInt(req.query.minLpcd as string)
        : undefined;
      const maxLpcd = req.query.maxLpcd
        ? parseInt(req.query.maxLpcd as string)
        : undefined;
      const zeroSupplyForWeek = req.query.zeroSupplyForWeek === "true";

      const filter: WaterSchemeDataFilter = {};

      if (region && region !== "all") {
        filter.region = region;
      }

      const circle = req.query.circle as string;
      const division = req.query.division as string;
      const subdivision = req.query.subdivision as string;
      const block = req.query.block as string;

      if (circle && circle !== "all") filter.circle = circle;
      if (division && division !== "all") filter.division = division;
      if (subdivision && subdivision !== "all") filter.subDivision = subdivision;
      if (block && block !== "all") filter.block = block;

      if (!isNaN(minLpcd as number)) {
        filter.minLpcd = minLpcd;
      }

      if (!isNaN(maxLpcd as number)) {
        filter.maxLpcd = maxLpcd;
      }

      if (zeroSupplyForWeek) {
        filter.zeroSupplyForWeek = true;
      }

      // Get data with the provided filters
      const waterSchemeData = await storage.getAllWaterSchemeData(filter);

      // Return the filtered data
      res.json(waterSchemeData);
    } catch (error) {
      console.error("Error fetching water scheme data:", error);
      res.status(500).json({ message: "Failed to fetch water scheme data" });
    }
  });

  // Get water scheme data by scheme ID
  app.get("/api/water-scheme-data/:id", async (req, res) => {
    try {
      const schemeId = req.params.id;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      const waterSchemeData = await storage.getWaterSchemeDataById(schemeId);

      if (!waterSchemeData) {
        return res.status(404).json({ message: "Water scheme data not found" });
      }

      res.json(waterSchemeData);
    } catch (error) {
      console.error("Error fetching water scheme data:", error);
      res.status(500).json({ message: "Failed to fetch water scheme data" });
    }
  });

  // Create new water scheme data
  app.post("/api/water-scheme-data", requireAdmin, async (req, res) => {
    try {
      const waterSchemeData = insertWaterSchemeDataSchema.parse(req.body);
      const newWaterSchemeData =
        await storage.createWaterSchemeData(waterSchemeData);
      res.status(201).json(newWaterSchemeData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid water scheme data",
          errors: error.errors,
        });
      }
      console.error("Error creating water scheme data:", error);
      res.status(500).json({ message: "Failed to create water scheme data" });
    }
  });

  // Update existing water scheme data
  app.put("/api/water-scheme-data/:id", requireAdmin, async (req, res) => {
    try {
      const schemeId = req.params.id;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      // Validate the scheme ID exists
      const existingWaterSchemeData =
        await storage.getWaterSchemeDataById(schemeId);
      if (!existingWaterSchemeData) {
        return res.status(404).json({ message: "Water scheme data not found" });
      }

      // Validate the update data
      const updateData = req.body;

      // Ensure the scheme_id in the request body matches the path parameter
      if (updateData.scheme_id && updateData.scheme_id !== schemeId) {
        return res.status(400).json({ message: "Scheme ID mismatch" });
      }

      // Update the water scheme data
      const updatedWaterSchemeData = await storage.updateWaterSchemeData(
        schemeId,
        updateData,
      );

      res.json(updatedWaterSchemeData);
    } catch (error) {
      console.error("Error updating water scheme data:", error);
      res.status(500).json({ message: "Failed to update water scheme data" });
    }
  });

  // Delete water scheme data (admin only)
  app.delete("/api/water-scheme-data/:id", requireAdmin, async (req, res) => {
    try {
      const schemeId = req.params.id;

      if (!schemeId || schemeId.trim() === "") {
        return res.status(400).json({ message: "Invalid scheme ID" });
      }

      const existingWaterSchemeData =
        await storage.getWaterSchemeDataById(schemeId);

      if (!existingWaterSchemeData) {
        return res.status(404).json({ message: "Water scheme data not found" });
      }

      await storage.deleteWaterSchemeData(schemeId);

      res.json({
        success: true,
        message: `Water scheme data for ID '${schemeId}' has been deleted successfully`,
        deletedSchemeId: schemeId,
      });
    } catch (error) {
      console.error("Error deleting water scheme data:", error);
      res.status(500).json({ message: "Failed to delete water scheme data" });
    }
  });

  // Import water scheme data from Excel file (admin only)
  app.post(
    "/api/water-scheme-data/import/excel",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Save the file to disk temporarily for processing
        const tempDir = path.join(process.cwd(), "temp_uploads");

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `upload_${Date.now()}.xlsx`);
        fs.writeFileSync(tempFilePath, req.file.buffer);

        console.log(`Saved temp file to ${tempFilePath} for processing`);

        // Try specialized Amravati importer first if the filename contains relevant keywords
        const fileName = req.file.originalname.toLowerCase();
        const isAmravatiFile =
          fileName.includes("amravati") ||
          fileName.includes("village") ||
          fileName.includes("lpcd") ||
          (req.body &&
            req.body.region &&
            req.body.region.toLowerCase() === "amravati");

        let importResult;
        let usedSpecialImporter = false;

        try {
          if (isAmravatiFile) {
            console.log("Using special Amravati importer");
            // Use dynamic import to load the special importer
            const specialImporter = await import(
              "../special-amravati-import.js"
            );
            const amravatiResult =
              await specialImporter.importAmravatiData(tempFilePath);

            importResult = {
              inserted: amravatiResult.inserted || 0,
              updated: amravatiResult.updated || 0,
              errors: amravatiResult.errors || [],
            };
            usedSpecialImporter = true;
          }
        } catch (importError) {
          console.error("Error using special importer:", importError);
          // Fall back to standard importer
        }

        // If special importer wasn't used or failed, use standard importer
        if (!usedSpecialImporter) {
          console.log("Using standard water scheme data importer");
          importResult = await storage.importWaterSchemeDataFromExcel(
            req.file.buffer,
          );
        }

        // Clean up temp file
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Temp file ${tempFilePath} deleted`);
          }
        } catch (e) {
          console.warn("Error cleaning up temp file:", e);
        }

        // Access the 'removed' count if available
        const removedCount = importResult.removed || 0;

        res.json({
          message: `Excel data imported successfully. ${importResult.inserted} new records created, ${importResult.updated} records updated, ${removedCount} records removed.`,
          inserted: importResult.inserted,
          updated: importResult.updated,
          removed: removedCount,
          errors: importResult.errors,
        });
      } catch (error) {
        console.error("Error importing Excel water scheme data:", error);
        res
          .status(500)
          .json({ message: "Failed to import Excel water scheme data" });
      }
    },
  );

  // Import water scheme data from CSV file (admin only)
  app.post(
    "/api/water-scheme-data/import/csv",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const fileBuffer = req.file.buffer;
        const importResult =
          await storage.importWaterSchemeDataFromCSV(fileBuffer);

        // Access the 'removed' count if available
        const removedCount = importResult.removed || 0;

        res.json({
          message: `CSV data imported successfully. ${importResult.inserted} new records created, ${importResult.updated} records updated, ${removedCount} records removed.`,
          inserted: importResult.inserted,
          updated: importResult.updated,
          removed: removedCount,
          errors: importResult.errors,
        });
      } catch (error) {
        console.error("Error importing CSV water scheme data:", error);
        res
          .status(500)
          .json({ message: "Failed to import CSV water scheme data" });
      }
    },
  );

  // Import scheme lpcd data from CSV file (admin only)
  app.post(
    "/api/scheme-lpcd/import/csv",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const fileBuffer = req.file.buffer;
        const importResult =
          await importSchemeLpcdFromCSV(fileBuffer);

        // Access the 'removed' count if available
        const removedCount = importResult.removed || 0;

        res.json({
          message: `CSV data imported successfully. ${importResult.inserted} new records created, ${importResult.updated} records updated, ${removedCount} records removed.`,
          inserted: importResult.inserted,
          updated: importResult.updated,
          removed: removedCount,
          errors: importResult.errors,
        });
      } catch (error) {
        console.error("Error importing CSV scheme lpcd data:", error);
        res
          .status(500)
          .json({ message: "Failed to import CSV scheme lpcd data" });
      }
    },
  );

  // Update region summaries based on current scheme data
  app.post(
    "/api/admin/update-region-summaries",
    requireAdmin,
    async (req, res) => {
      try {
        await updateRegionSummaries();

        // Force refresh of today's updates to detect changes in app_state
        // This ensures that changes are detected immediately after summary updates
        await storage.getTodayUpdates();

        res
          .status(200)
          .json({ message: "Region summaries updated successfully" });
      } catch (error) {
        console.error("Error updating region summaries:", error);
        res.status(500).json({ message: "Failed to update region summaries" });
      }
    },
  );

  // Reset region data to original values (only for admin use)
  app.post("/api/admin/reset-region-data", requireAdmin, async (req, res) => {
    try {
      await resetRegionData();

      // Force refresh of today's updates to detect changes in app_state
      // This ensures that changes are detected immediately after reset
      await storage.getTodayUpdates();

      res.status(200).json({ message: "Region data reset successfully" });
    } catch (error) {
      console.error("Error resetting region data:", error);
      res.status(500).json({ message: "Failed to reset region data" });
    }
  });

  // Reset individual region data (only for admin use)
  app.post("/api/admin/reset-region/:name", requireAdmin, async (req, res) => {
    try {
      const regionName = req.params.name;
      const db = await getDB();

      // Reset data for the specific region based on the region name
      if (regionName === "Nagpur") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 116,
            fully_completed_esr: 58,
            partial_esr: 58,
            total_villages_integrated: 91,
            fully_completed_villages: 38,
            total_schemes_integrated: 15,
            fully_completed_schemes: 9,
          })
          .where(eq(regions.region_name, "Nagpur"));
      } else if (regionName === "Chhatrapati Sambhajinagar") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 147,
            fully_completed_esr: 73,
            partial_esr: 69,
            total_villages_integrated: 140,
            fully_completed_villages: 71,
            total_schemes_integrated: 10,
            fully_completed_schemes: 2,
          })
          .where(eq(regions.region_name, "Chhatrapati Sambhajinagar"));
      } else if (regionName === "Pune") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 97,
            fully_completed_esr: 31,
            partial_esr: 66,
            total_villages_integrated: 53,
            fully_completed_villages: 16,
            total_schemes_integrated: 9,
            fully_completed_schemes: 0,
          })
          .where(eq(regions.region_name, "Pune"));
      } else if (regionName === "Konkan") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 11,
            fully_completed_esr: 1,
            partial_esr: 10,
            total_villages_integrated: 11,
            fully_completed_villages: 0,
            total_schemes_integrated: 4,
            fully_completed_schemes: 0,
          })
          .where(eq(regions.region_name, "Konkan"));
      } else if (regionName === "Amravati") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 149,
            fully_completed_esr: 59,
            partial_esr: 86,
            total_villages_integrated: 121,
            fully_completed_villages: 24,
            total_schemes_integrated: 11,
            fully_completed_schemes: 1,
          })
          .where(eq(regions.region_name, "Amravati"));
      } else if (regionName === "Nashik") {
        await db
          .update(regions)
          .set({
            total_esr_integrated: 106,
            fully_completed_esr: 23,
            partial_esr: 46,
            total_villages_integrated: 76,
            fully_completed_villages: 4,
            total_schemes_integrated: 11,
            fully_completed_schemes: 1,
          })
          .where(eq(regions.region_name, "Nashik"));
      } else {
        return res.status(400).json({ message: "Invalid region name" });
      }

      // Force refresh of today's updates to detect changes in app_state
      // This ensures that changes are detected immediately after individual region reset
      await storage.getTodayUpdates();

      res
        .status(200)
        .json({ message: `${regionName} region data reset successfully` });
    } catch (error) {
      console.error("Error resetting region data:", error);
      res.status(500).json({ message: "Failed to reset region data" });
    }
  });

  // Get component integration data for reports
  app.get("/api/reports/component-integration", async (req, res) => {
    try {
      const allSchemes = await storage.getAllSchemes();

      // Calculate component integration totals by region
      const regionComponentData = [];
      const regions = await storage.getAllRegions();

      for (const region of regions) {
        const regionSchemes = allSchemes.filter(
          (scheme) => scheme.region === region.region_name,
        );

        // Sum up component integration values
        const regionData = {
          region_name: region.region_name,
          flow_meter_integrated: regionSchemes.reduce(
            (sum, scheme) => sum + (scheme.flow_meters_connected || 0),
            0,
          ),
          rca_integrated: regionSchemes.reduce(
            (sum, scheme) =>
              sum + (scheme.residual_chlorine_analyzer_connected || 0),
            0,
          ),
          pressure_transmitter_integrated: regionSchemes.reduce(
            (sum, scheme) => sum + (scheme.pressure_transmitter_connected || 0),
            0,
          ),
        };

        regionComponentData.push(regionData);
      }

      res.json(regionComponentData);
    } catch (error) {
      console.error("Error fetching component integration data:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch component integration data" });
    }
  });

  // Import CSV with column mapping (for admin use only)
  app.post(
    "/api/admin/import-csv",
    requireAdmin,
    upload.single("file"),
    importCsvHandler,
  );

  // Import scheme data from SQL file
  app.post("/api/admin/import/sql", requireAdmin, async (req, res) => {
    try {
      log("Starting SQL import process...", "import");

      // Run the import-sql-data.js script
      const scriptPath = path.join(__dirname, "..", "import-sql-data.js");

      // Execute the script as a child process
      log(`Executing script: ${scriptPath}`, "import");
      const { stdout, stderr } = await exec(`node ${scriptPath}`);

      // Log the output
      if (stdout) {
        log(`Import SQL output: ${stdout}`, "import");
      }

      if (stderr) {
        log(`Import SQL error: ${stderr}`, "import");
        return res.status(500).json({
          message: "Error importing SQL data",
          error: stderr,
        });
      }

      // Try to parse the result from stdout to get scheme count and detailed info
      let schemeCount = 0;
      let errorMessages = [];

      try {
        // Extract scheme count using a regex pattern
        const schemeCountMatch = stdout.match(
          /Found (\d+) unique scheme IDs to process/,
        );
        if (schemeCountMatch && schemeCountMatch[1]) {
          schemeCount = parseInt(schemeCountMatch[1], 10);
        }

        // Extract error messages
        const errorPattern = /Error with statement: (.+?)(?=\n|$)/g;
        let match;
        while ((match = errorPattern.exec(stdout)) !== null) {
          errorMessages.push(match[1]);
        }
      } catch (parseError) {
        console.error("Error parsing import output:", parseError);
      }

      // Force refresh of today's updates to detect changes in app_state
      // This ensures that changes are detected immediately after SQL import
      await storage.getTodayUpdates();

      // Send a success response with detailed information
      res.json({
        message: "SQL data imported successfully",
        details: stdout,
        schemeCount: schemeCount,
        errors: errorMessages,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Error running SQL import:", err);
      res.status(500).json({
        message: "Failed to import SQL data",
        error: err.message,
      });
    }
  });

  // Import region data from Excel
  app.post(
    "/api/admin/import/regions",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log("[Excel Region Import] req.body:", req.body);
        const dataMonth = req.body.dataMonth || req.body.data_month || null;
        console.log("[Excel Region Import] Resolved dataMonth:", dataMonth);

        const fileBuffer = req.file.buffer;
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        // Assume the first sheet is the one we want
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with header: true to use first row as keys
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<
          string,
          any
        >[];

        log(`Processing ${jsonData.length} rows of region data...`, "import");

        let updatedCount = 0;
        const db = await getDB();

        // Reference data for flow meters to ensure they're not reset to 0
        const flowMeterData = [
          {
            name: "Nagpur",
            flow_meter_integrated: 113,
            rca_integrated: 113,
            pressure_transmitter_integrated: 63,
          },
          {
            name: "Chhatrapati Sambhajinagar",
            flow_meter_integrated: 132,
            rca_integrated: 138,
            pressure_transmitter_integrated: 93,
          },
          {
            name: "Pune",
            flow_meter_integrated: 95,
            rca_integrated: 65,
            pressure_transmitter_integrated: 49,
          },
          {
            name: "Konkan",
            flow_meter_integrated: 11,
            rca_integrated: 10,
            pressure_transmitter_integrated: 3,
          },
          {
            name: "Amravati",
            flow_meter_integrated: 143,
            rca_integrated: 95,
            pressure_transmitter_integrated: 111,
          },
          {
            name: "Nashik",
            flow_meter_integrated: 81,
            rca_integrated: 82,
            pressure_transmitter_integrated: 38,
          },
        ];

        for (const row of jsonData) {
          try {
            // Filter regions to include only the specified ones
            const region = String(row["Region Name"] || "").trim();
            const validRegions = [
              "Amravati",
              "Nashik",
              "Nagpur",
              "Pune",
              "Konkan",
              "Chhatrapati Sambhajinagar",
            ];

            if (!validRegions.includes(region)) {
              log(
                `Skipping row - region ${region} is not in the list of valid regions`,
                "import",
              );
              continue;
            }

            // Get stored flow meter values for this region
            const storedValues = flowMeterData.find((r) => r.name === region);

            // Map Excel columns to database fields
            const regionData = {
              region_name: region,
              total_esr_integrated: Number(row["Total ESR Integrated"] || 0),
              fully_completed_esr: Number(row["Fully Completed ESR"] || 0),
              partial_esr: Number(row["Partial ESR"] || 0),
              total_villages_integrated: Number(
                row["Total Villages Integrated"] || 0,
              ),
              fully_completed_villages: Number(
                row["Fully Completed Villages"] || 0,
              ),
              total_schemes_integrated: Number(
                row["Total Schemes Integrated"] || 0,
              ),
              fully_completed_schemes: Number(
                row["Fully Completed Schemes"] || 0,
              ),
              // Get flow meter values from Excel or use stored values as fallback
              // Check for 'Flow meter Integrated' (with lowercase 'm') as specified by the user
              flow_meter_integrated: isNaN(
                Number(
                  row["Flow meter Integrated"] || row["Flow Meter Integrated"],
                ),
              )
                ? storedValues
                  ? storedValues.flow_meter_integrated
                  : 0
                : Number(
                  row["Flow meter Integrated"] ||
                  row["Flow Meter Integrated"],
                ),
              // Check for RCA values
              rca_integrated: isNaN(Number(row["RCA Integrated"]))
                ? storedValues
                  ? storedValues.rca_integrated
                  : 0
                : Number(row["RCA Integrated"]),
              // Check for pressure transmitter values
              pressure_transmitter_integrated: isNaN(
                Number(row["Pressure Transmitter Integrated"]),
              )
                ? storedValues
                  ? storedValues.pressure_transmitter_integrated
                  : 0
                : Number(row["Pressure Transmitter Integrated"]),
            };

            if (!regionData.region_name) {
              log(`Skipping row - missing region name`, "import");
              continue;
            }

            // Check if region exists
            const existingRegion = await storage.getRegionByName(
              regionData.region_name,
            );

            if (existingRegion) {
              // Get existing meter values, defaulting to 0 if null
              const existingFlowMeter =
                existingRegion.flow_meter_integrated ?? 0;
              const existingRca = existingRegion.rca_integrated ?? 0;
              const existingPt =
                existingRegion.pressure_transmitter_integrated ?? 0;

              // Detect if there are new additions to track in today's updates
              const existingEsrCount = existingRegion.total_esr_integrated ?? 0;
              const existingVillageCount =
                existingRegion.total_villages_integrated ?? 0;
              const newEsrCount =
                regionData.total_esr_integrated - existingEsrCount;
              const newVillageCount =
                regionData.total_villages_integrated - existingVillageCount;

              // Collect all updates in an array
              const newUpdates = [];

              // Add to today's updates if there are new additions
              if (newEsrCount > 0) {
                console.log(
                  `Adding ${newEsrCount} new ESRs to today's updates for ${regionData.region_name}`,
                );
                newUpdates.push({
                  type: "esr",
                  count: newEsrCount,
                  status: "new",
                  region: regionData.region_name,
                  timestamp: new Date().toISOString(),
                });
              }

              if (newVillageCount > 0) {
                console.log(
                  `Adding ${newVillageCount} new villages to today's updates for ${regionData.region_name}`,
                );
                newUpdates.push({
                  type: "village",
                  count: newVillageCount,
                  status: "new",
                  region: regionData.region_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Track flow meter updates if there are any changes
              const newFlowMeters =
                regionData.flow_meter_integrated - existingFlowMeter;
              const newRcas = regionData.rca_integrated - existingRca;
              const newPts =
                regionData.pressure_transmitter_integrated - existingPt;

              // Add to today's updates if there are new flow meter additions
              if (newFlowMeters > 0) {
                console.log(
                  `Adding ${newFlowMeters} new flow meters to today's updates for ${regionData.region_name}`,
                );
                newUpdates.push({
                  type: "flow_meter",
                  count: newFlowMeters,
                  status: "new",
                  region: regionData.region_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Add to today's updates if there are new RCA additions
              if (newRcas > 0) {
                console.log(
                  `Adding ${newRcas} new RCAs to today's updates for ${regionData.region_name}`,
                );
                newUpdates.push({
                  type: "rca",
                  count: newRcas,
                  status: "new",
                  region: regionData.region_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Add to today's updates if there are new pressure transmitter additions
              if (newPts > 0) {
                console.log(
                  `Adding ${newPts} new pressure transmitters to today's updates for ${regionData.region_name}`,
                );
                newUpdates.push({
                  type: "pressure_transmitter",
                  count: newPts,
                  status: "new",
                  region: regionData.region_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Add all updates to the global updates array in one go
              if (newUpdates.length > 0) {
                // Initialize global.todayUpdates if it doesn't exist
                if (!(global as any).todayUpdates) {
                  (global as any).todayUpdates = [];
                }

                // Add all new updates at the beginning of the existing updates
                (global as any).todayUpdates = [
                  ...newUpdates,
                  ...(global as any).todayUpdates,
                ];

                console.log(
                  `Added ${newUpdates.length} updates to today's updates for ${regionData.region_name}`,
                );
              }

              // Update existing region, using the new flow meter values from Excel
              const updatedRegion = {
                ...existingRegion,
                total_esr_integrated: regionData.total_esr_integrated,
                fully_completed_esr: regionData.fully_completed_esr,
                partial_esr: regionData.partial_esr,
                total_villages_integrated: regionData.total_villages_integrated,
                fully_completed_villages: regionData.fully_completed_villages,
                total_schemes_integrated: regionData.total_schemes_integrated,
                fully_completed_schemes: regionData.fully_completed_schemes,
                // Use the new flow meter values from Excel
                flow_meter_integrated: regionData.flow_meter_integrated,
                rca_integrated: regionData.rca_integrated,
                pressure_transmitter_integrated:
                  regionData.pressure_transmitter_integrated,
              };

              await storage.updateRegion(updatedRegion, dataMonth);
              updatedCount++;
              log(`Updated region: ${regionData.region_name}`, "import");
            } else {
              // Create new region
              const newRegion = {
                region_name: regionData.region_name,
                total_esr_integrated: regionData.total_esr_integrated,
                fully_completed_esr: regionData.fully_completed_esr,
                partial_esr: regionData.partial_esr,
                total_villages_integrated: regionData.total_villages_integrated,
                fully_completed_villages: regionData.fully_completed_villages,
                total_schemes_integrated: regionData.total_schemes_integrated,
                fully_completed_schemes: regionData.fully_completed_schemes,
                flow_meter_integrated: regionData.flow_meter_integrated,
                rca_integrated: regionData.rca_integrated,
                pressure_transmitter_integrated:
                  regionData.pressure_transmitter_integrated,
              };

              await storage.createRegion(newRegion, dataMonth);
              updatedCount++;
              log(`Created new region: ${regionData.region_name}`, "import");
            }
          } catch (rowError) {
            console.error(`Error processing row:`, row, rowError);
            // Continue with next row
          }
        }

        // Update region summaries after import
        await updateRegionSummaries();

        // Force refresh of today's updates to detect changes in app_state
        // This ensures that changes are detected immediately after import
        await storage.getTodayUpdates();

        res.json({
          message: `Region data imported successfully. ${updatedCount} regions updated.`,
          updatedCount,
        });
      } catch (error) {
        console.error("Error importing region data:", error);
        res.status(500).json({ message: "Failed to import region data" });
      }
    },
  );

  // Import scheme data from Excel
  app.post(
    "/api/admin/import/schemes",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const fileBuffer = req.file.buffer;
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        // Assume the first sheet is the one we want
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with header: true to use first row as keys
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<
          string,
          any
        >[];

        log(`Processing ${jsonData.length} rows of scheme data...`, "import");

        let updatedCount = 0;
        const db = await getDB();

        for (const row of jsonData) {
          try {
            // Skip rows that don't have the required regions
            const region = String(row["Region Name"] || "").trim();
            const validRegions = [
              "Amravati",
              "Nashik",
              "Nagpur",
              "Pune",
              "Konkan",
              "Chhatrapati Sambhajinagar",
            ];

            if (!validRegions.includes(region)) {
              log(
                `Skipping row - region ${region} is not in the list of valid regions`,
                "import",
              );
              continue;
            }

            // Map Excel columns to database fields
            const schemeData = {
              scheme_id: String(row["Scheme ID"] || "0"),
              scheme_name: String(row["Scheme Name"] || ""),
              region: region,
              number_of_village: Number(row["Number of Village"] || 0),
              total_number_of_esr: Number(row["Total Number of ESR"] || 0),
              total_villages_integrated: Number(
                row["Total Villages Integrated"] || 0,
              ),
              fully_completed_villages: Number(
                row["Fully Completed Villages"] || 0,
              ),
              // This one wasn't in the rename list, but if needed:
              esr_request_received: Number(row["ESR Request Received"] || 0),
              total_esr_integrated: Number(row["Total ESR Integrated"] || 0),
              no_fully_completed_esr: Number(
                row["No. Fully Completed ESR"] || 0,
              ),
              balance_to_complete_esr: Number(
                row["Balance For Fully Completion"] || 0,
              ),
              flow_meters_connected: Number(row["Flow Meters Connected"] || 0),
              residual_chlorine_analyzer_connected: Number(
                row["Residual Chlorine Analyzer Connected"] || 0,
              ), // RCA = Residual Chlorine Analyzer
              pressure_transmitter_connected: Number(
                row["Pressure Transmitter Connected"] || 0,
              ),
              fully_completion_scheme_status: String(
                row["Fully Completion Scheme Status"] || "Not-Connected",
              ).trim(),
            };

            // Ensure required fields are present
            if (!schemeData.scheme_name) {
              log(`Skipping row - missing scheme name`, "import");
              continue;
            }

            // Handle potential string ID conversion issues
            if (!schemeData.scheme_id || schemeData.scheme_id === "0") {
              log(
                `Warning: Invalid scheme_id for ${schemeData.scheme_name}, generating a new ID...`,
                "import",
              );
              // For missing or invalid IDs, we'll need to query an existing one or generate a new one
              const allSchemes = await storage.getAllSchemes();
              // Find the maximum numeric ID and add 1, then convert back to string
              const maxId = allSchemes.reduce((max, scheme) => {
                const id = parseInt(scheme.scheme_id || "0");
                return isNaN(id) ? max : Math.max(max, id);
              }, 0);
              schemeData.scheme_id = String(maxId + 1);
            }

            // Check if scheme exists
            const existingScheme = await storage.getSchemeById(
              schemeData.scheme_id,
            );

            if (existingScheme) {
              // Check if there are any changes in the key metrics to log in today's updates
              const existingFmCount = existingScheme.flow_meters_connected ?? 0;
              const existingRcaCount =
                existingScheme.residual_chlorine_analyzer_connected ?? 0;
              const existingPtCount =
                existingScheme.pressure_transmitter_connected ?? 0;

              const newFmCount =
                Number(schemeData.flow_meters_connected) -
                Number(existingFmCount);
              const newRcaCount =
                Number(schemeData.residual_chlorine_analyzer_connected) -
                Number(existingRcaCount);
              const newPtCount =
                Number(schemeData.pressure_transmitter_connected) -
                Number(existingPtCount);

              // Collect all updates in an array
              const schemeUpdates = [];

              // Track new flow meter additions
              if (newFmCount > 0) {
                console.log(
                  `Adding ${newFmCount} new Flow Meters to today's updates for ${schemeData.scheme_name}`,
                );
                schemeUpdates.push({
                  type: "flow_meter",
                  count: newFmCount,
                  status: "new",
                  region: schemeData.region,
                  scheme: schemeData.scheme_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Track new RCA additions
              if (newRcaCount > 0) {
                console.log(
                  `Adding ${newRcaCount} new RCAs to today's updates for ${schemeData.scheme_name}`,
                );
                schemeUpdates.push({
                  type: "rca",
                  count: newRcaCount,
                  status: "new",
                  region: schemeData.region,
                  scheme: schemeData.scheme_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Track new Pressure Transmitter additions
              if (newPtCount > 0) {
                console.log(
                  `Adding ${newPtCount} new Pressure Transmitters to today's updates for ${schemeData.scheme_name}`,
                );
                schemeUpdates.push({
                  type: "pressure_transmitter",
                  count: newPtCount,
                  status: "new",
                  region: schemeData.region,
                  scheme: schemeData.scheme_name,
                  timestamp: new Date().toISOString(),
                });
              }

              // Add all updates to global storage
              if (schemeUpdates.length > 0) {
                // Initialize global todayUpdates if needed
                if (!(global as any).todayUpdates) {
                  (global as any).todayUpdates = [];
                }

                // Add new updates at the beginning
                (global as any).todayUpdates = [
                  ...schemeUpdates,
                  ...(global as any).todayUpdates,
                ];
                console.log(
                  `Added ${schemeUpdates.length} updates for scheme ${schemeData.scheme_name}`,
                );
              }

              // Update existing scheme
              const updatedScheme = {
                ...existingScheme,
                ...schemeData,
              };

              await storage.updateScheme(updatedScheme);
              updatedCount++;
              log(
                `Updated scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`,
                "import",
              );
            } else {
              // Create new scheme and log it as a new addition
              await storage.createScheme(schemeData);

              // Add the new scheme to today's updates
              if (!(global as any).todayUpdates) {
                (global as any).todayUpdates = [];
              }

              // Add new scheme update at the beginning
              (global as any).todayUpdates.unshift({
                type: "scheme",
                count: 1,
                status: "new",
                region: schemeData.region,
                scheme: schemeData.scheme_name,
                timestamp: new Date().toISOString(),
              });

              updatedCount++;
              log(
                `Created new scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`,
                "import",
              );
            }
          } catch (rowError) {
            console.error(`Error processing scheme row:`, row, rowError);
            // Continue with next row
          }
        }

        // Update region summaries after import
        await updateRegionSummaries();

        // Force refresh of today's updates to detect changes in app_state
        // This ensures that changes are detected immediately after import
        await storage.getTodayUpdates();

        res.json({
          message: `Scheme data imported successfully. ${updatedCount} schemes updated.`,
          updatedCount,
        });
      } catch (error) {
        console.error("Error importing scheme data:", error);
        res.status(500).json({ message: "Failed to import scheme data" });
      }
    },
  );

  // No AI Image Generation endpoint needed for this project

  // New Excel Import for updated data format
  app.post(
    "/api/admin/import-excel",
    requireAdmin,
    upload.single("excelFile"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        log(
          `File upload received: ${req.file.originalname}, size: ${req.file.size} bytes`,
          "import",
        );
        const fileBuffer = req.file.buffer;

        // Mark all existing schemes as inactive before import
        // This allows us to track which schemes are in the current import
        try {
          const db = await getDB();
          log("Marking all existing schemes as inactive...", "import");
          await db.execute(`UPDATE scheme_status SET active = false`);
          log("All existing schemes marked as inactive", "import");
        } catch (error) {
          console.error("Error marking schemes as inactive:", error);
          // Continue with import even if this fails
        }

        // Try reading with options for better compatibility
        let workbook;
        try {
          // First try to get the column data directly from the raw Excel
          // This helps bypass some of the library's higher-level parsing
          const raw = new Uint8Array(fileBuffer);

          // Read with all options for maximum compatibility
          workbook = XLSX.read(raw, {
            type: "array", // Use array mode for better binary handling
            cellFormula: false, // Don't parse formulas
            cellHTML: false, // Don't parse HTML
            cellText: true, // Force text mode for cells
            cellDates: true, // Parse dates
            cellNF: false, // Don't parse number formats
            WTF: true, // Show detailed warnings
            cellStyles: false, // Don't parse styles
            bookVBA: false, // Don't parse VBA code
            dateNF: "yyyy-mm-dd", // Date format
            raw: true, // Raw parsing
          });

          // Examine workbook to see important info about the file
          log(`Workbook file info:`, "import");
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];

            // Try to access column G explicitly (user mentioned Scheme ID is in column G)
            // This uses A1 notation for columns where G is column 7
            const gCells = [];
            if (sheet["!ref"]) {
              const range = XLSX.utils.decode_range(sheet["!ref"]);
              // Check the first 10 rows for column G
              for (let r = 0; r <= Math.min(10, range.e.r); r++) {
                const cellRef = "G" + (r + 1); // G1, G2, G3, etc.
                if (sheet[cellRef]) {
                  gCells.push(`G${r + 1}: ${sheet[cellRef].v}`);
                } else {
                  gCells.push(`G${r + 1}: <empty>`);
                }
              }
            }

            log(
              `Sheet: ${sheetName}, Column G (first 10 rows): ${gCells.join(" | ")}`,
              "import",
            );
          }

          log(
            `Excel file successfully loaded. Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`,
            "import",
          );
        } catch (error) {
          const xlsxError = error as Error;
          console.error("Error reading Excel file:", xlsxError);
          return res.status(400).json({
            message: `Unable to read Excel file: ${xlsxError.message}`,
          });
        }

        // Define column patterns to search for in headers - using the exact mapping provided by the user
        const COLUMN_PATTERNS = {
          // Database field names mapped to all possible Excel column headers
          sr_no: ["Sr No.", "Sr_No"],
          scheme_id: ["Scheme ID", "Scheme_ID"],
          scheme_name: ["Scheme Name", "Scheme_Name"],

          // Location hierarchy - exact match from the user's mapping
          region: ["Region", "region", "REGION"],
          circle: ["Circle", "circle", "CIRCLE", "Circle Name", "CircleName"],
          division: [
            "Division",
            "division",
            "DIVISION",
            "Division Name",
            "DivisionName",
          ],
          sub_division: [
            "Sub Division",
            "Sub_Division",
            "sub_division",
            "SUB DIVISION",
            "SubDivision",
            "Sub-Division",
            "Subdivision",
          ],
          block: ["Block", "block", "BLOCK", "Taluka", "taluka"],

          // Villages related fields - exact match from the user's mapping
          number_of_village: ["Number of Village", "number_of_village"],
          total_villages_integrated: [
            "Total Villages Integrated",
            "total_villages_integrated",
          ],
          no_of_functional_village: [
            "No. of Functional Village",
            "no_of_functional_village",
          ],
          no_of_partial_village: [
            "No. of Partial Village",
            "no_of_partial_village",
          ],
          no_of_non_functional_village: [
            "No. of Non- Functional Village",
            "no_of_non_functional_village",
          ],
          fully_completed_villages: [
            "Fully Completed Villages",
            "fully_completed_villages",
          ],

          // ESR related fields - exact match from the user's mapping
          total_number_of_esr: ["Total Number of ESR", "Total_Number_of_ESR"],
          scheme_functional_status: [
            "Scheme Functional Status",
            "scheme_functional_status",
          ],
          total_esr_integrated: [
            "Total ESR Integrated",
            "total_esr_integrated",
          ],
          no_fully_completed_esr: [
            "No. Fully Completed ESR",
            "no_fully_completed_esr",
          ],
          balance_to_complete_esr: [
            "Balance to Complete ESR",
            "balance_to_complete_esr",
          ],

          // Component related fields - exact match from the user's mapping
          flow_meters_connected: [
            "Flow Meters Connected",
            "flow_meters_connected",
          ],
          pressure_transmitter_connected: [
            "Pressure Transmitter Connected",
            "pressure_transmitter_connected",
          ],
          residual_chlorine_analyzer_connected: [
            "Residual Chlorine Analyzer Connected",
            "residual_chlorine_analyzer_connected",
          ],

          // Status fields - exact match from the user's mapping
          fully_completion_scheme_status: [
            "Fully completion Scheme Status",
            "fully_completion_scheme_status",
          ],
          mjp_commissioned: ["MJP Commissioned", "mjp_commissioned"],
          mjp_fully_completed: ["MJP Fully Completed", "mjp_fully_completed"],
          water_supply: ["Water Supply", "water_supply"],
          agency_type: ["Agency Type", "agency_type", "Agencies"],
        };

        // Region name patterns for detection
        const REGION_PATTERNS = [
          { pattern: /\bamravati\b/i, name: "Amravati" },
          { pattern: /\bnashik\b/i, name: "Nashik" },
          { pattern: /\bnagpur\b/i, name: "Nagpur" },
          { pattern: /\bpune\b/i, name: "Pune" },
          { pattern: /\bkonkan\b/i, name: "Konkan" },
          { pattern: /\bcs\b/i, name: "Chhatrapati Sambhajinagar" },
          { pattern: /\bsambhajinagar\b/i, name: "Chhatrapati Sambhajinagar" },
          { pattern: /\bchhatrapati\b/i, name: "Chhatrapati Sambhajinagar" },
        ];

        // Helper functions - extracted to avoid TypeScript strict mode errors
        // Detect region from sheet name
        const detectRegionFromSheetName = (
          sheetName: string,
        ): string | null => {
          for (const { pattern, name } of REGION_PATTERNS) {
            if (pattern.test(sheetName)) {
              return name;
            }
          }
          return null;
        };

        // Get the corresponding field name for a column header
        const getFieldForColumn = (header: string): string | null => {
          // Special handling for location fields that are often problematic
          if (header) {
            const headerLower = header.toLowerCase();

            // Check for Circle field
            if (headerLower === "circle" || headerLower.includes("circle")) {
              log(
                `Special match found for header "${header}" → field "circle"`,
                "import",
              );
              return "circle";
            }

            // Check for Division field
            if (
              headerLower === "division" ||
              headerLower.includes("division")
            ) {
              log(
                `Special match found for header "${header}" → field "division"`,
                "import",
              );
              return "division";
            }

            // Check for Sub Division field
            if (
              headerLower === "sub division" ||
              (headerLower.includes("sub") &&
                headerLower.includes("division")) ||
              headerLower === "subdivision" ||
              headerLower === "sub-division"
            ) {
              log(
                `Special match found for header "${header}" → field "sub_division"`,
                "import",
              );
              return "sub_division";
            }

            // Check for Block field
            if (headerLower === "block" || headerLower.includes("block")) {
              log(
                `Special match found for header "${header}" → field "block"`,
                "import",
              );
              return "block";
            }
          }

          // First try for exact matches (case-insensitive)
          for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
            for (const pattern of patterns) {
              if (
                header === pattern ||
                header.toLowerCase() === pattern.toLowerCase()
              ) {
                log(
                  `Exact match found for header "${header}" → field "${field}"`,
                  "import",
                );
                return field;
              }
            }
          }

          // If no exact match, try for pattern-based matches
          // Handle inconsistent spaces, underscores and dashes by normalizing the strings
          const normalizeHeader = (h: string) =>
            h.toLowerCase().replace(/[_\s-]+/g, "");
          const headerNorm = normalizeHeader(header);

          for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
            for (const pattern of patterns) {
              const patternNorm = normalizeHeader(pattern);
              // Check if normalized strings match exactly
              if (headerNorm === patternNorm) {
                log(
                  `Normalized match found for header "${header}" → field "${field}"`,
                  "import",
                );
                return field;
              }
              // Check if the normalized header includes the normalized pattern
              if (headerNorm.includes(patternNorm)) {
                log(
                  `Partial match found for header "${header}" → field "${field}"`,
                  "import",
                );
                return field;
              }
            }
          }

          return null;
        };

        // Create a mapping of column headers to database fields
        const createColumnMapping = (
          headers: Record<string, any>,
        ): Record<string, string> => {
          const mapping: Record<string, string> = {};

          // Create a direct lookup table for Excel column header to database field
          // Exact mapping provided by the user
          const directMapping: Record<string, string> = {
            // Database field names <- Excel column names
            sr_no: "Sr No.",
            region_name: "Region",
            circle: "Circle", // Exact match as needed
            division: "Division", // Exact match as needed
            sub_division: "Sub Division", // Space instead of underscore
            block: "Block", // Exact match as needed
            scheme_id: "Scheme ID",
            scheme_name: "Scheme Name",
            number_of_village: "Number of Village",
            villages_integrated: "Total Villages Integrated",
            functional_villages: "No. of Functional Village",
            partial_villages: "No. of Partial Village",
            non_functional_villages: "No. of Non- Functional Village",
            fully_completed_villages: "Fully Completed Villages",
            total_number_of_esr: "Total Number of ESR",
            scheme_functional_status: "Scheme Functional Status",
            total_esr_integrated: "Total ESR Integrated",
            fully_completed_esr: "No. Fully Completed ESR",
            balance_esr: "Balance to Complete ESR",
            flow_meters_connected: "Flow Meters Connected",
            pressure_transmitter_connected: "Pressure Transmitter Connected",
            residual_chlorine_analyzer_connected:
              "Residual Chlorine Analyzer Connected",
            fully_completion_scheme_status: "Fully completion Scheme Status",
            mjp_commissioned: "MJP Commissioned",
            mjp_fully_completed: "MJP Fully Completed",
            water_supply: "Water Supply",
            agency_type: "Agency Type",
          };

          // Add variant spellings to ensure we catch all possible column headers
          const variantMappings = {
            circle: ["Circle", "CIRCLE", "circle"],
            division: ["Division", "DIVISION", "division"],
            sub_division: [
              "Sub Division",
              "SUB DIVISION",
              "SubDivision",
              "Sub-Division",
              "Subdivision",
            ],
            block: ["Block", "BLOCK", "block"],
          };

          // Reverse the mapping to be from Excel column names to database field names
          const columnToFieldMapping: Record<string, string> = {};
          for (const [field, header] of Object.entries(directMapping)) {
            columnToFieldMapping[header] = field;

            // Also map the version with underscores
            const underscoreVersion = header.replace(/\s+/g, "_");
            if (underscoreVersion !== header) {
              columnToFieldMapping[underscoreVersion] = field;
            }
          }

          // Map for position-based fallback (if header names don't match exactly)
          const commonIndexMapping: Record<number, string> = {
            0: "sr_no", // Serial No.
            1: "region", // Region
            2: "circle", // Circle
            3: "division", // Division
            4: "sub_division", // Sub Division
            5: "block", // Block
            6: "scheme_id", // Scheme ID
            7: "scheme_name", // Scheme Name
            8: "number_of_village", // Total Villages
            9: "total_villages_integrated", // Villages Integrated
            10: "no_of_functional_village", // Functional Villages
            11: "no_of_partial_village", // Partial Villages
            12: "no_of_non_functional_village", // Non-Functional Villages
            13: "fully_completed_villages", // Fully Completed Villages
            14: "total_number_of_esr", // Total Number of ESR
            15: "scheme_functional_status", // Scheme Functional Status
            16: "total_esr_integrated", // ESR Integrated
            17: "no_fully_completed_esr", // Fully Completed ESR
            18: "balance_to_complete_esr", // Balance ESR
            19: "flow_meters_connected", // Flow Meters Connected
            20: "pressure_transmitter_connected", // Pressure Transmitters Connected
            21: "residual_chlorine_analyzer_connected", // Residual Chlorine Analyzers
            22: "fully_completion_scheme_status", // Fully Completion Scheme Status
            23: "mjp_commissioned",
            24: "mjp_fully_completed",
            25: "water_supply",
            26: "agency_type",
          };

          // First try direct mapping from Excel column headers to database fields
          for (const header of Object.keys(headers)) {
            if (columnToFieldMapping[header]) {
              mapping[header] = columnToFieldMapping[header];
              log(
                `Direct mapping found for header "${header}" → field "${columnToFieldMapping[header]}"`,
                "import",
              );
            } else {
              // Fallback to pattern matching
              const field = getFieldForColumn(header);
              if (field) {
                mapping[header] = field;
              }
            }
          }

          // Then try to map by column position for common columns
          const keys = Object.keys(headers);
          for (const [indexStr, fieldName] of Object.entries(
            commonIndexMapping,
          )) {
            const index = parseInt(indexStr);
            if (index < keys.length && !mapping[keys[index]]) {
              // Only set if not already mapped and column exists
              mapping[keys[index]] = fieldName;
            }
          }

          // For debugging
          log(`Column mapping created: ${JSON.stringify(mapping)}`, "import");

          return mapping;
        };

        // Process the value according to the field type
        const processValue = (field: string, value: any): any => {
          if (value === null || value === undefined) {
            return null;
          }

          // Enhanced handling for location fields - properly map Excel to DB fields
          // and ensure we preserve actual values (not placeholder text)
          if (
            field === "circle" ||
            field === "division" ||
            field === "sub_division" ||
            field === "block"
          ) {
            // Debug the location field value
            log(
              `Processing location field ${field} with value: "${value}"`,
              "import",
            );

            // Convert to string, handle "" and "N/A" specially
            const strValue = String(value || "").trim();

            // If empty or N/A, return null so the frontend can handle it appropriately
            // This helps distinguish between actual values and placeholder/empty values
            if (
              strValue === "" ||
              strValue.toLowerCase() === "n/a" ||
              strValue.toLowerCase() === "na" ||
              strValue === field || // Return null if value is same as field name (e.g. "Circle" for circle field)
              field.toLowerCase() === strValue.toLowerCase()
            ) {
              // Case insensitive comparison

              log(
                `Returning null for ${field} with empty/N/A value: "${strValue}"`,
                "import",
              );
              return null;
            }

            // Return the actual value if it seems to be a real location value
            log(`Keeping original value for ${field}: "${strValue}"`, "import");
            return strValue;
          }

          // Log raw values for debugging
          if (
            field === "fully_completed_villages" ||
            field === "total_villages_integrated" ||
            field === "fully_completion_scheme_status" ||
            field === "total_esr_integrated" ||
            field === "residual_chlorine_analyzer_connected" ||
            field === "pressure_transmitter_connected" ||
            field === "flow_meters_connected" ||
            field === "no_fully_completed_esr"
          ) {
            log(
              `Raw value for ${field}: ${value} (type: ${typeof value})`,
              "import",
            );
          }

          // Numeric fields - convert to numbers
          const numericFields = [
            "number_of_village",
            "fully_completed_villages",
            "total_villages_integrated",
            "no_of_partial_village",
            "no_of_non_functional_village",
            "no_of_functional_village",
            "total_number_of_esr",
            "total_esr_integrated",
            "no_fully_completed_esr",
            "balance_to_complete_esr",
            "flow_meters_connected",
            "pressure_transmitter_connected",
            "residual_chlorine_analyzer_connected",
            "sr_no",
          ];

          if (numericFields.includes(field)) {
            // Make sure we handle string numbers correctly
            let numValue = value;
            if (typeof value === "string") {
              // Remove any non-numeric characters except decimal point
              numValue = value.replace(/[^\d.-]/g, "");
            }
            const num = Number(numValue);
            const result = isNaN(num) ? 0 : num;

            // Log numeric conversions for debugging
            if (
              field === "fully_completed_villages" ||
              field === "total_villages_integrated" ||
              field === "total_esr_integrated" ||
              field === "residual_chlorine_analyzer_connected" ||
              field === "pressure_transmitter_connected" ||
              field === "flow_meters_connected" ||
              field === "no_fully_completed_esr"
            ) {
              log(`Converted ${field} value: ${value} → ${result}`, "import");
            }

            return result;
          }

          // Status field - standardize values
          if (field === "fully_completion_scheme_status") {
            log(
              `Processing fully_completion_scheme_status value: "${value}"`,
              "import",
            );
            const status = String(value).trim().toLowerCase();

            // Direct mapping to "Fully-Completed"
            if (
              status === "Completed" ||
              status === "completed" ||
              status === "complete" ||
              status === "fully completed" ||
              status === "fully-completed"
            ) {
              log(`Mapped status "${value}" to "Fully-Completed"`, "import");
              return "Fully-Completed";
            }
            // Direct mapping to "In Progress"
            else if (
              status === "In Progress" ||
              status === "in progress" ||
              status === "in-progress" ||
              status === "partial" ||
              status === "progress"
            ) {
              log(`Mapped status "${value}" to "In Progress"`, "import");
              return "In Progress";
            }
            // Direct mapping to "Not-Connected"
            else if (
              status === "not connected" ||
              status === "not-connected" ||
              status === "notconnected"
            ) {
              log(`Mapped status "${value}" to "Not-Connected"`, "import");
              return "Not-Connected";
            }

            // Try pattern matching for better accuracy
            if (status.includes("complet")) {
              log(
                `Pattern matched status "${value}" to "Fully-Completed"`,
                "import",
              );
              return "Fully-Completed";
            } else if (
              status.includes("progress") ||
              status.includes("partial")
            ) {
              log(
                `Pattern matched status "${value}" to "In Progress"`,
                "import",
              );
              return "In Progress";
            }

            // Return capitalized version if no match
            const words = status.split(" ");
            const capitalizedWords = words.map(
              (word) => word.charAt(0).toUpperCase() + word.slice(1),
            );
            const result = capitalizedWords.join(" ");
            log(
              `No match for status "${value}", returning as "${result}"`,
              "import",
            );
            return result;
          }

          // Map functional status values
          if (field === "scheme_functional_status") {
            const status = String(value).trim().toLowerCase();
            if (status === "Functional") {
              return "Functional";
            } else if (status === "Partial") {
              return "Partial";
            } else if (status === "non-functional") {
              return "Non-Functional";
            }
            return value;
          }

          // Text fields - ensure they're properly formatted
          if (field === "scheme_id") {
            return String(value).trim();
          }

          // We already have enhanced location field handling above

          return value;
        };

        // We've removed the agency mapping as it's no longer needed

        let totalUpdated = 0;
        let totalCreated = 0;
        const processedSchemes: string[] = [];

        // Process each sheet
        for (const sheetName of workbook.SheetNames) {
          // Detect region from sheet name
          let regionName = detectRegionFromSheetName(sheetName);

          // Special handling for "Scheme_Status" sheet - consider as a multi-region sheet
          if (
            !regionName &&
            (sheetName === "Scheme_Status" ||
              sheetName.toLowerCase().includes("scheme"))
          ) {
            log(
              `Sheet ${sheetName} doesn't match a region pattern, but will process it as a multi-region sheet`,
              "import",
            );
            // We'll extract region from each row instead of assuming a sheet-wide region
            regionName = "EXTRACT_FROM_ROW";
          } else if (!regionName) {
            log(
              `Skipping sheet: ${sheetName} - not a recognized region`,
              "import",
            );
            continue;
          }

          log(
            `Processing sheet: ${sheetName} for region: ${regionName}`,
            "import",
          );

          // Convert sheet to JSON
          const sheet = workbook.Sheets[sheetName];

          // Log raw sheet info to help debugging
          log(`Sheet ${sheetName} raw data:`, "import");
          // Get the range of the sheet
          const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
          log(`Sheet range: ${sheet["!ref"]}`, "import");

          // Get column G values (Scheme ID) and store them directly for later use
          // We'll use this to bypass the regular JSON conversion which might be causing issues
          const directColumnGValues = new Map<number, string>();

          // Loop through all rows and extract column G values directly
          for (
            let r = range.s.r;
            r <= Math.min(range.e.r, range.s.r + 100);
            r++
          ) {
            // Limit to first 100 rows for performance
            const cellAddress = XLSX.utils.encode_cell({ r: r, c: 6 }); // column G (index 6)
            const cell = sheet[cellAddress];
            if (cell && cell.v) {
              const value = String(cell.v).trim();
              directColumnGValues.set(r, value);
              // Log first 10 row values for debugging
              if (r < range.s.r + 10) {
                log(
                  `Row ${r + 1} (cell ${cellAddress}): Column G (Scheme ID) = "${value}"`,
                  "import",
                );
              }
            }
          }

          // Store scheme ID values directly in the sheet object for later use
          sheet["__directSchemeIDs"] = directColumnGValues;

          // First try to extract header row by examining the first few rows
          let headerRowIndex = -1;
          for (
            let r = range.s.r;
            r <= Math.min(range.s.r + 10, range.e.r);
            r++
          ) {
            // Check if this row contains the text "Scheme ID" which is likely our header
            const schemeIdCellAddress = XLSX.utils.encode_cell({ r: r, c: 6 }); // column G (where Scheme ID should be)
            const cell = sheet[schemeIdCellAddress];

            if (
              cell &&
              cell.v &&
              (String(cell.v).trim() === "Scheme ID" ||
                String(cell.v).trim() === "Scheme_ID")
            ) {
              headerRowIndex = r;
              log(
                `Found header row at Excel row ${r + 1} with text "${cell.v}" in column G`,
                "import",
              );
              break;
            }
          }

          // Convert to JSON based on identified headers
          let data;
          if (headerRowIndex >= 0) {
            // Use the header row we found
            data = XLSX.utils.sheet_to_json(sheet, {
              defval: null,
              raw: true,
              rawNumbers: true,
              range: headerRowIndex, // Start from the header row we found
              header: 1, // Use the first row in the range as headers
            });
            log(`Using Excel row ${headerRowIndex + 1} as headers`, "import");
          } else {
            // Fallback to position-based mapping if no header found
            data = XLSX.utils.sheet_to_json(sheet, {
              defval: null,
              raw: true,
              rawNumbers: true,
              header: "A", // Use A,B,C as header names to ensure we get position-based mapping
            });
            log(
              `No clear header row found, using position-based mapping`,
              "import",
            );
          }

          // Debug logging for first few rows
          if (data && data.length > 0) {
            log(`First row of data: ${JSON.stringify(data[0])}`, "import");
          }

          if (!data || data.length === 0) {
            log(`No data found in sheet: ${sheetName}`, "import");
            continue;
          }

          // Log the number of rows found
          log(`Found ${data.length} rows in sheet ${sheetName}`, "import");

          // Convert header-letter-based data to regular column-header-based
          // This ensures we get data with proper column positions
          const headerRow = data[0] as Record<string, any>;
          const columnPositions: Record<string, number> = {};

          // Log the header row
          log(`First row (headers): ${JSON.stringify(headerRow)}`, "import");

          // Look for data rows (skip header rows)
          let hasFoundDataRows = false;

          for (const row of data) {
            try {
              // Create column mapping based on the first row that has scheme ID
              const columnMapping = createColumnMapping(
                row as Record<string, any>,
              );
              const typedRow = row as Record<string, any>;

              // Find scheme ID with various possible column names or positions
              let schemeIdCell = "";
              let schemeId = "";

              // First check using our mapping
              for (const [header, field] of Object.entries(columnMapping)) {
                if (field === "scheme_id" && typedRow[header]) {
                  schemeIdCell = header;
                  schemeId = String(typedRow[schemeIdCell]).trim();
                  break;
                }
              }

              // If not found, try direct pattern approaches
              if (!schemeIdCell) {
                for (const pattern of COLUMN_PATTERNS.scheme_id) {
                  if (typedRow[pattern]) {
                    schemeIdCell = pattern;
                    schemeId = String(typedRow[schemeIdCell]).trim();
                    break;
                  }
                }
              }

              // If still not found, try direct column extraction for Scheme ID
              if (!schemeIdCell) {
                // In the Excel, Scheme ID is in column G - try to extract directly using column position
                const columnGIndex = 6; // Column G is index 6 (0-based)

                // Convert XLSX data to get the cell value at column G for current row
                const rowIndex = data.indexOf(row);
                if (rowIndex >= 0) {
                  // This is the Excel row number (1-based)
                  const excelRowNum = range.s.r + rowIndex + 1;

                  // Get the cell at column G for this row
                  const cellAddress = XLSX.utils.encode_cell({
                    r: excelRowNum - 1,
                    c: columnGIndex,
                  });
                  const cell = sheet[cellAddress];

                  if (cell && cell.v) {
                    schemeIdCell = "G";
                    schemeId = String(cell.v).trim();
                    log(
                      `Direct extraction - Scheme ID from column G, row ${excelRowNum}: "${schemeId}"`,
                      "import",
                    );
                  }
                }

                // If we still don't have a scheme ID, try column "Scheme ID" directly
                if (!schemeId && typedRow["Scheme ID"]) {
                  schemeIdCell = "Scheme ID";
                  schemeId = String(typedRow[schemeIdCell]).trim();
                  log(
                    `Found Scheme ID using exact column name "Scheme ID": ${schemeId}`,
                    "import",
                  );
                }

                // If still not found, try other nearby positions
                if (!schemeId) {
                  const possibleIndices = [5, 7]; // Try columns F and H
                  const headerKeys = Object.keys(typedRow);

                  for (const index of possibleIndices) {
                    if (
                      index < headerKeys.length &&
                      typedRow[headerKeys[index]]
                    ) {
                      schemeIdCell = headerKeys[index];
                      schemeId = String(typedRow[schemeIdCell]).trim();

                      // If this looks like a Scheme ID (has alphanumeric characters), use it
                      if (/^[a-z0-9_\-/]+$/i.test(schemeId)) {
                        log(
                          `Found Scheme ID at position ${index}: ${schemeId}`,
                          "import",
                        );
                        break;
                      }
                    }
                  }
                }
              }

              // Use our direct column G values if available
              if (!schemeIdCell && sheet["__directSchemeIDs"]) {
                const directSchemeIDs = sheet["__directSchemeIDs"] as Map<
                  number,
                  string
                >;

                // Try to find the row index for this data row
                let rowIndex = -1;

                // First find which row number this is in the data array
                const dataIndex = data.indexOf(row);
                if (dataIndex >= 0) {
                  // Add the sheet's starting row to get the actual row in the spreadsheet
                  rowIndex = range.s.r + dataIndex;
                  log(
                    `Looking up scheme ID for data row ${dataIndex} (Excel row ${rowIndex + 1})`,
                    "import",
                  );

                  // Get scheme ID from our direct mapping
                  if (directSchemeIDs.has(rowIndex)) {
                    schemeId = directSchemeIDs.get(rowIndex) || "";
                    schemeIdCell = "G"; // Mark that we found it in column G
                    log(
                      `Using direct scheme ID from column G, row ${rowIndex + 1}: "${schemeId}"`,
                      "import",
                    );
                  }
                }
              }

              // Last resort: look through all columns for something that looks like a scheme ID
              if (!schemeIdCell) {
                for (const [header, value] of Object.entries(typedRow)) {
                  if (
                    value &&
                    (typeof value === "string" || typeof value === "number")
                  ) {
                    const strValue = String(value).trim();
                    // Check if it looks like a scheme ID pattern
                    if (
                      /^[a-z0-9_\-/]+$/i.test(strValue) &&
                      strValue.length > 3 &&
                      strValue.length < 30
                    ) {
                      schemeIdCell = header;
                      schemeId = strValue;
                      log(
                        `Found potential Scheme ID by pattern matching: ${schemeId} in column ${header}`,
                        "import",
                      );
                      break;
                    }
                  }
                }
              }

              if (!schemeId) {
                // This row doesn't have a scheme ID
                continue;
              }

              // Now we've found a valid data row
              hasFoundDataRows = true;

              // Create record with scheme ID and ensure we include important location fields
              const record: Record<string, any> = {
                scheme_id: schemeId,
                // Initialize location fields as null - actual values will be filled from Excel row if available
                circle: null,
                division: null,
                sub_division: null,
                block: null,
                // Set agency based on region - this will be preserved during future imports
                agency: null, // Will be set after we determine the region
              };

              // If this is a multi-region sheet where we need to extract region from each row
              if (regionName === "EXTRACT_FROM_ROW") {
                // Try to find region in the row data
                let extractedRegion = null;

                // First check column mapping for region name field
                for (const [header, field] of Object.entries(columnMapping)) {
                  if (field === "region_name" && typedRow[header]) {
                    const regionValue = String(typedRow[header]).trim();
                    log(
                      `Found potential region in row: ${regionValue}`,
                      "import",
                    );

                    // Check if it matches our known regions
                    for (const { pattern, name } of REGION_PATTERNS) {
                      if (pattern.test(regionValue)) {
                        extractedRegion = name;
                        log(
                          `Matched region name ${regionValue} to known region: ${extractedRegion}`,
                          "import",
                        );
                        break;
                      }
                    }

                    // If we matched a region, use it
                    if (extractedRegion) {
                      break;
                    }
                  }
                }

                // If region still not found, fall back to a default
                if (!extractedRegion) {
                  // Try to get region from an existing scheme with this ID
                  try {
                    const existingScheme =
                      await storage.getSchemeById(schemeId);
                    if (existingScheme && existingScheme.region) {
                      extractedRegion = existingScheme.region;
                      log(
                        `Using region from existing scheme: ${extractedRegion}`,
                        "import",
                      );
                    }
                  } catch (e) {
                    // Ignore errors and use default
                  }
                }

                // If still no region, use default
                if (!extractedRegion) {
                  // Use a default region if we can't determine one
                  extractedRegion = "Nagpur"; // Default to Nagpur if we can't determine region
                  log(
                    `Using default region (${extractedRegion}) for scheme ID: ${schemeId}`,
                    "import",
                  );
                }

                record.region_name = extractedRegion;
                // Set agency based on region name
                const agencyMapping: Record<string, string> = {
                  Nagpur: "M/S Ceinsys",
                  Amravati: "M/S Ceinsys",
                  Nashik: "M/S Newtek",
                  Pune: "M/S Ecotech",
                  Konkan: "M/S Ecotech",
                  "Chhatrapati Sambhajinagar": "M/S Newtek",
                };
                record.agency =
                  agencyMapping[extractedRegion] || "Not Specified";
              } else {
                // Use the region from the sheet name
                record.region_name = regionName;
                // Set agency based on region name
                const agencyMapping: Record<string, string> = {
                  Nagpur: "M/S Ceinsys",
                  Amravati: "M/S Ceinsys",
                  Nashik: "M/S Newtek",
                  Pune: "M/S Ecotech",
                  Konkan: "M/S Ecotech",
                  "Chhatrapati Sambhajinagar": "M/S Newtek",
                };
                record.agency = agencyMapping[regionName] || "Not Specified";
              }

              // Process each column based on the mapping
              for (const [header, field] of Object.entries(columnMapping)) {
                if (
                  typedRow[header] !== null &&
                  typedRow[header] !== undefined
                ) {
                  record[field] = processValue(field, typedRow[header]);
                }
              }

              // Look up scheme name if it's not in the current row but we have a valid scheme ID
              if (!record.scheme_name) {
                // Try to find a scheme name from column headers/patterns
                for (const [header, content] of Object.entries(typedRow)) {
                  if (
                    COLUMN_PATTERNS.scheme_name.some(
                      (pattern) =>
                        header === pattern ||
                        header.toLowerCase() === pattern.toLowerCase() ||
                        header.toLowerCase().includes(pattern.toLowerCase()),
                    )
                  ) {
                    if (content) {
                      record.scheme_name = String(content).trim();
                      break;
                    }
                  }
                }
              }

              // Check if scheme exists
              const existingScheme = await storage.getSchemeById(schemeId);

              if (existingScheme) {
                // Update existing scheme with new data
                try {
                  // Apply special status mapping (Partial → In Progress)
                  if (record.fully_completion_scheme_status === "Partial") {
                    record.fully_completion_scheme_status = "In Progress";
                  }

                  // Set villages_integrated field if not explicitly provided
                  if (
                    record.fully_completed_villages !== undefined &&
                    record.partial_villages !== undefined
                  ) {
                    const completed =
                      typeof record.fully_completed_villages === "number"
                        ? record.fully_completed_villages
                        : 0;
                    const partial =
                      typeof record.partial_villages === "number"
                        ? record.partial_villages
                        : 0;

                    // Calculate villages_integrated as sum of fully_completed_villages and partial_villages
                    if (!record.villages_integrated) {
                      record.villages_integrated = completed + partial;
                    }
                  }

                  // Preserve static scheme information and location data
                  // Create a filtered record that excludes protected fields
                  const filteredRecord = { ...record };

                  // Fields to preserve during import (won't be updated)
                  const preservedFields = [
                    "scheme_id",
                    "scheme_name",
                    "agency",
                    "region_name",
                    "circle",
                    "division",
                    "sub_division",
                    "block",
                  ];

                  // Remove preserved fields from the update data
                  preservedFields.forEach((field) => {
                    delete filteredRecord[field];
                  });

                  // Log what we're preserving
                  log(
                    `Preserving static fields for scheme ${existingScheme.scheme_id}: ${preservedFields.join(", ")}`,
                    "import",
                  );

                  // Update scheme with filtered record (preserving static fields)
                  // Also set the active flag to true since the scheme is in the current import
                  const updatedScheme = await storage.updateScheme({
                    ...existingScheme,
                    ...filteredRecord,
                  });

                  log(`Updated scheme: ${schemeId}`, "import");
                  totalUpdated++;
                  processedSchemes.push(schemeId);
                } catch (updateError) {
                  console.error(
                    `Error updating scheme ${schemeId}:`,
                    updateError,
                  );
                }
              } else if (record.scheme_name) {
                // Create a new scheme if we have a name
                try {
                  // Apply special status mapping (Partial → In Progress)
                  if (record.fully_completion_scheme_status === "Partial") {
                    record.fully_completion_scheme_status = "In Progress";
                  }

                  // Create a properly typed object with scheme_name as a required field
                  // Set villages_integrated field if not explicitly provided
                  if (
                    record.fully_completed_villages !== undefined &&
                    record.no_of_partial_village !== undefined
                  ) {
                    const completed =
                      typeof record.fully_completed_villages === "number"
                        ? record.fully_completed_villages
                        : 0;
                    const partial =
                      typeof record.no_of_partial_village === "number"
                        ? record.no_of_partial_village
                        : 0;

                    // Calculate villages_integrated as sum of fully_completed_villages and partial_villages
                    if (!record.total_villages_integrated) {
                      record.total_villages_integrated = completed + partial;
                    }
                  }

                  const schemeData: InsertSchemeStatus = {
                    scheme_name: record.scheme_name || `Scheme ${schemeId}`, // Default name if missing
                    scheme_id: record.scheme_id,
                    region: record.region,
                    // Include agency
                    agency: record.agency as string | undefined,
                    // Include location fields
                    circle: record.circle as string | undefined,
                    division: record.division as string | undefined,
                    sub_division: record.sub_division as string | undefined,
                    block: record.block as string | undefined,
                    // Include all numeric fields
                    number_of_village: record.total_villages as
                      | number
                      | undefined,
                    total_villages_integrated: record.villages_integrated as
                      | number
                      | undefined,
                    fully_completed_villages:
                      record.fully_completed_villages as number | undefined,
                    no_of_partial_village: record.partial_villages as
                      | number
                      | undefined,
                    no_of_non_functional_village:
                      record.non_functional_villages as number | undefined,
                    total_number_of_esr: record.total_esr as number | undefined,
                    total_esr_integrated: record.total_esr_integrated as
                      | number
                      | undefined,
                    no_fully_completed_esr: record.no_fully_completed_esr as
                      | number
                      | undefined,
                    balance_to_complete_esr: record.balance_to_complete_esr as
                      | number
                      | undefined,
                    flow_meters_connected: record.flow_meters_connected as
                      | number
                      | undefined,
                    pressure_transmitter_connected:
                      record.pressure_transmitter_connected as
                      | number
                      | undefined,
                    residual_chlorine_analyzer_connected:
                      record.residual_chlorine_analyzer_connected as
                      | number
                      | undefined,
                    fully_completion_scheme_status:
                      record.fully_completion_scheme_status as
                      | string
                      | undefined,
                    scheme_functional_status:
                      record.scheme_functional_status as string | undefined,
                    no_of_functional_village:
                      record.no_of_functional_village as number | undefined,
                    water_supply: record.water_supply as string | undefined,
                    mjp_commissioned: record.mjp_commissioned as string | undefined,
                    mjp_fully_completed: record.mjp_fully_completed as string | undefined,
                  };

                  const newScheme = await storage.createScheme(schemeData);
                  log(`Created new scheme: ${schemeId}`, "import");
                  totalCreated++;
                  processedSchemes.push(schemeId);
                } catch (createError) {
                  console.error(
                    `Error creating scheme ${schemeId}:`,
                    createError,
                  );
                }
              } else {
                log(
                  `Scheme with ID ${schemeId} not found and missing scheme_name, skipping`,
                  "import",
                );
              }
            } catch (rowError) {
              console.error(`Error processing row in ${sheetName}:`, rowError);
            }
          }

          if (!hasFoundDataRows) {
            log(`No scheme data rows found in sheet: ${sheetName}`, "import");
          }
        }

        // Delete all schemes not in the processedSchemes list
        // This ensures any schemes not in the Excel file are removed
        try {
          const allSchemes = await storage.getAllSchemes();
          const schemesToDelete = allSchemes.filter(
            (scheme) => !processedSchemes.includes(scheme.scheme_id),
          );

          log(
            `Deleting ${schemesToDelete.length} schemes not found in the Excel file...`,
            "import",
          );
          let deletedCount = 0;

          for (const scheme of schemesToDelete) {
            try {
              await storage.deleteScheme(scheme.scheme_id);
              deletedCount++;
            } catch (deleteErr) {
              console.error(
                `Error deleting scheme ${scheme.scheme_id}:`,
                deleteErr,
              );
            }
          }

          log(`Successfully deleted ${deletedCount} schemes`, "import");

          // Update region summaries after import
          await updateRegionSummaries();

          // Force refresh of today's updates to detect changes in app_state
          // This ensures that changes are detected immediately after import
          await storage.getTodayUpdates();

          res.json({
            message: `Excel data imported successfully. ${totalUpdated} schemes updated, ${totalCreated} new schemes created, and ${deletedCount} schemes deleted.`,
            updatedCount: totalUpdated,
            createdCount: totalCreated,
            deletedCount,
            processedSchemes,
          });
        } catch (deleteError) {
          console.error("Error deleting old schemes:", deleteError);

          // Still update region summaries even if deletion fails
          await updateRegionSummaries();

          // Force refresh of today's updates to detect changes in app_state
          // This ensures that changes are detected immediately after import
          await storage.getTodayUpdates();

          res.json({
            message: `Excel data imported successfully. ${totalUpdated} schemes updated and ${totalCreated} new schemes created. Failed to delete old schemes.`,
            updatedCount: totalUpdated,
            createdCount: totalCreated,
            processedSchemes,
          });
        }
      } catch (error) {
        console.error("Error importing Excel data:", error);
        res.status(500).json({ message: "Failed to import Excel data" });
      }
    },
  );

  // Population tracking API endpoints
  app.post("/api/population/snapshot", async (req, res) => {
    try {
      const { date, totalPopulation } = req.body;

      if (!date || typeof totalPopulation !== "number") {
        return res.status(400).json({
          message: "Date and totalPopulation are required",
        });
      }

      const snapshot = await storage.savePopulationSnapshot(
        date,
        totalPopulation,
      );
      res.json(snapshot);
    } catch (error) {
      console.error("Error saving population snapshot:", error);
      res.status(500).json({ message: "Failed to save population snapshot" });
    }
  });

  app.get("/api/population/change/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const changeData = await storage.calculatePopulationChange(date);

      if (!changeData) {
        return res.status(404).json({
          message: "No population data found for the specified date",
        });
      }

      res.json(changeData);
    } catch (error) {
      console.error("Error calculating population change:", error);
      res
        .status(500)
        .json({ message: "Failed to calculate population change" });
    }
  });

  app.get("/api/population/latest", async (req, res) => {
    try {
      const latest = await storage.getLatestPopulation();
      res.json(latest);
    } catch (error) {
      console.error("Error fetching latest population:", error);
      res.status(500).json({ message: "Failed to fetch latest population" });
    }
  });

  app.get("/api/population/total", async (req, res) => {
    try {
      // Calculate current total population from water scheme data
      const waterSchemeDataList = await storage.getAllWaterSchemeData();
      const totalPopulation = waterSchemeDataList.reduce((sum, scheme) => {
        return sum + (scheme.population || 0);
      }, 0);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Save today's population snapshot
      await storage.savePopulationSnapshot(today, totalPopulation);

      // Also save region-specific snapshots
      await storage.saveAllRegionPopulationSnapshots(today);

      // Calculate population change from previous day
      const changeData = await storage.calculatePopulationChange(today);

      res.json({
        totalPopulation,
        date: today,
        change: changeData,
      });
    } catch (error) {
      console.error("Error calculating total population:", error);
      res.status(500).json({ message: "Failed to calculate total population" });
    }
  });

  // Region-specific population tracking endpoints
  app.get("/api/population/region/:region", async (req, res) => {
    try {
      const { region } = req.params;

      // Calculate current population for the specific region
      const waterSchemeDataList = await storage.getAllWaterSchemeData();
      const regionSchemes = waterSchemeDataList.filter(
        (scheme) => scheme.region === region,
      );
      const regionPopulation = regionSchemes.reduce((sum, scheme) => {
        return sum + (scheme.population || 0);
      }, 0);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Save today's region population snapshot
      await storage.saveRegionPopulationSnapshot(
        today,
        region,
        regionPopulation,
      );

      // Calculate population change from previous day
      const changeData = await storage.calculateRegionPopulationChange(
        today,
        region,
      );

      res.json({
        totalPopulation: regionPopulation,
        region,
        date: today,
        change: changeData,
      });
    } catch (error) {
      console.error("Error calculating region population:", error);
      res
        .status(500)
        .json({ message: "Failed to calculate region population" });
    }
  });

  app.post("/api/population/region/snapshot", async (req, res) => {
    try {
      const { date, region, totalPopulation } = req.body;

      if (!date || !region || typeof totalPopulation !== "number") {
        return res.status(400).json({
          message: "Date, region, and totalPopulation are required",
        });
      }

      const snapshot = await storage.saveRegionPopulationSnapshot(
        date,
        region,
        totalPopulation,
      );
      res.json(snapshot);
    } catch (error) {
      console.error("Error saving region population snapshot:", error);
      res
        .status(500)
        .json({ message: "Failed to save region population snapshot" });
    }
  });

  app.get("/api/population/region/:region/change/:date", async (req, res) => {
    try {
      const { region, date } = req.params;
      const changeData = await storage.calculateRegionPopulationChange(
        date,
        region,
      );

      if (!changeData) {
        return res.status(404).json({
          message: "No population data found for the specified region and date",
        });
      }

      res.json(changeData);
    } catch (error) {
      console.error("Error calculating region population change:", error);
      res
        .status(500)
        .json({ message: "Failed to calculate region population change" });
    }
  });

  // --------------------- Population Tracking API Routes ---------------------

  // Get total population for a specific date (latest if no date provided)
  app.get("/api/population/total", async (req, res) => {
    try {
      const date = req.query.date as string;
      const populationData = await storage.getTotalPopulation(date);
      res.json(populationData);
    } catch (error) {
      console.error("Error fetching total population:", error);
      res.status(500).json({ message: "Failed to fetch total population" });
    }
  });

  // Get regional population for a specific date and region
  app.get("/api/population/region/:region", async (req, res) => {
    try {
      const region = req.params.region;
      const date = req.query.date as string;
      const populationData = await storage.getRegionalPopulation(region, date);
      res.json(populationData);
    } catch (error) {
      console.error("Error fetching regional population:", error);
      res.status(500).json({ message: "Failed to fetch regional population" });
    }
  });

  // Get population history for all regions
  app.get("/api/population/history", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const populationHistory = await storage.getPopulationHistory(days);
      res.json(populationHistory);
    } catch (error) {
      console.error("Error fetching population history:", error);
      res.status(500).json({ message: "Failed to fetch population history" });
    }
  });

  // Add daily population data (admin only)
  app.post("/api/population/total", requireAdmin, async (req, res) => {
    try {
      const { date, total_population } = req.body;

      if (!date || !total_population) {
        return res
          .status(400)
          .json({ message: "Date and total_population are required" });
      }

      const result = await storage.addTotalPopulation({
        date,
        total_population,
      });
      res.json(result);
    } catch (error) {
      console.error("Error adding total population:", error);
      res.status(500).json({ message: "Failed to add total population" });
    }
  });

  // Add regional population data (admin only)
  app.post("/api/population/region", requireAdmin, async (req, res) => {
    try {
      const { date, region, population } = req.body;

      if (!date || !region || !population) {
        return res
          .status(400)
          .json({ message: "Date, region, and population are required" });
      }

      const result = await storage.addRegionalPopulation({
        date,
        region,
        total_population: population,
      });
      res.json(result);
    } catch (error) {
      console.error("Error adding regional population:", error);
      res.status(500).json({ message: "Failed to add regional population" });
    }
  });

  // Create HTTP server - SSL is handled by cloud load balancer/proxy
  let server: Server = createHttpServer(app);
  return server;
}
