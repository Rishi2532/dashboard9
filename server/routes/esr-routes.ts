import { Router } from "express";
import { z } from "zod";
import { eq, sql, and, desc, asc } from "drizzle-orm";
import { getDB } from "../db";
import { esrMonitoring, insertESRMonitoringSchema } from "../../shared/schema";
import XLSX from "xlsx";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Get all ESR monitoring data with pagination
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const region = req.query.region as string;
    const status = req.query.status as string;
    
    let query = db.select().from(esrMonitoring);
    
    const conditions = [];
    if (region) {
      conditions.push(eq(esrMonitoring.region_name, region));
    }
    if (status) {
      conditions.push(eq(esrMonitoring.overall_status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const esrData = await query
      .orderBy(asc(esrMonitoring.region_name), asc(esrMonitoring.village_name))
      .limit(limit)
      .offset((page - 1) * limit);
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(esrMonitoring)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = totalResult[0]?.count || 0;
    
    res.json({
      data: esrData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching ESR monitoring data:", error);
    res.status(500).json({ error: "Failed to fetch ESR monitoring data" });
  }
});

// Get ESR statistics by region
router.get("/stats", async (req, res) => {
  try {
    const db = await getDB();
    
    const stats = await db
      .select({
        region_name: esrMonitoring.region_name,
        total_esr: sql<number>`count(*)`,
        online_chlorine: sql<number>`sum(case when ${esrMonitoring.chlorine_status} = 'Online' then 1 else 0 end)`,
        online_pressure: sql<number>`sum(case when ${esrMonitoring.pressure_status} = 'Online' then 1 else 0 end)`,
        online_flow_meter: sql<number>`sum(case when ${esrMonitoring.flow_meter_status} = 'Online' then 1 else 0 end)`,
        connected_chlorine: sql<number>`sum(${esrMonitoring.chlorine_connected})`,
        connected_pressure: sql<number>`sum(${esrMonitoring.pressure_connected})`,
        connected_flow_meter: sql<number>`sum(${esrMonitoring.flow_meter_connected})`,
      })
      .from(esrMonitoring)
      .groupBy(esrMonitoring.region_name)
      .orderBy(asc(esrMonitoring.region_name));
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching ESR stats:", error);
    res.status(500).json({ error: "Failed to fetch ESR statistics" });
  }
});

// Import ESR data from Excel file
router.post("/import", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const db = await getDB();
    const filePath = req.file.path;
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Process region data sheets
    const regionSheets = [
      'Region - Amravati Data',
      'Region - Nashik Data', 
      'Region - Nagpur Data',
      'Region - Pune Data',
      'Region - Konkan Data',
      'Region - CS Data'
    ];
    
    let totalImported = 0;
    const importErrors = [];
    
    for (const sheetName of regionSheets) {
      if (workbook.SheetNames.includes(sheetName)) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) continue;
        
        // Extract region name
        const regionName = sheetName.replace('Region - ', '').replace(' Data', '');
        
        for (const row of jsonData) {
          try {
            const esrData = {
              region_name: regionName,
              circle: row['Circle'] || '',
              division: row['Division'] || '',
              sub_division: row['Sub Division'] || '',
              block: row['Block'] || '',
              scheme_id: String(row['Scheme ID'] || ''),
              scheme_name: row['Scheme Name'] || '',
              village_name: row['Village Name'] || '',
              esr_name: row['ESR Name'] || '',
              chlorine_connected: row['Chlorine - Connected or not'] === 'Yes' ? 1 : 0,
              pressure_connected: row['Pressure - Connected or not'] === 'Yes' ? 1 : 0,
              flow_meter_connected: row['Flow Meter - Connected or not'] === 'Yes' ? 1 : 0,
              chlorine_status: row['Chlorine - Online or Offline'] || 'Unknown',
              pressure_status: row['Pressure - Online or Offline'] || 'Unknown',
              flow_meter_status: row['Flow Meter - Online or Offline'] || 'Unknown',
              overall_status: row['Status'] || 'Unknown'
            };
            
            // Insert with upsert logic
            await db
              .insert(esrMonitoring)
              .values(esrData)
              .onConflictDoUpdate({
                target: [esrMonitoring.scheme_id, esrMonitoring.village_name, esrMonitoring.esr_name],
                set: {
                  chlorine_connected: esrData.chlorine_connected,
                  pressure_connected: esrData.pressure_connected,
                  flow_meter_connected: esrData.flow_meter_connected,
                  chlorine_status: esrData.chlorine_status,
                  pressure_status: esrData.pressure_status,
                  flow_meter_status: esrData.flow_meter_status,
                  overall_status: esrData.overall_status,
                  last_updated: sql`CURRENT_TIMESTAMP`
                }
              });
            
            totalImported++;
          } catch (error) {
            importErrors.push({
              village: row['Village Name'],
              error: error.message
            });
          }
        }
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: "ESR data imported successfully",
      totalImported,
      errors: importErrors.length > 0 ? importErrors.slice(0, 10) : []
    });
    
  } catch (error) {
    console.error("Error importing ESR data:", error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: "Failed to import ESR data" });
  }
});

// Get ESR data for a specific village
router.get("/village/:villageId", async (req, res) => {
  try {
    const db = await getDB();
    const villageId = req.params.villageId;
    
    const esrData = await db
      .select()
      .from(esrMonitoring)
      .where(eq(esrMonitoring.village_name, villageId))
      .orderBy(asc(esrMonitoring.esr_name));
    
    res.json(esrData);
  } catch (error) {
    console.error("Error fetching village ESR data:", error);
    res.status(500).json({ error: "Failed to fetch village ESR data" });
  }
});

export default router;