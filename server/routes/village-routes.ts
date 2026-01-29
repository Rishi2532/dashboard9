import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse";
// requireAdmin is defined in routes.ts, we'll use it directly in the route registration

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Import village data from CSV file (admin only)
router.post("/import/csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log("Village CSV Import - File received:", {
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
    
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process CSV file
    try {
      const records: any[] = [];
      
      // Parse CSV without headers
      const parser = parse(req.file.buffer, {
        delimiter: ',',
        skip_empty_lines: true,
        trim: true,
      });
      
      parser.on('data', (row: string[]) => {
        records.push(row);
      });
      
      parser.on('error', (error) => {
        console.error('CSV parsing error:', error);
        errors.push(`CSV parsing error: ${error.message}`);
      });
      
      await new Promise((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
      });
      
      console.log(`Parsed ${records.length} records from CSV`);
      
      if (records.length === 0) {
        return res.status(400).json({ 
          error: "No data found in CSV file",
          details: "The CSV file appears to be empty or contains no valid data rows"
        });
      }
      
      // Clear existing data if requested
      if (clearExisting) {
        const { storage } = await import("../storage");
        await storage.clearVillageData();
        console.log("Cleared existing village data");
      }
      
      // Process each record
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        
        try {
          // Map columns according to the specified mapping:
          // Column 0 -> region, Column 1 -> circle, Column 2 -> division, etc.
          const villageData = {
            region: row[0] || null,
            circle: row[1] || null,
            division: row[2] || null,
            sub_division: row[3] || null,
            block: row[4] || null,
            scheme_id: row[5] || null,
            scheme_name: row[6] || null,
            village_name: row[7] || null,
            number_of_esr: row[8] ? parseInt(row[8]) || null : null,
            connected_esr: row[9] ? parseInt(row[9]) || null : null,
            not_connected_esr: row[10] ? parseInt(row[10]) || null : null,
            village_functional_status: row[11] || null,
            no_of_fully_completion_esr: row[12] ? parseInt(row[12]) || null : null,
            fully_completion_village_status: row[13] || null,
          };
          
          // Skip rows with no village name
          if (!villageData.village_name) {
            continue;
          }
          
          // Insert or update village data
          const { storage } = await import("../storage");
          const result = await storage.insertOrUpdateVillage(villageData);
          
          if (result.inserted) {
            importedCount++;
          } else {
            updatedCount++;
          }
          
        } catch (error: any) {
          console.error(`Error processing record ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }
      
      const result = {
        message: `Village CSV import completed`,
        imported: importedCount,
        updated: updatedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10), // Limit error details to first 10
        totalProcessed: records.length,
        clearedExisting: clearExisting
      };
      
      console.log(`Village CSV import completed:`, result);
      res.json(result);
      
    } catch (importError: any) {
      console.error("Detailed CSV import error:", importError);
      res.status(500).json({ 
        error: "Failed to import village data from CSV", 
        details: importError.message || String(importError),
        preview: filePreview
      });
    }
  } catch (error: any) {
    console.error("Error in village CSV upload route:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message || String(error)
    });
  }
});

// Get all villages (admin only)
router.get("/", async (req, res) => {
  try {
    const { storage } = await import("../storage");
    const villages = await storage.getAllVillages();
    
    res.json({
      success: true,
      data: villages,
      count: villages.length
    });
  } catch (error: any) {
    console.error("Error getting villages:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get villages", 
      details: error.message || String(error)
    });
  }
});

export default router;