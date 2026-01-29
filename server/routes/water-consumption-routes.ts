import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PostgresStorage } from "../storage";
import pg from "pg";
import ExcelJS from "exceljs";

const router = Router();
const storage = new PostgresStorage();

// Configure multer for CSV uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      path.extname(file.originalname) === ".csv"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Get all water consumption data with scheme status information
router.get("/", async (req, res) => {
  try {
    const waterConsumptionData =
      await storage.getAllWaterConsumptionWithSchemeStatus();
    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error fetching water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get water consumption data by composite key
router.get("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const waterConsumptionData =
      await storage.getWaterConsumptionByCompositeKey(
        schemeId,
        villageName,
        esrName,
      );

    if (!waterConsumptionData) {
      return res
        .status(404)
        .json({ error: "Water consumption data not found" });
    }

    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error fetching water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Create new water consumption data
router.post("/", async (req, res) => {
  try {
    const waterConsumptionData = await storage.createWaterConsumption(req.body);
    res.status(201).json(waterConsumptionData);
  } catch (error) {
    console.error("Error creating water consumption data:", error);
    res.status(500).json({
      error: "Failed to create water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Update water consumption data
router.put("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    const waterConsumptionData = await storage.updateWaterConsumption(
      schemeId,
      villageName,
      esrName,
      req.body,
    );
    res.json(waterConsumptionData);
  } catch (error) {
    console.error("Error updating water consumption data:", error);
    res.status(500).json({
      error: "Failed to update water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Delete water consumption data
router.delete("/:schemeId/:villageName/:esrName", async (req, res) => {
  try {
    const { schemeId, villageName, esrName } = req.params;
    await storage.deleteWaterConsumption(schemeId, villageName, esrName);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting water consumption data:", error);
    res.status(500).json({
      error: "Failed to delete water consumption data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Import water consumption data from CSV
router.post("/import-csv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  const csvFilePath = req.file.path;

  try {
    console.log(`Processing CSV file: ${req.file.originalname}`);

    // Read CSV file as Buffer
    const csvBuffer = fs.readFileSync(csvFilePath);

    // Extract column mappings and other parameters from request body
    const columnMappings = req.body.columnMappings
      ? JSON.parse(req.body.columnMappings)
      : {};
    const delimiter = req.body.delimiter || ",";
    const hasHeader = req.body.hasHeader === "true";

    console.log("Column mappings:", columnMappings);
    console.log("Delimiter:", delimiter);
    console.log("Has header:", hasHeader);

    // Parse and import the CSV data with column mappings
    const result = await storage.importWaterConsumptionFromCSVWithMapping(
      csvBuffer,
      columnMappings,
      delimiter,
      hasHeader,
    );

    // Clean up uploaded file
    fs.unlinkSync(csvFilePath);

    res.json({
      message: "CSV data imported successfully",
      updatedCount: result.inserted + result.updated,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error importing CSV:", error);

    // Clean up uploaded file in case of error
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
    }

    res.status(500).json({
      error: "Failed to import CSV data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get water consumption statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await storage.getWaterConsumptionStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching water consumption stats:", error);
    res.status(500).json({
      error: "Failed to fetch water consumption statistics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get historical water consumption data with date range filtering
router.get('/historical', async (req, res) => {
  try {
    const { startDate, endDate, region, countOnly } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required parameters (format: YYYY-MM-DD)' 
      });
    }

    console.log(`📊 Historical Water Consumption query: ${startDate} to ${endDate}`);

    // Use storage's getDb() to get shared connection pool
    const db = await storage.getDb();

    try {
      // For count-only requests, just return the count
      if (countOnly === 'true') {
        let countQuery = `
          SELECT COUNT(*) as total
          FROM water_consumption_history 
          WHERE water_value IS NOT NULL
            AND data_date NOT LIKE '29-Feb%'
            AND data_date NOT LIKE '30-Feb%'
            AND data_date NOT LIKE '31-Feb%'
            AND data_date NOT LIKE '31-Apr%'
            AND data_date NOT LIKE '31-Jun%'
            AND data_date NOT LIKE '31-Sep%'
            AND data_date NOT LIKE '31-Nov%'
            AND TO_DATE(data_date || '-' || EXTRACT(YEAR FROM uploaded_at), 'DD-Mon-YYYY') 
                BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') 
                AND TO_DATE('${endDate}', 'YYYY-MM-DD')
        `;

        if (region && region !== 'all') {
          countQuery += ` AND region = '${region}'`;
        }

        const countResult = await db.execute(countQuery);
        const count = parseInt(countResult.rows[0].total);
        
        console.log(`📈 Count result: ${count} records in date range`);
        
        return res.json({ count });
      }

      // Full data query with date filtering - convert DD-MMM format to proper date for comparison
      // Exclude invalid dates like 29-Feb, 30-Feb, 31-Apr, etc.
      let query = `
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
          data_date,
          water_value,
          flow_rate_m3,
          esr_capacity,
          upload_batch_id,
          uploaded_at,
          dashboard_url
        FROM water_consumption_history 
        WHERE water_value IS NOT NULL
          AND data_date NOT LIKE '29-Feb%'
          AND data_date NOT LIKE '30-Feb%'
          AND data_date NOT LIKE '31-Feb%'
          AND data_date NOT LIKE '31-Apr%'
          AND data_date NOT LIKE '31-Jun%'
          AND data_date NOT LIKE '31-Sep%'
          AND data_date NOT LIKE '31-Nov%'
          AND TO_DATE(data_date || '-' || 
            CASE 
              WHEN EXTRACT(MONTH FROM TO_DATE(data_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
              THEN EXTRACT(YEAR FROM uploaded_at) - 1
              ELSE EXTRACT(YEAR FROM uploaded_at)
            END, 
            'DD-Mon-YYYY') 
              BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') 
              AND TO_DATE('${endDate}', 'YYYY-MM-DD')
      `;

      // Add region filter if specified
      if (region && region !== 'all') {
        query += ` AND region = '${region}'`;
      }

      query += ' ORDER BY data_date ASC, village_name ASC, esr_name ASC';

      console.log('🔍 Executing historical Water Consumption query with date filtering...');

      const result = await db.execute(query);

      console.log(`✅ Found ${result.rows.length} historical Water Consumption records`);

      res.json(result.rows);

    } catch (error) {
      console.error('Error in historical query:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error fetching historical Water Consumption data:', error);
    res.status(500).json({ error: 'Failed to fetch historical Water Consumption data' });
  }
});

// Download historical water consumption data with date range filtering
router.get('/download/water-consumption-history', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      region, 
      scheme_id, 
      village_name,
      esr_name,
      format = 'xlsx' 
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required parameters (format: YYYY-MM-DD)' 
      });
    }

    console.log(`📥 Water Consumption historical export request: startDate=${startDate}, endDate=${endDate}, region=${region}`);

    // Use storage's getDb() to get shared connection pool
    const db = await storage.getDb();

    try {
      console.log(`📅 Date range: ${startDate} to ${endDate}`);

      // Build query with proper date comparison - convert DD-MMM format to proper date
      // Exclude invalid dates like 29-Feb, 30-Feb, 31-Apr, etc.
      let query = `
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
          data_date,
          water_value,
          flow_rate_m3,
          esr_capacity,
          upload_batch_id,
          uploaded_at,
          dashboard_url
        FROM water_consumption_history 
        WHERE water_value IS NOT NULL
          AND data_date NOT LIKE '29-Feb%'
          AND data_date NOT LIKE '30-Feb%'
          AND data_date NOT LIKE '31-Feb%'
          AND data_date NOT LIKE '31-Apr%'
          AND data_date NOT LIKE '31-Jun%'
          AND data_date NOT LIKE '31-Sep%'
          AND data_date NOT LIKE '31-Nov%'
          AND TO_DATE(data_date || '-' || 
            CASE 
              WHEN EXTRACT(MONTH FROM TO_DATE(data_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
              THEN EXTRACT(YEAR FROM uploaded_at) - 1
              ELSE EXTRACT(YEAR FROM uploaded_at)
            END, 
            'DD-Mon-YYYY') 
              BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') 
              AND TO_DATE('${endDate}', 'YYYY-MM-DD')
      `;

      // Add region filter
      if (region && region !== 'all') {
        query += ` AND region = '${region}'`;
      }

      // Add scheme filter
      if (scheme_id) {
        query += ` AND scheme_id = '${scheme_id}'`;
      }

      // Add village filter
      if (village_name) {
        query += ` AND village_name = '${village_name}'`;
      }

      // Add ESR filter
      if (esr_name) {
        query += ` AND esr_name = '${esr_name}'`;
      }

      query += ' ORDER BY data_date ASC, village_name ASC, esr_name ASC';

      console.log('🔍 Executing Water Consumption historical export query...');

      const result = await db.execute(query);

      console.log(`✅ Found ${result.rows.length} records for export`);

      // Transform data: Group by ESR and pivot dates into columns
      interface ESRData {
        region: string;
        circle: string;
        division: string;
        sub_division: string;
        block: string;
        scheme_id: string;
        scheme_name: string;
        village_name: string;
        esr_name: string;
        esr_capacity: string;
        flow_rate_m3: string;
        dates: { [date: string]: number };
      }

      const esrMap = new Map<string, ESRData>();
      const allDates = new Set<string>();

      // Group data by ESR and collect all unique dates
      result.rows.forEach((row: any) => {
        const esrKey = `${row.scheme_id}|${row.village_name}|${row.esr_name}`;
        
        if (!esrMap.has(esrKey)) {
          esrMap.set(esrKey, {
            region: row.region || '',
            circle: row.circle || '',
            division: row.division || '',
            sub_division: row.sub_division || '',
            block: row.block || '',
            scheme_id: row.scheme_id || '',
            scheme_name: row.scheme_name || '',
            village_name: row.village_name || '',
            esr_name: row.esr_name || '',
            esr_capacity: row.esr_capacity ? parseFloat(row.esr_capacity).toFixed(2) : '',
            flow_rate_m3: row.flow_rate_m3 ? parseFloat(row.flow_rate_m3).toFixed(2) : '',
            dates: {}
          });
        }

        const esrData = esrMap.get(esrKey)!;
        const dateStr = row.data_date || '';
        if (dateStr) {
          allDates.add(dateStr);
          esrData.dates[dateStr] = row.water_value ? parseFloat(row.water_value) : 0;
        }
      });

      // Sort dates chronologically
      const sortedDates = Array.from(allDates).sort((a, b) => {
        // Parse dates in format DD-MMM (e.g., "01-Jan", "15-Feb")
        const parseDate = (dateStr: string) => {
          const [day, month] = dateStr.split('-');
          const monthMap: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          return new Date(2024, monthMap[month] || 0, parseInt(day) || 1);
        };
        return parseDate(a).getTime() - parseDate(b).getTime();
      });

      console.log(`📅 Found ${sortedDates.length} unique dates: ${sortedDates.join(', ')}`);
      console.log(`🏢 Found ${esrMap.size} unique ESRs`);

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Water Consumption History');

      // Build header row
      const headers = [
        'Region', 'Circle', 'Division', 'Sub Division', 'Block',
        'Scheme ID', 'Scheme Name', 'Village Name', 'ESR Name',
        'ESR Capacity (m³)', 'Flow Rate (m³)'
      ];
      
      // Add date columns to headers
      sortedDates.forEach(date => {
        headers.push(date);
      });

      // Set headers
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Set column widths
      worksheet.columns = headers.map((header, index) => ({
        width: index < 11 ? (index === 6 ? 30 : index === 7 || index === 8 ? 25 : 15) : 12
      }));

      // Add data rows
      esrMap.forEach((esrData) => {
        const rowData = [
          esrData.region,
          esrData.circle,
          esrData.division,
          esrData.sub_division,
          esrData.block,
          esrData.scheme_id,
          esrData.scheme_name,
          esrData.village_name,
          esrData.esr_name,
          esrData.esr_capacity,
          esrData.flow_rate_m3
        ];

        // Add water consumption values for each date
        sortedDates.forEach(date => {
          const value = esrData.dates[date];
          rowData.push(value !== undefined ? value.toFixed(2) : '');
        });

        worksheet.addRow(rowData);
      });

      console.log('✅ Finished creating pivoted Excel worksheet');

      // Generate filename
      const regionText = region && region !== 'all' ? String(region).replace(/ /g, '_') : 'all_regions';
      const filename = `water_consumption_history_${regionText}_${startDate}_to_${endDate}.xlsx`;

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

      console.log(`📊 Successfully exported ${result.rows.length} records to ${filename}`);

    } catch (error) {
      console.error('Error in export query:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error exporting historical Water Consumption data:', error);
    res.status(500).json({ error: 'Failed to export historical Water Consumption data' });
  }
});

export default router;
