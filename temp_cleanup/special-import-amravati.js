/**
 * Special Import Script for Amravati Excel Data
 * 
 * This script is custom-built to handle the exact format of the Amravati Excel file,
 * with specific column positions for water values and LPCD values.
 */

import * as XLSX from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Connect to the database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

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

// Main import function
async function importAmravatiData(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, { 
      cellDates: true, 
      cellNF: false,
      cellText: false,
      raw: true // Important for numeric values 
    });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON - use all raw data
    const data = XLSX.utils.sheet_to_json(sheet, { 
      raw: true,
      defval: null,
      header: "A"  // Use A, B, C as headers to get column position
    });
    
    if (!data || data.length === 0) {
      console.error('No data found in Excel file');
      return { success: false, message: 'No data found in Excel file' };
    }
    
    console.log(`Found ${data.length} rows of data in sheet: ${sheetName}`);
    
    // Process each row and prepare for insert
    const processedData = [];
    let skippedRows = 0;
    
    for (const row of data) {
      // Skip the header row if it exists
      if (row.A === 'Region' || row.A === 'region') {
        continue;
      }
      
      // Create a processed row object with exact column mappings
      const processedRow = {
        region: row.A || null,
        circle: row.B || null,
        division: row.C || null,
        sub_division: row.D || null,
        block: row.E || null,
        scheme_id: row.F || null,
        scheme_name: row.G || null,
        village_name: row.H || null,
        population: getNumericValue(row.I),
        number_of_esr: getNumericValue(row.J),
        
        // Water values - columns K to P (11-16)
        water_value_day1: getNumericValue(row.K),
        water_value_day2: getNumericValue(row.L),
        water_value_day3: getNumericValue(row.M),
        water_value_day4: getNumericValue(row.N),
        water_value_day5: getNumericValue(row.O),
        water_value_day6: getNumericValue(row.P),
        
        // LPCD values - columns Q to W (17-23)
        lpcd_value_day1: getNumericValue(row.Q),
        lpcd_value_day2: getNumericValue(row.R),
        lpcd_value_day3: getNumericValue(row.S),
        lpcd_value_day4: getNumericValue(row.T),
        lpcd_value_day5: getNumericValue(row.U),
        lpcd_value_day6: getNumericValue(row.V),
        lpcd_value_day7: getNumericValue(row.W),
        
        // Date fields - columns X to AD (24-30)
        water_date_day1: row.X || null,
        water_date_day2: row.Y || null,
        water_date_day3: row.Z || null,
        water_date_day4: row.AA || null,
        water_date_day5: row.AB || null,
        water_date_day6: row.AC || null,
        
        // Date fields - columns AE to AK (31-37)
        lpcd_date_day1: row.AE || null,
        lpcd_date_day2: row.AF || null,
        lpcd_date_day3: row.AG || null,
        lpcd_date_day4: row.AH || null,
        lpcd_date_day5: row.AI || null,
        lpcd_date_day6: row.AJ || null,
        lpcd_date_day7: row.AK || null,
        
        // Statistics fields - columns AL to AN (38-40)
        consistent_zero_lpcd_for_a_week: getNumericValue(row.AL),
        below_55_lpcd_count: getNumericValue(row.AM),
        above_55_lpcd_count: getNumericValue(row.AN)
      };
      
      // Must have scheme_id and village_name for primary key
      if (!processedRow.scheme_id || !processedRow.village_name) {
        console.warn('Skipping row with missing scheme_id or village_name');
        skippedRows++;
        continue;
      }
      
      // Calculate derived values if not provided
      calculateDerivedValues(processedRow);
      
      // Log each row's water and LPCD values
      console.log(`Processed: ${processedRow.scheme_id} - ${processedRow.village_name} => water_value_day1: ${processedRow.water_value_day1}, lpcd_value_day1: ${processedRow.lpcd_value_day1}`);
      
      processedData.push(processedRow);
    }
    
    console.log(`Processed ${processedData.length} rows, skipped ${skippedRows} rows.`);
    
    if (processedData.length === 0) {
      console.error('No valid data rows to import');
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
          const columns = Object.keys(row).filter(key => 
            key !== 'scheme_id' && 
            key !== 'village_name' && 
            row[key] !== null && 
            row[key] !== undefined
          );
          
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
          const columns = Object.keys(row).filter(key => 
            row[key] !== null && 
            row[key] !== undefined
          );
          
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
      console.log(`Successfully imported Amravati data: ${insertedCount} inserted, ${updatedCount} updated`);
      
      return {
        success: true,
        message: `Successfully imported Amravati data: ${insertedCount} inserted, ${updatedCount} updated`,
        inserted: insertedCount,
        updated: updatedCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error importing Amravati data:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return { success: false, message: `Error processing Excel file: ${error.message}` };
  }
}

// Main function to run the import
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Please provide the path to the Excel file:');
    console.log('node special-import-amravati.js path/to/your/excel-file.xlsx');
    return;
  }
  
  try {
    const result = await importAmravatiData(filePath);
    console.log(result);
    
    // Close the database connection pool
    await pool.end();
  } catch (error) {
    console.error('Error running import:', error);
    
    // Ensure the pool is ended even if there's an error
    try {
      await pool.end();
    } catch (poolError) {
      console.error('Error closing database pool:', poolError);
    }
  }
}

// Run the main function if this is the main module
// Using ES modules approach instead of CommonJS
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { importAmravatiData };