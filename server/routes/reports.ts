import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db-local";
import { reportFiles, insertReportFileSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Check for VS Code environment and set appropriate upload directory
const isVSCode = process.env.VSCODE_CLI === "1" || process.env.VSCODE_PID;

// Set the upload directory path based on environment
const uploadDir = isVSCode
  ? path.join(process.cwd(), "uploads", "reports") // Use project directory for VS Code
  : "/tmp/reports"; // Use tmp for Replit

// Ensure the upload directory exists with proper permissions
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  // On non-Windows systems, set directory permissions
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(uploadDir, 0o755);
    } catch (err) {
      console.error("Failed to set upload directory permissions:", err);
    }
  }
}

console.log("Report files upload directory:", uploadDir);

// Set up multer storage configuration for Excel files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    // Preserve original extension
    const ext = path.extname(file.originalname);
    cb(null, uniqueId + ext);
  },
});

// Configure multer upload middleware
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow Excel files
    const allowedMimes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];

    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files are allowed."));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
};

// Get list of available report files
router.get("/", async (req, res) => {
  try {
    console.log("Attempting to fetch report files from database...");
    const allFiles = await db.select().from(reportFiles);
    console.log("Database query successful, found files:", allFiles.length);
    // Filter active files in memory
    const activeFiles = allFiles.filter((file) => file.is_active === true);
    console.log("Active files after filtering:", activeFiles.length);
    res.json(activeFiles);
  } catch (error) {
    console.error("Detailed error fetching report files:", error);
    res.status(500).json({ error: "Failed to fetch report files" });
  }
});

// Get report file by type (latest version)
router.get("/type/:reportType", async (req, res) => {
  try {
    const { reportType } = req.params;

    // Validate report type
    const validReportTypes = [
      "esr_level",
      "water_consumption",
      "lpcd_village",
      "chlorine",
      "pressure",
      "village_level",
      "scheme_level",
      // Overall report types
      "overall_chlorine",
      "overall_pressure", 
      "overall_water_consumption",
      "overall_lpcd",
      // Monthly Reports
      "water_consumption_esr_monthly",
      "water_consumption_village_monthly",
      "water_consumption_scheme_monthly",
      "lpcd_village_monthly",
      "lpcd_scheme_monthly",
    ];

    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: "Invalid report type" });
    }

    // Get the latest active file of this type
    const latestFiles = await db.select().from(reportFiles);

    // Filter files in memory
    const typeFiles = latestFiles.filter(
      (file) => file.report_type === reportType && file.is_active === true,
    );

    // Find the latest file by sorting in memory
    const sortedFiles = [...typeFiles].sort((a, b) => {
      const dateA = a.upload_date
        ? new Date(a.upload_date as Date).getTime()
        : 0;
      const dateB = b.upload_date
        ? new Date(b.upload_date as Date).getTime()
        : 0;
      return dateB - dateA;
    });

    const latestFile = sortedFiles.length > 0 ? sortedFiles[0] : null;

    if (!latestFile) {
      return res.status(404).json({ error: "Report file not found" });
    }

    // Return file metadata as JSON instead of downloading the file
    console.log(`Found file metadata for report type: ${reportType}`);
    
    res.json({
      id: latestFile.id,
      file_name: latestFile.file_name,
      original_name: latestFile.original_name,
      file_path: latestFile.file_path,
      report_type: latestFile.report_type,
      upload_date: latestFile.upload_date,
      file_size: latestFile.file_size
    });
  } catch (error) {
    console.error("Error retrieving report file:", error);
    res.status(500).json({ error: "Failed to retrieve report file" });
  }
});

