/**
 * Import LPCD Data Routes
 * 
 * This module provides API endpoints for importing LPCD data from Excel files
 * with proper column mapping and data validation.
 */

import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { importAmravatiData } from '../../../special-import-amravati.js';

const { Pool } = pg;

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lpcd-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && (mimetype || file.mimetype === 'application/octet-stream')) {
      return cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Column mapping for Excel import
const columnMapping = {
  // Standard mappings for region and scheme info
  'Region': 'region',
  'Circle': 'circle',
  'Division': 'division',
  'Sub Division': 'sub_division',
  'Block': 'block',
  'Scheme ID': 'scheme_id',
  'Scheme Name': 'scheme_name',
  'Village Name': 'village_name',
  'Population': 'population',
  'Number of ESR': 'number_of_esr',
  
  // Water consumption value mappings - match exact columns in Excel
  // These are the exact column names from the Excel file
  'water value day1': 'water_value_day1',
  'water value day2': 'water_value_day2',
  'water value day3': 'water_value_day3',
  'water value day4': 'water_value_day4',
  'water value day5': 'water_value_day5',
  'water value day6': 'water_value_day6',
  
  // Also accept numerical positional columns (11-17) from the Excel
  '11': 'water_value_day1', 
  '12': 'water_value_day2',
  '13': 'water_value_day3',
  '14': 'water_value_day4',
  '15': 'water_value_day5',
  '16': 'water_value_day6',
  '17': 'water_value_day7',
  
  // LPCD value mappings
  'lpcd value day1': 'lpcd_value_day1',
  'lpcd value day2': 'lpcd_value_day2',
  'lpcd value day3': 'lpcd_value_day3',
  'lpcd value day4': 'lpcd_value_day4',
  'lpcd value day5': 'lpcd_value_day5',
  'lpcd value day6': 'lpcd_value_day6',
  'lpcd value day7': 'lpcd_value_day7',
  
  // Also accept numerical positional columns (18-24) from the Excel
  '18': 'lpcd_value_day1',
  '19': 'lpcd_value_day2',
  '20': 'lpcd_value_day3',
  '21': 'lpcd_value_day4',
  '22': 'lpcd_value_day5',
  '23': 'lpcd_value_day6',
  '24': 'lpcd_value_day7',
  
  // Date fields
  'water date day1': 'water_date_day1',
  'water date day2': 'water_date_day2',
  'water date day3': 'water_date_day3',
  'water date day4': 'water_date_day4',
  'water date day5': 'water_date_day5',
  'water date day6': 'water_date_day6',
  'water date day7': 'water_date_day7',
  'lpcd date day1': 'lpcd_date_day1',
  'lpcd date day2': 'lpcd_date_day2',
  'lpcd date day3': 'lpcd_date_day3',
  'lpcd date day4': 'lpcd_date_day4',
  'lpcd date day5': 'lpcd_date_day5',
  'lpcd date day6': 'lpcd_date_day6',
  'lpcd date day7': 'lpcd_date_day7',
  
  // Statistics fields - these are in columns 38-40 in the Excel
  'Consistent Zero LPCD for a week': 'consistent_zero_lpcd_for_a_week',
  'Consistent <55 LPCD for a week': 'below_55_lpcd_count',
  'Consistent >55 LPCD for a week': 'above_55_lpcd_count',
  '39': 'consistent_zero_lpcd_for_a_week',
  '40': 'below_55_lpcd_count',
  '41': 'above_55_lpcd_count'
};

// Function to safely convert various cell values to numbers
function getNumericValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // If already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string, try to convert it
  if (typeof value === 'string') {
    // Handle empty strings and non-numeric strings
    if (value.trim() === '' || value.toLowerCase() === 'n/a') {
      return null;
    }
    
    // Remove any non-numeric characters except decimal point
    const cleanedValue = value.replace(/[^0-9.]/g, '');
    if (cleanedValue === '') {
      return null;
    }
    
    // Parse to float and ensure it's a valid number
    const numValue = parseFloat(cleanedValue);
    
    // If we got NaN but had a non-empty string, it's a format issue
    if (isNaN(numValue)) {
      console.log(`Warning: Could not parse numeric value from: ${value}`);
      return null;
    }
    
    // Ensure it's actually a finite number
    return isFinite(numValue) ? numValue : null;
  }
  
  return null;
}

