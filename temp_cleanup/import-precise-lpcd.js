/**
 * Precise LPCD Data Import Script
 * 
 * This script is specifically designed to import LPCD data from Excel
 * while preserving exact decimal precision for water consumption and LPCD values.
 */

import XLSX from 'xlsx';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Excel file path
const excelFilePath = path.join(__dirname, 'attached_assets', 'new_lpcd.xlsx');

/**
 * Get numeric value from Excel cell with precise decimal handling
 * @param {*} value - The raw value from Excel
 * @returns {number|null} - Precise number or null if invalid
 */
function getPreciseNumericValue(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  // Check if it's already a number
  if (typeof value === 'number') {
    // Convert to string then back to number to ensure precise representation
    return parseFloat(value.toString());
  }
  
  // Try parsing string values
  if (typeof value === 'string') {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    if (cleanValue === '') {
      return null;
    }
    return parseFloat(cleanValue);
  }
  
  return null;
}

/**
 * Main function to import LPCD data
 */
async function importPreciseLpcdData() {
  console.log('Starting precise LPCD data import...');
  
  // Check if the Excel file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Excel file not found: ${excelFilePath}`);
    return;
  }
  
  // Read Excel file
  console.log(`Reading Excel file: ${excelFilePath}`);
  const workbook = XLSX.readFile(excelFilePath);
  
  // Get sheet names
  const sheetNames = workbook.SheetNames;
  console.log(`Found sheets: ${sheetNames.join(', ')}`);
  
  if (sheetNames.length === 0) {
    console.error('No sheets found in Excel file');
    return;
  }
  
  // Use first sheet by default
  const sheetName = sheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with raw values to preserve numbers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    raw: true,
    defval: null,
    dateNF: 'yyyy-mm-dd'
  });
  
  if (rawData.length === 0) {
    console.log('No data found in Excel file');
    return;
  }
  
  console.log(`Found ${rawData.length} records in Excel file`);
  console.log('First row headers:', Object.keys(rawData[0]));
  
  // Print some example data values to help with debugging
  if (rawData.length > 0) {
    const sampleRow = rawData[0];
    console.log('Sample data for first row:');
    for (const key of Object.keys(sampleRow)) {
      if (key.includes('value')) {
        console.log(`  ${key}: ${sampleRow[key]} (${typeof sampleRow[key]})`);
      }
    }
  }
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Start transaction
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Clear existing data before importing new data
    console.log('Truncating water_scheme_data table to ensure clean import...');
    await client.query('TRUNCATE water_scheme_data;');
    
    // Process each row
    for (const row of rawData) {
      try {
        // Extract required fields with proper type conversion
        const schemeData = {
          region: row['Region'] || '',
          circle: row['Circle'] || '',
          division: row['Division'] || '',
          sub_division: row['Sub Division'] || '',
          block: row['Block'] || '',
          scheme_id: row['Scheme ID'] || '',
          scheme_name: row['Scheme Name'] || '',
          village_name: row['Village Name'] || '',
          population: row['Population'] ? parseInt(row['Population']) : null,
          number_of_esr: getPreciseNumericValue(row['Number of ESR']),
          
          // Water values - preserve exact decimal precision
          // Handle different possible column names with trimming
          water_value_day1: getPreciseNumericValue(row['water value day1  '] || row['Water Value Day 1']),
          water_value_day2: getPreciseNumericValue(row['water value day2  '] || row['Water Value Day 2']),
          water_value_day3: getPreciseNumericValue(row['water value day3  '] || row['Water Value Day 3']),
          water_value_day4: getPreciseNumericValue(row['water value day4  '] || row['Water Value Day 4']),
          water_value_day5: getPreciseNumericValue(row['water value day5  '] || row['Water Value Day 5']),
          water_value_day6: getPreciseNumericValue(row['water value day6  '] || row['Water Value Day 6']),
          
          // LPCD values - preserve exact decimal precision
          lpcd_value_day1: getPreciseNumericValue(row['lpcd value day1  '] || row['LPCD Value Day 1']),
          lpcd_value_day2: getPreciseNumericValue(row['lpcd value day2  '] || row['LPCD Value Day 2']),
          lpcd_value_day3: getPreciseNumericValue(row['lpcd value day3  '] || row['LPCD Value Day 3']),
          lpcd_value_day4: getPreciseNumericValue(row['lpcd value day4  '] || row['LPCD Value Day 4']),
          lpcd_value_day5: getPreciseNumericValue(row['lpcd value day5  '] || row['LPCD Value Day 5']),
          lpcd_value_day6: getPreciseNumericValue(row['lpcd value day6  '] || row['LPCD Value Day 6']),
          lpcd_value_day7: getPreciseNumericValue(row['lpcd value day7  '] || row['LPCD Value Day 7']),
          
          // Date values
          water_date_day1: row['water date day1  '] || row['Water Date Day 1'] || '',
          water_date_day2: row['water date day2  '] || row['Water Date Day 2'] || '',
          water_date_day3: row['water date day3  '] || row['Water Date Day 3'] || '',
          water_date_day4: row['water date day4  '] || row['Water Date Day 4'] || '',
          water_date_day5: row['water date day5  '] || row['Water Date Day 5'] || '',
          water_date_day6: row['water date day6  '] || row['Water Date Day 6'] || '',
          
          lpcd_date_day1: row['lpcd date day1  '] || row['LPCD Date Day 1'] || '',
          lpcd_date_day2: row['lpcd date day2  '] || row['LPCD Date Day 2'] || '',
          lpcd_date_day3: row['lpcd date day3  '] || row['LPCD Date Day 3'] || '',
          lpcd_date_day4: row['lpcd date day4  '] || row['LPCD Date Day 4'] || '',
          lpcd_date_day5: row['lpcd date day5  '] || row['LPCD Date Day 5'] || '',
          lpcd_date_day6: row['lpcd date day6  '] || row['LPCD Date Day 6'] || '',
          lpcd_date_day7: row['lpcd date day7  '] || row['LPCD Date Day 7'] || '',
          
          // Derived values
          consistent_zero_lpcd_for_a_week: row['Consistent Zero LPCD for a week'] === true || 
                                          row['Consistent Zero LPCD for a week'] === 1 ? 1 : 0,
          below_55_lpcd_count: row['Consistent <55 LPCD for a week'] ? 1 : 0,
          above_55_lpcd_count: row['Consistent >55 LPCD for a week'] ? 1 : 0
        };
        
        // Skip if scheme_id or village_name is missing
        if (!schemeData.scheme_id || !schemeData.village_name) {
          console.log('Skipping row: missing scheme_id or village_name');
          continue;
        }
        
        // Print values with exact precision for debugging
        console.log(`Scheme: ${schemeData.scheme_id}, Village: ${schemeData.village_name}`);
        console.log(`  Water day6: ${schemeData.water_value_day6}`);
        console.log(`  LPCD day7: ${schemeData.lpcd_value_day7}`);
        
        // Create columns and values arrays for INSERT query
        const columns = Object.keys(schemeData);
        const values = Object.values(schemeData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        // Insert data
        const insertQuery = {
          text: `INSERT INTO water_scheme_data (${columns.join(', ')}) VALUES (${placeholders})`,
          values: values
        };
        
        await client.query(insertQuery);
        insertedCount++;
        
        console.log(`Inserted record #${insertedCount}: ${schemeData.scheme_id} - ${schemeData.village_name}`);
        
      } catch (error) {
        console.error(`Error processing row: ${error.message}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Successfully imported LPCD data: ${insertedCount} records inserted`);
    console.log('Precise decimal values have been preserved for water consumption and LPCD values');
    
    // Verify some sample data
    const sampleResult = await client.query('SELECT scheme_id, village_name, water_value_day6, lpcd_value_day7 FROM water_scheme_data LIMIT 5');
    console.log('Sample data after import:');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.scheme_id} - ${row.village_name}: water_value_day6=${row.water_value_day6}, lpcd_value_day7=${row.lpcd_value_day7}`);
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error(`Error importing LPCD data: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the script
importPreciseLpcdData().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});