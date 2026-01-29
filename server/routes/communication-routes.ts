import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Root route for comprehensive Excel export - returns all communication data
router.get("/", async (req, res) => {
  try {
    const { region } = req.query;

    // Get all communication status data with optional region filtering
    const result = await storage.getCommunicationSchemes({
      region: region as string,
      circle: undefined,
      division: undefined,
      sub_division: undefined,
      block: undefined,
      data_freshness: undefined
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching communication data:", error);
    res.status(500).json({ error: "Failed to fetch communication data" });
  }
});

// Get communication status overview with filtering
router.get("/overview", async (req, res) => {
  try {
    const { region, circle, division, sub_division, block, data_freshness } =
      req.query;

    const result = await storage.getCommunicationOverview({
      region: region as string,
      circle: circle as string,
      division: division as string,
      sub_division: sub_division as string,
      block: block as string,
      data_freshness: data_freshness as string,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching communication overview:", error);
    res.status(500).json({ error: "Failed to fetch communication overview" });
  }
});

// Get unique values for filters
router.get("/filters", async (req, res) => {
  try {
    const { region, circle, division, sub_division } = req.query;

    const result = await storage.getCommunicationFilters({
      region: region as string,
      circle: circle as string,
      division: division as string,
      sub_division: sub_division as string,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching communication filters:", error);
    res.status(500).json({ error: "Failed to fetch communication filters" });
  }
});

// Get schemes list with communication status
router.get("/schemes", async (req, res) => {
  try {
    const { region, circle, division, sub_division, block, data_freshness } =
      req.query;

    const result = await storage.getCommunicationSchemes({
      region: region as string,
      circle: circle as string,
      division: division as string,
      sub_division: sub_division as string,
      block: block as string,
      data_freshness: data_freshness as string,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching communication schemes:", error);
    res.status(500).json({ error: "Failed to fetch communication schemes" });
  }
});

// Get scheme details with ESR communication status
router.get("/schemes/:schemeId", async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { data_freshness } = req.query;

    const result = await storage.getSchemeCommunitationDetails(
      schemeId,
      data_freshness as string,
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching scheme communication details:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch scheme communication details" });
  }
});

// Import communication status from CSV
router.post("/import/csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { clearExisting } = req.body;
    const shouldClear = clearExisting === "true";

    console.log(
      `Starting communication status CSV import (clearExisting=${shouldClear})`,
    );

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Parse CSV without headers
    const records: string[][] = [];

    await new Promise<void>((resolve, reject) => {
      parse(
        fileContent,
        {
          skip_empty_lines: true,
          trim: true,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            records.push(...data);
            resolve();
          }
        },
      );
    });

    console.log(`Parsed ${records.length} records from CSV`);

    // Clear existing data if requested
    if (shouldClear) {
      console.log("Clearing existing communication status data...");
      await storage.clearCommunicationStatus();
    }

    // Process records in batches
    const result = await storage.importCommunicationStatusFromCSV(records);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log("Communication status import completed:", result);
    res.json(result);
  } catch (error) {
    console.error("Error importing communication status CSV:", error);

    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    res.status(500).json({
      error: "Failed to import communication status data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get communication status statistics
router.get("/stats", async (req, res) => {
  try {
    const result = await storage.getCommunicationStats();
    res.json(result);
  } catch (error) {
    console.error("Error fetching communication stats:", error);
    res.status(500).json({ error: "Failed to fetch communication stats" });
  }
});

export default router;
