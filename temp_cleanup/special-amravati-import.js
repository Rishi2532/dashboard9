/**
 * Special Amravati Data Import Script
 * 
 * This script is designed specifically for importing the Amravati region
 * Excel format with water consumption and LPCD values.
 */

import xlsx from 'xlsx';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

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
    if (value.trim() === '' || value.toLowerCase() === 'n/a' || value.toLowerCase() === 'no data recorded') {
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

/**
 * Main function to import the Amravati Excel file
 * This function handles the specific format of the Amravati Excel file
 */
async function importAmravatiData(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    
    console.log('Connected to database');
    
    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    
    // Initialize counters for total inserts and updates
    let totalInserted = 0;
    let totalUpdated = 0;
    
    // Process each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      console.log(`Processing sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = xlsx.utils.sheet_to_json(sheet, { 
        raw: true, 
        defval: null
      });
      
      if (!data || data.length === 0) {
        console.error(`No data found in sheet: ${sheetName}`);
        continue;
      }
      
      console.log(`Found ${data.length} rows in sheet: ${sheetName}`);
      
      if (data.length > 0) {
        console.log('First row sample:', JSON.stringify(data[0]).substring(0, 200));
        
        // Get the column headers to understand the structure
        const headers = Object.keys(data[0]);
        console.log('Excel headers:', headers);
      }
      
      // Start a transaction
      const client = await pool.connect();
      let sheetInserted = 0;
      let sheetUpdated = 0;
      
      try {
        await client.query('BEGIN');
        
        // Process each row
        for (const row of data) {
          // Extract data from the row
          const region = row.Region || row.region || '';
          let schemeId = row['Scheme ID'] || row['Scheme Id'] || row['SchemeID'] || row['scheme_id'] || '';
          const schemeName = row['Scheme Name'] || row['scheme_name'] || '';
          const villageName = row.Village || row.village || row['Village Name'] || row['village_name'] || '';
          
          // Skip rows without required data
          if (!schemeId || !villageName) {
            console.log('Skipping row missing scheme_id or village_name');
            continue;
          }
          
          // Clean up scheme ID (remove any non-alphanumeric characters)
          schemeId = schemeId.toString().replace(/[^a-zA-Z0-9]/g, '');
          
          // Look for water consumption and LPCD values
          // Check various possible column names
          const waterConsumption = getNumericValue(
            row['Water Consumption'] || 
            row['Water Consumption (Latest)'] || 
            row['water_value_day1'] || 
            row['Water Value Day 1'] ||
            row['water consumption'] ||
            row[10] // Positional column for water_value_day1
          );
          
          const lpcdValue = getNumericValue(
            row['LPCD'] || 
            row['LPCD (Latest)'] || 
            row['lpcd_value_day1'] || 
            row['LPCD Value Day 1'] ||
            row['lpcd'] ||
            row[16] // Positional column for lpcd_value_day1
          );
          
          console.log(
            `Row data: region=${region}, scheme_id=${schemeId}, village=${villageName}, ` +
            `water_consumption=${waterConsumption}, lpcd=${lpcdValue}`
          );
          
          // Check if record exists
          const checkResult = await client.query(
            'SELECT scheme_id FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
            [schemeId, villageName]
          );
          
          if (checkResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
              UPDATE water_scheme_data 
              SET 
                region = $1, 
                scheme_name = $2, 
                water_value_day1 = $3, 
                lpcd_value_day1 = $4
              WHERE scheme_id = $5 AND village_name = $6
            `;
            
            await client.query(updateQuery, [
              region,
              schemeName,
              waterConsumption,
              lpcdValue,
              schemeId,
              villageName
            ]);
            
            sheetUpdated++;
            console.log(`Updated record for scheme ${schemeId}, village ${villageName}`);
          } else {
            // Insert new record
            const insertQuery = `
              INSERT INTO water_scheme_data 
              (region, scheme_id, scheme_name, village_name, water_value_day1, lpcd_value_day1)
              VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            await client.query(insertQuery, [
              region,
              schemeId,
              schemeName,
              villageName,
              waterConsumption,
              lpcdValue
            ]);
            
            sheetInserted++;
            console.log(`Inserted new record for scheme ${schemeId}, village ${villageName}`);
          }
        }
        
        await client.query('COMMIT');
        console.log(`Sheet import completed: ${sheetInserted} records inserted, ${sheetUpdated} records updated`);
        
        // Update total counts
        totalInserted += sheetInserted;
        totalUpdated += sheetUpdated;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing data:', error);
      } finally {
        client.release();
      }
    }
    
    console.log(`Total import results: ${totalInserted} records inserted, ${totalUpdated} records updated`);
    
    await pool.end();
    return {
      success: true,
      message: 'Import completed successfully',
      inserted: totalInserted,
      updated: totalUpdated,
      errors: []
    };
  } catch (error) {
    console.error('Error importing data:', error);
    return {
      success: false,
      message: `Error importing data: ${error.message}`,
      inserted: 0,
      updated: 0,
      errors: [error.message]
    };
  }
}

// Main function to run the script
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Please provide the path to the Excel file:');
    console.log('node special-amravati-import.js path/to/your/excel-file.xlsx');
    return;
  }
  
  try {
    const result = await importAmravatiData(filePath);
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

export { importAmravatiData };