// Function to calculate derived values if they're not provided
function calculateDerivedValues(data) {
  // Extract LPCD values
  const lpcdValues = [
    getNumericValue(data.lpcd_value_day1),
    getNumericValue(data.lpcd_value_day2),
    getNumericValue(data.lpcd_value_day3),
    getNumericValue(data.lpcd_value_day4),
    getNumericValue(data.lpcd_value_day5),
    getNumericValue(data.lpcd_value_day6),
    getNumericValue(data.lpcd_value_day7)
  ].filter(val => val !== null);
  
  // If no LPCD values, set derived values to 0
  if (lpcdValues.length === 0) {
    data.consistent_zero_lpcd_for_a_week = 0;
    data.below_55_lpcd_count = 0;
    data.above_55_lpcd_count = 0;
    return data;
  }
  
  // Calculate consistent zero LPCD
  const allZeros = lpcdValues.every(val => val === 0);
  data.consistent_zero_lpcd_for_a_week = allZeros && lpcdValues.length >= 7 ? 1 : 0;
  
  // Special handling for all-zero values
  if (allZeros) {
    // If all values are zero, count days with zero values as "below 55"
    data.below_55_lpcd_count = lpcdValues.length;
    data.above_55_lpcd_count = 0;
  } else {
    // Normal calculation for non-zero values
    data.below_55_lpcd_count = lpcdValues.filter(val => val < 55).length;
    data.above_55_lpcd_count = lpcdValues.filter(val => val >= 55).length;
  }
  
  return data;
}

// POST endpoint to upload and import LPCD data
// Special Amravati format import
router.post('/import-amravati', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    console.log(`Processing Amravati format file: ${req.file.path}`);
    
    // Use the specialized Amravati import function
    const result = await importAmravatiData(req.file.path);
    
    // Delete the temporary file
    fs.unlinkSync(req.file.path);
    
    return res.json(result);
  } catch (error) {
    console.error('Error importing Amravati data:', error);
    
    // Try to delete the temporary file if it exists
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (unlinkError) {
      console.error('Error deleting temporary file:', unlinkError);
    }
    
    return res.status(500).json({
      message: `Error importing Amravati data: ${error.message}`,
      error: error.toString()
    });
  }
});

