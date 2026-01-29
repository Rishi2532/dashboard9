/**
 * Improved LPCD Data Import
 * 
 * This script ensures proper import of water scheme data from Excel files with exact column mappings
 * and proper handling of numeric values.
 */

import xlsx from 'xlsx';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Configuration
const columnMapping = {
  // Standard mappings for region and scheme info
  'Region': 'region',
  'region': 'region',
  'Circle': 'circle',
  'circle': 'circle',
  'Division': 'division',
  'division': 'division',
  'Sub Division': 'sub_division',
  'sub_division': 'sub_division',
  'sub division': 'sub_division',
  'Block': 'block',
  'block': 'block',
  'Scheme ID': 'scheme_id',
  'Scheme Id': 'scheme_id',
  'scheme_id': 'scheme_id',
  'SchemeID': 'scheme_id',
  'scheme id': 'scheme_id',
  'Scheme Name': 'scheme_name',
  'scheme_name': 'scheme_name',
  'scheme name': 'scheme_name',
  'Village': 'village_name',
  'Village Name': 'village_name',
  'village': 'village_name',
  'village_name': 'village_name',
  'Population': 'population',
  'population': 'population',
  'Number of ESR': 'number_of_esr',
  'number_of_esr': 'number_of_esr',
  'Number ESR': 'number_of_esr',
  'ESR Count': 'number_of_esr',
  
  // Water consumption value mappings - matches different naming patterns
  'Water Consumption': 'water_value_day1',
  'Water Consumption (Latest)': 'water_value_day1', 
  'water consumption': 'water_value_day1',
  'water_value_day1': 'water_value_day1',
  'Water Value Day 1': 'water_value_day1',
  'water value day1': 'water_value_day1',
  'water value day2': 'water_value_day2',
  'water value day3': 'water_value_day3',
  'water value day4': 'water_value_day4',
  'water value day5': 'water_value_day5',
  'water value day6': 'water_value_day6',
  
  // Also accept numerical positional columns (10-16) from the Excel
  '10': 'water_value_day1',
  '11': 'water_value_day1', 
  '12': 'water_value_day2',
  '13': 'water_value_day3',
  '14': 'water_value_day4',
  '15': 'water_value_day5',
  '16': 'water_value_day6',
  
  // LPCD value mappings with multiple naming patterns
  'LPCD': 'lpcd_value_day1',
  'LPCD (Latest)': 'lpcd_value_day1',
  'lpcd': 'lpcd_value_day1',
  'lpcd_value_day1': 'lpcd_value_day1',
  'LPCD Value Day 1': 'lpcd_value_day1',
  'lpcd value day1': 'lpcd_value_day1',
  'lpcd value day2': 'lpcd_value_day2',
  'lpcd value day3': 'lpcd_value_day3',
  'lpcd value day4': 'lpcd_value_day4',
  'lpcd value day5': 'lpcd_value_day5',
  'lpcd value day6': 'lpcd_value_day6',
  'lpcd value day7': 'lpcd_value_day7',
  
  // Also accept numerical positional columns (16-23) from the Excel
  '17': 'lpcd_value_day1',
  '18': 'lpcd_value_day2',
  '19': 'lpcd_value_day3',
  '20': 'lpcd_value_day4',
  '21': 'lpcd_value_day5',
  '22': 'lpcd_value_day6',
  '23': 'lpcd_value_day7',
  
  // Date fields
  'water date day1': 'water_date_day1',
  'water date day2': 'water_date_day2',
  'water date day3': 'water_date_day3',
  'water date day4': 'water_date_day4',
  'water date day5': 'water_date_day5',
  'water date day6': 'water_date_day6',
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
  '38': 'consistent_zero_lpcd_for_a_week',
  '39': 'below_55_lpcd_count',
  '40': 'above_55_lpcd_count'
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
    if (value.trim() === '' || 
        value.toLowerCase() === 'n/a' || 
        value.toLowerCase() === 'no data recorded' ||
        value.toLowerCase() === 'no data' || 
        value.toLowerCase() === '-' ||
        value.toLowerCase() === 'nil') {
      return null;
    }
    
    // Remove any non-numeric characters except decimal point
    // This will handle values with units like '15000 L' or '70 lpcd'
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
    
    // Ensure it's actually a finite number and within reasonable limits
    // Avoid extreme values that could be errors
    if (isFinite(numValue)) {
      // For water values (typically in thousands of liters)
      if (numValue > 10000000) { // More than 10 million liters is likely an error
        console.log(`Warning: Unusually high water value: ${numValue}, setting to null`);
        return null;
      }
      
      // For LPCD values (typically 0-500)
      if (numValue > 1000) { // LPCD values over 1000 are likely errors
        // This might be a water value mistakenly mapped to LPCD
        console.log(`Warning: Unusually high LPCD value: ${numValue}, setting to null`);
        return null;
      }
      
      return numValue;
    }
    
    return null;
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

// Process Excel file and import data
async function importLpcdDataFromExcel(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    // Using raw: true to get actual numeric values where possible, but still handling strings
    const data = xlsx.utils.sheet_to_json(sheet, { 
      raw: true, 
      defval: null,
      // This ensures dates are properly parsed
      dateNF: 'yyyy-mm-dd'
    });
    
    if (!data || data.length === 0) {
      console.error('No data found in Excel file');
      return { success: false, message: 'No data found in Excel file' };
    }
    
    console.log(`Found ${data.length} rows of data in sheet: ${sheetName}`);
    
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    
    console.log('Connected to database, processing data...');
    
    // Process each row and prepare for insert
    const processedData = [];
    let skippedRows = 0;
    
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
      
      // Must have scheme_id and village_name for primary key
      if (!processedRow.scheme_id || !processedRow.village_name) {
        console.warn('Skipping row with missing scheme_id or village_name');
        skippedRows++;
        continue;
      }
      
      // Calculate derived values if not provided
      calculateDerivedValues(processedRow);
      
      processedData.push(processedRow);
    }
    
    console.log(`Processed ${processedData.length} rows, skipped ${skippedRows} rows.`);
    
    if (processedData.length === 0) {
      console.error('No valid data rows to import');
      await pool.end();
      return { success: false, message: 'No valid data rows to import' };
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
          const setClause = columns.map((col, index) => `${col} = $${index + 3}`).join(', ');
          
          const updateQuery = {
            text: `UPDATE water_scheme_data SET ${setClause} WHERE scheme_id = $1 AND village_name = $2`,
            values: [row.scheme_id, row.village_name, ...columns.map(col => row[col])]
          };
          
          await client.query(updateQuery);
          updatedCount++;
        } else {
          // Record doesn't exist, insert it
          const columns = Object.keys(row);
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
      
      return {
        success: true,
        message: `Successfully imported LPCD data: ${insertedCount} inserted, ${updatedCount} updated`,
        inserted: insertedCount,
        updated: updatedCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Error importing LPCD data:', error);
    return { success: false, message: `Error importing LPCD data: ${error.message}` };
  }
}

// Main function to run the import
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Please provide the path to the Excel file:');
    console.log('node improved-lpcd-import.js path/to/your/excel-file.xlsx');
    return;
  }
  
  try {
    const result = await importLpcdDataFromExcel(filePath);
    console.log(result);
  } catch (error) {
    console.error('Error running import:', error);
  }
}

// Run the main function if this script is executed directly
// In ES modules, we can't use require.main === module, so we use an IIFE
(async () => {
  // Only run main if this file is being run directly
  if (import.meta.url.startsWith('file:')) {
    const modulePath = new URL(import.meta.url).pathname;
    const processPath = process.argv[1] ? new URL(process.argv[1], `file://${process.cwd()}/`).pathname : '';
    if (modulePath === processPath) {
      await main();
    }
  }
})();

// Export the function for use in other modules
export { importLpcdDataFromExcel };