// Download report file by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    // Get the file record
    const [file] = await db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.id, fileId));

    if (!file || !file.is_active) {
      return res.status(404).json({ error: "Report file not found" });
    }

    // Send the file
    const filePath = file.file_path;
    console.log(`Attempting to download file by ID from path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);

      // Try alternative location (handle both Replit and VS Code paths)
      const fileName = path.basename(filePath);
      const altPaths = [
        path.join("/tmp/reports", fileName),
        path.join(__dirname, "..", "..", "uploads", "reports", fileName),
        path.join(process.cwd(), "uploads", "reports", fileName),
      ];

      console.log(`Trying alternative paths: ${altPaths.join(", ")}`);

      // Find first existing alternative path
      const existingPath = altPaths.find((p) => fs.existsSync(p));

      if (existingPath) {
        console.log(`Found file at alternative path: ${existingPath}`);
        return res.download(existingPath, file.original_name);
      }

      return res.status(404).json({
        error: "File not found on server",
        path: filePath,
        tried: altPaths,
      });
    }

    res.download(filePath, file.original_name);
  } catch (error) {
    console.error("Error downloading report file:", error);
    res.status(500).json({ error: "Failed to download report file" });
  }
});

// Upload a new report file (admin only)
router.post(
  "/upload",
  requireAdmin,
  upload.single("file"),
  async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const { report_type } = req.body;

      // Accept any report type that matches our predefined buttons
      // This allows flexible uploading of any file to any button
      const validReportTypes = [
        "esr_level",
        "water_consumption",
        "lpcd_village",
        "chlorine",
        "pressure",
        "village_level",
        "scheme_level",
        // Overall report types
        "overall_chlorine",
        "overall_pressure", 
        "overall_water_consumption",
        "overall_lpcd",
        // Monthly Reports
        "water_consumption_esr_monthly",
        "water_consumption_village_monthly",
        "water_consumption_scheme_monthly",
        "lpcd_village_monthly",
        "lpcd_scheme_monthly",
      ];

      if (!validReportTypes.includes(report_type)) {
        console.log(`Received report_type: "${report_type}"`);
        // Remove uploaded file if report type is invalid
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Invalid report type" });
      }

      // Get file stats for size
      const stats = fs.statSync(req.file.path);

      const fileData = {
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        report_type: report_type,
        uploaded_by: req.session.userId,
        file_size: stats.size,
        is_active: true,
      };

      // Validate data with zod schema
      const parsedData = insertReportFileSchema.parse(fileData);

      // First, deactivate any previous files of this type
      const allFiles = await db.select().from(reportFiles);
      const sameTypeFiles = allFiles.filter(
        (f) => f.report_type === report_type,
      );

      // If there are existing files of the same type, deactivate them
      if (sameTypeFiles.length > 0) {
        for (const file of sameTypeFiles) {
          await db
            .update(reportFiles)
            .set({ is_active: false })
            .where(eq(reportFiles.id, file.id));
        }
      }

      // Insert the new file record
      const [insertedFile] = await db
        .insert(reportFiles)
        .values(parsedData)
        .returning();

      res.status(201).json({
        message: "Report file uploaded successfully",
        file: insertedFile,
      });
    } catch (error) {
      console.error("Error uploading report file:", error);

      // Clean up the uploaded file on error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error(
            "Error removing file after failed upload:",
            unlinkError,
          );
        }
      }

      res.status(500).json({
        error: "Failed to upload report file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// Delete a report file (admin only)
router.delete("/:id", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    // Get the file record first to get the file path
    const [file] = await db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.id, fileId));

    if (!file) {
      return res.status(404).json({ error: "Report file not found" });
    }

    // Deactivate the file (soft delete)
    await db
      .update(reportFiles)
      .set({ is_active: false })
      .where(eq(reportFiles.id, fileId));

    res.json({ message: "Report file deleted successfully" });
  } catch (error) {
    console.error("Error deleting report file:", error);
    res.status(500).json({ error: "Failed to delete report file" });
  }
});

// Overall report download endpoints for complete data export
import * as XLSX from 'xlsx';
import pg from 'pg';

const { Pool } = pg;

// Download overall chlorine report
router.get('/download/overall-chlorine', async (req, res) => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Get all chlorine data
      const result = await client.query(`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, esr_name,
          chlorine_value_1, chlorine_value_2, chlorine_value_3, chlorine_value_4,
          chlorine_value_5, chlorine_value_6, chlorine_value_7,
          chlorine_date_day_1, chlorine_date_day_2, chlorine_date_day_3, chlorine_date_day_4,
          chlorine_date_day_5, chlorine_date_day_6, chlorine_date_day_7,
          number_of_consistent_zero_value_in_chlorine,
          chlorine_less_than_02_mgl, chlorine_between_02_05_mgl, chlorine_greater_than_05_mgl
        FROM chlorine_data
        ORDER BY region, scheme_id, village_name, esr_name
      `);

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data for Excel
      const excelData = result.rows.map(row => ({
        'Region': row.region,
        'Circle': row.circle,
        'Division': row.division,
        'Sub Division': row.sub_division,
        'Block': row.block,
        'Scheme ID': row.scheme_id,
        'Scheme Name': row.scheme_name,
        'Village Name': row.village_name,
        'ESR Name': row.esr_name,
        'Chlorine Day 1': row.chlorine_value_1,
        'Chlorine Day 2': row.chlorine_value_2,
        'Chlorine Day 3': row.chlorine_value_3,
        'Chlorine Day 4': row.chlorine_value_4,
        'Chlorine Day 5': row.chlorine_value_5,
        'Chlorine Day 6': row.chlorine_value_6,
        'Chlorine Day 7': row.chlorine_value_7,
        'Date Day 1': row.chlorine_date_day_1,
        'Date Day 2': row.chlorine_date_day_2,
        'Date Day 3': row.chlorine_date_day_3,
        'Date Day 4': row.chlorine_date_day_4,
        'Date Day 5': row.chlorine_date_day_5,
        'Date Day 6': row.chlorine_date_day_6,
        'Date Day 7': row.chlorine_date_day_7,
        'Consistent Zero Values': row.number_of_consistent_zero_value_in_chlorine,
        'Less than 0.2 mg/l': row.chlorine_less_than_02_mgl,
        'Between 0.2-0.5 mg/l': row.chlorine_between_02_05_mgl,
        'Greater than 0.5 mg/l': row.chlorine_greater_than_05_mgl
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Chlorine Data');
      
      // Add summary sheet
      const summaryData = [
        { 'Report Type': 'Overall Chlorine Report' },
        { 'Generated At': new Date().toISOString() },
        { 'Total Records': result.rows.length },
        { 'Data Source': 'Maharashtra Water Infrastructure Platform' }
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Report Summary');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      const filename = `Overall_Chlorine_Report_${new Date().toISOString().split('T')[0]}`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error downloading overall chlorine report:', error);
    res.status(500).json({ error: 'Failed to download chlorine report' });
  }
});

// Download overall pressure report
router.get('/download/overall-pressure', async (req, res) => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Get all pressure data
      const result = await client.query(`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, esr_name,
          pressure_value_1, pressure_value_2, pressure_value_3, pressure_value_4,
          pressure_value_5, pressure_value_6, pressure_value_7,
          pressure_date_day_1, pressure_date_day_2, pressure_date_day_3, pressure_date_day_4,
          pressure_date_day_5, pressure_date_day_6, pressure_date_day_7,
          number_of_consistent_zero_value_in_pressure,
          pressure_less_than_02_bar, pressure_between_02_07_bar, pressure_greater_than_07_bar
        FROM pressure_data
        ORDER BY region, scheme_id, village_name, esr_name
      `);

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data for Excel
      const excelData = result.rows.map(row => ({
        'Region': row.region,
        'Circle': row.circle,
        'Division': row.division,
        'Sub Division': row.sub_division,
        'Block': row.block,
        'Scheme ID': row.scheme_id,
        'Scheme Name': row.scheme_name,
        'Village Name': row.village_name,
        'ESR Name': row.esr_name,
        'Pressure Day 1': row.pressure_value_1,
        'Pressure Day 2': row.pressure_value_2,
        'Pressure Day 3': row.pressure_value_3,
        'Pressure Day 4': row.pressure_value_4,
        'Pressure Day 5': row.pressure_value_5,
        'Pressure Day 6': row.pressure_value_6,
        'Pressure Day 7': row.pressure_value_7,
        'Date Day 1': row.pressure_date_day_1,
        'Date Day 2': row.pressure_date_day_2,
        'Date Day 3': row.pressure_date_day_3,
        'Date Day 4': row.pressure_date_day_4,
        'Date Day 5': row.pressure_date_day_5,
        'Date Day 6': row.pressure_date_day_6,
        'Date Day 7': row.pressure_date_day_7,
        'Consistent Zero Values': row.number_of_consistent_zero_value_in_pressure,
        'Less than 0.2 bar': row.pressure_less_than_02_bar,
        'Between 0.2-0.7 bar': row.pressure_between_02_07_bar,
        'Greater than 0.7 bar': row.pressure_greater_than_07_bar
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Pressure Data');
      
      // Add summary sheet
      const summaryData = [
        { 'Report Type': 'Overall Pressure Report' },
        { 'Generated At': new Date().toISOString() },
        { 'Total Records': result.rows.length },
        { 'Data Source': 'Maharashtra Water Infrastructure Platform' }
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Report Summary');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      const filename = `Overall_Pressure_Report_${new Date().toISOString().split('T')[0]}`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error downloading overall pressure report:', error);
    res.status(500).json({ error: 'Failed to download pressure report' });
  }
});

// Download overall water consumption report
router.get('/download/overall-water-consumption', async (req, res) => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Get all water consumption data
      const result = await client.query(`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, population, number_of_esr,
          water_value_day1, water_value_day2, water_value_day3, 
          water_value_day4, water_value_day5, water_value_day6,
          water_date_day1, water_date_day2, water_date_day3, 
          water_date_day4, water_date_day5, water_date_day6
        FROM water_scheme_data
        WHERE water_value_day1 IS NOT NULL OR water_value_day2 IS NOT NULL 
           OR water_value_day3 IS NOT NULL OR water_value_day4 IS NOT NULL
           OR water_value_day5 IS NOT NULL OR water_value_day6 IS NOT NULL
        ORDER BY region, scheme_id, village_name
      `);

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data for Excel
      const excelData = result.rows.map(row => ({
        'Region': row.region,
        'Circle': row.circle,
        'Division': row.division,
        'Sub Division': row.sub_division,
        'Block': row.block,
        'Scheme ID': row.scheme_id,
        'Scheme Name': row.scheme_name,
        'Village Name': row.village_name,
        'Population': row.population,
        'Number of ESR': row.number_of_esr,
        'Water Day 1': row.water_value_day1,
        'Water Day 2': row.water_value_day2,
        'Water Day 3': row.water_value_day3,
        'Water Day 4': row.water_value_day4,
        'Water Day 5': row.water_value_day5,
        'Water Day 6': row.water_value_day6,
        'Date Day 1': row.water_date_day1,
        'Date Day 2': row.water_date_day2,
        'Date Day 3': row.water_date_day3,
        'Date Day 4': row.water_date_day4,
        'Date Day 5': row.water_date_day5,
        'Date Day 6': row.water_date_day6
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Water Consumption Data');
      
      // Add summary sheet
      const summaryData = [
        { 'Report Type': 'Overall Water Consumption Report' },
        { 'Generated At': new Date().toISOString() },
        { 'Total Records': result.rows.length },
        { 'Data Source': 'Maharashtra Water Infrastructure Platform' }
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Report Summary');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      const filename = `Overall_Water_Consumption_Report_${new Date().toISOString().split('T')[0]}`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error downloading overall water consumption report:', error);
    res.status(500).json({ error: 'Failed to download water consumption report' });
  }
});

// Download overall LPCD report
router.get('/download/overall-lpcd', async (req, res) => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Get all LPCD data
      const result = await client.query(`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, population, number_of_esr,
          lpcd_value_day1, lpcd_value_day2, lpcd_value_day3, 
          lpcd_value_day4, lpcd_value_day5, lpcd_value_day6, lpcd_value_day7,
          lpcd_date_day1, lpcd_date_day2, lpcd_date_day3, 
          lpcd_date_day4, lpcd_date_day5, lpcd_date_day6, lpcd_date_day7,
          consistent_zero_lpcd_for_a_week, below_55_lpcd_count, above_55_lpcd_count
        FROM water_scheme_data
        WHERE lpcd_value_day1 IS NOT NULL OR lpcd_value_day2 IS NOT NULL 
           OR lpcd_value_day3 IS NOT NULL OR lpcd_value_day4 IS NOT NULL
           OR lpcd_value_day5 IS NOT NULL OR lpcd_value_day6 IS NOT NULL
           OR lpcd_value_day7 IS NOT NULL
        ORDER BY region, scheme_id, village_name
      `);

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data for Excel
      const excelData = result.rows.map(row => ({
        'Region': row.region,
        'Circle': row.circle,
        'Division': row.division,
        'Sub Division': row.sub_division,
        'Block': row.block,
        'Scheme ID': row.scheme_id,
        'Scheme Name': row.scheme_name,
        'Village Name': row.village_name,
        'Population': row.population,
        'Number of ESR': row.number_of_esr,
        'LPCD Day 1': row.lpcd_value_day1,
        'LPCD Day 2': row.lpcd_value_day2,
        'LPCD Day 3': row.lpcd_value_day3,
        'LPCD Day 4': row.lpcd_value_day4,
        'LPCD Day 5': row.lpcd_value_day5,
        'LPCD Day 6': row.lpcd_value_day6,
        'LPCD Day 7': row.lpcd_value_day7,
        'Date Day 1': row.lpcd_date_day1,
        'Date Day 2': row.lpcd_date_day2,
        'Date Day 3': row.lpcd_date_day3,
        'Date Day 4': row.lpcd_date_day4,
        'Date Day 5': row.lpcd_date_day5,
        'Date Day 6': row.lpcd_date_day6,
        'Date Day 7': row.lpcd_date_day7,
        'Consistent Zero LPCD for Week': row.consistent_zero_lpcd_for_a_week,
        'Below 55 LPCD Count': row.below_55_lpcd_count,
        'Above 55 LPCD Count': row.above_55_lpcd_count
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'LPCD Data');
      
      // Add summary sheet
      const summaryData = [
        { 'Report Type': 'Overall LPCD Report' },
        { 'Generated At': new Date().toISOString() },
        { 'Total Records': result.rows.length },
        { 'Data Source': 'Maharashtra Water Infrastructure Platform' }
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Report Summary');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      const filename = `Overall_LPCD_Report_${new Date().toISOString().split('T')[0]}`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error downloading overall LPCD report:', error);
    res.status(500).json({ error: 'Failed to download LPCD report' });
  }
});

export default router;