// Standard LPCD import
router.post('/import-lpcd', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    console.log(`Processing uploaded file: ${req.file.path}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    // Using raw: true to get actual numeric values where possible, but still handling strings
    const data = XLSX.utils.sheet_to_json(sheet, { 
      raw: true, 
      defval: null,
      // This ensures dates are properly parsed
      dateNF: 'yyyy-mm-dd'
    });
    
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'No data found in Excel file' });
    }
    
    console.log(`Found ${data.length} rows of data in sheet: ${sheetName}`);
    
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    
    // Process each row and prepare for insert
    const processedData = [];
    const skippedRows = [];
    
    for (const row of data) {
      const processedRow = {};
      
      // Map each column according to the mapping
      for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
        // Try exact match first
        if (row[excelCol] !== undefined) {
          let value = row[excelCol];
          
          // Convert numeric fields to proper numbers
          if ([
            'population', 'number_of_esr',
            'water_value_day1', 'water_value_day2', 'water_value_day3', 
            'water_value_day4', 'water_value_day5', 'water_value_day6',
            'lpcd_value_day1', 'lpcd_value_day2', 'lpcd_value_day3', 
            'lpcd_value_day4', 'lpcd_value_day5', 'lpcd_value_day6', 'lpcd_value_day7',
            'consistent_zero_lpcd_for_a_week', 'below_55_lpcd_count', 'above_55_lpcd_count'
          ].includes(dbCol)) {
            value = getNumericValue(value);
          }
          
          processedRow[dbCol] = value;
          continue; // Move to next column after successful match
        }
        
        // If exact match fails, try case-insensitive match
        const excelColCaseInsensitive = Object.keys(row).find(
          key => key.toLowerCase() === excelCol.toLowerCase()
        );
        
        if (excelColCaseInsensitive) {
          let value = row[excelColCaseInsensitive];
          
          // Convert numeric fields to proper numbers
          if ([
            'population', 'number_of_esr',
            'water_value_day1', 'water_value_day2', 'water_value_day3', 
            'water_value_day4', 'water_value_day5', 'water_value_day6',
            'lpcd_value_day1', 'lpcd_value_day2', 'lpcd_value_day3', 
            'lpcd_value_day4', 'lpcd_value_day5', 'lpcd_value_day6', 'lpcd_value_day7',
            'consistent_zero_lpcd_for_a_week', 'below_55_lpcd_count', 'above_55_lpcd_count'
          ].includes(dbCol)) {
            value = getNumericValue(value);
          }
          
          processedRow[dbCol] = value;
        }
      }
      
      // Log water and LPCD values for debugging
      console.log(`Processed record for scheme_id ${processedRow.scheme_id}, village ${processedRow.village_name}: water_value_day1=${processedRow.water_value_day1}, lpcd_value_day1=${processedRow.lpcd_value_day1}`);
      
      // Must have scheme_id and village_name for primary key
      if (!processedRow.scheme_id || !processedRow.village_name) {
        skippedRows.push({
          row: JSON.stringify(row),
          reason: 'Missing scheme_id or village_name'
        });
        continue;
      }
      
      // Calculate derived values if not provided
      calculateDerivedValues(processedRow);
      
      processedData.push(processedRow);
    }
    
    console.log(`Processed ${processedData.length} rows, skipped ${skippedRows.length} rows.`);
    
    if (processedData.length === 0) {
      return res.status(400).json({
        message: 'No valid data rows to import',
        skippedRows: skippedRows
      });
    }
    
    // Begin a transaction for the inserts
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let insertedCount = 0;
      let updatedCount = 0;
      
      for (const row of processedData) {
        // Check if the record already exists
        const checkQuery = {
          text: 'SELECT scheme_id, village_name FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
          values: [row.scheme_id, row.village_name]
        };
        
        const checkResult = await client.query(checkQuery);
        
        if (checkResult.rows.length > 0) {
          // Record exists, update it
          const columns = Object.keys(row).filter(key => key !== 'scheme_id' && key !== 'village_name');
          
          if (columns.length === 0) {
            continue; // Skip if no data to update
          }
          
          const setClause = columns.map((col, index) => `${col} = $${index + 3}`).join(', ');
          
          const updateQuery = {
            text: `UPDATE water_scheme_data SET ${setClause} WHERE scheme_id = $1 AND village_name = $2`,
            values: [row.scheme_id, row.village_name, ...columns.map(col => row[col])]
          };
          
          await client.query(updateQuery);
          updatedCount++;
        } else {
          // Record doesn't exist, insert it
          const columns = Object.keys(row).filter(key => row[key] !== null && row[key] !== undefined);
          
          if (columns.length === 0) {
            continue; // Skip if no data to insert
          }
          
          const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
          
          const insertQuery = {
            text: `INSERT INTO water_scheme_data (${columns.join(', ')}) VALUES (${placeholders})`,
            values: columns.map(col => row[col])
          };
          
          await client.query(insertQuery);
          insertedCount++;
        }
      }
      
      await client.query('COMMIT');
      console.log(`Successfully imported LPCD data: ${insertedCount} inserted, ${updatedCount} updated`);
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);
      
      return res.json({
        message: `Successfully imported LPCD data: ${insertedCount} inserted, ${updatedCount} updated`,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedRows.length,
        totalProcessed: processedData.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error importing LPCD data:', error);
      
      return res.status(500).json({
        message: `Error importing LPCD data: ${error.message}`,
        error: error.toString()
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    
    // Try to delete the temporary file
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch (unlinkError) {
      console.error('Error deleting temporary file:', unlinkError);
    }
    
    return res.status(500).json({
      message: `Error processing Excel file: ${error.message}`,
      error: error.toString()
    });
  }
});

// GET the column mapping information
router.get('/lpcd-mapping', (req, res) => {
  res.json({
    columnMapping: columnMapping,
    numericColumns: [
      'population', 'number_of_esr',
      'water_value_day1', 'water_value_day2', 'water_value_day3', 
      'water_value_day4', 'water_value_day5', 'water_value_day6',
      'lpcd_value_day1', 'lpcd_value_day2', 'lpcd_value_day3', 
      'lpcd_value_day4', 'lpcd_value_day5', 'lpcd_value_day6', 'lpcd_value_day7',
      'consistent_zero_lpcd_for_a_week', 'below_55_lpcd_count', 'above_55_lpcd_count'
    ],
    requiredColumns: ['scheme_id', 'village_name']
  });
});

export default router;