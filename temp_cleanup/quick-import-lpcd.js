/**
 * Quick LPCD Data Update Script
 * 
 * This script updates water consumption and LPCD values for all villages
 * directly using SQL updates rather than checks for existing records.
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
 * Main function to update LPCD data
 */
async function quickImportLpcd() {
  console.log('Starting quick LPCD data update...');
  
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
    defval: null
  });
  
  if (rawData.length === 0) {
    console.log('No data found in Excel file');
    return;
  }
  
  console.log(`Found ${rawData.length} records in Excel file`);
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    
    // Process each row individually outside of a transaction
    for (const row of rawData) {
      try {
        // Skip invalid rows
        if (!row['Scheme ID'] || !row['Village Name']) {
          continue;
        }
        
        const schemeId = row['Scheme ID'].toString();
        const villageName = row['Village Name'].toString();
        
        // Extract water and LPCD values, handling different column formats
        // Day 6 values for water and day 7 for LPCD are most important
        let waterDay6 = null;
        if (row['water value day6  '] !== undefined) {
          waterDay6 = row['water value day6  '];
        } else if (row['Water Value Day 6'] !== undefined) {
          waterDay6 = row['Water Value Day 6'];
        }
        
        let lpcdDay7 = null;
        if (row['lpcd value day7  '] !== undefined) {
          lpcdDay7 = row['lpcd value day7  '];
        } else if (row['LPCD Value Day 7'] !== undefined) {
          lpcdDay7 = row['LPCD Value Day 7'];
        }
        
        console.log(`Processing: ${schemeId} - ${villageName}`);
        console.log(`  Water day6=${waterDay6}, LPCD day7=${lpcdDay7}`);
        
        // First check if the record exists
        const checkResult = await client.query(
          'SELECT COUNT(*) FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
          [schemeId, villageName]
        );
        
        if (parseInt(checkResult.rows[0].count) > 0) {
          // Update existing record with water and LPCD values
          const updateQuery = {
            text: `
              UPDATE water_scheme_data 
              SET 
                water_value_day1 = $3,
                water_value_day2 = $4,
                water_value_day3 = $5,
                water_value_day4 = $6,
                water_value_day5 = $7,
                water_value_day6 = $8,
                lpcd_value_day1 = $9,
                lpcd_value_day2 = $10,
                lpcd_value_day3 = $11,
                lpcd_value_day4 = $12,
                lpcd_value_day5 = $13,
                lpcd_value_day6 = $14,
                lpcd_value_day7 = $15,
                water_date_day1 = $16,
                water_date_day2 = $17,
                water_date_day3 = $18,
                water_date_day4 = $19,
                water_date_day5 = $20,
                water_date_day6 = $21,
                lpcd_date_day1 = $22,
                lpcd_date_day2 = $23,
                lpcd_date_day3 = $24,
                lpcd_date_day4 = $25,
                lpcd_date_day5 = $26,
                lpcd_date_day6 = $27,
                lpcd_date_day7 = $28,
                population = $29,
                number_of_esr = $30
              WHERE scheme_id = $1 AND village_name = $2
            `,
            values: [
              schemeId,
              villageName,
              row['water value day1  '] || row['Water Value Day 1'],
              row['water value day2  '] || row['Water Value Day 2'],
              row['water value day3  '] || row['Water Value Day 3'],
              row['water value day4  '] || row['Water Value Day 4'],
              row['water value day5  '] || row['Water Value Day 5'],
              waterDay6,
              row['lpcd value day1  '] || row['LPCD Value Day 1'],
              row['lpcd value day2  '] || row['LPCD Value Day 2'],
              row['lpcd value day3  '] || row['LPCD Value Day 3'],
              row['lpcd value day4  '] || row['LPCD Value Day 4'],
              row['lpcd value day5  '] || row['LPCD Value Day 5'],
              row['lpcd value day6  '] || row['LPCD Value Day 6'],
              lpcdDay7,
              row['water date day1  '] || row['Water Date Day 1'] || '',
              row['water date day2  '] || row['Water Date Day 2'] || '',
              row['water date day3  '] || row['Water Date Day 3'] || '',
              row['water date day4  '] || row['Water Date Day 4'] || '',
              row['water date day5  '] || row['Water Date Day 5'] || '',
              row['water date day6  '] || row['Water Date Day 6'] || '',
              row['lpcd date day1  '] || row['LPCD Date Day 1'] || '',
              row['lpcd date day2  '] || row['LPCD Date Day 2'] || '',
              row['lpcd date day3  '] || row['LPCD Date Day 3'] || '',
              row['lpcd date day4  '] || row['LPCD Date Day 4'] || '',
              row['lpcd date day5  '] || row['LPCD Date Day 5'] || '',
              row['lpcd date day6  '] || row['LPCD Date Day 6'] || '',
              row['lpcd date day7  '] || row['LPCD Date Day 7'] || '',
              row['Population'] ? parseInt(row['Population']) : null,
              row['Number of ESR'] ? parseFloat(row['Number of ESR'].toString()) : null
            ]
          };
          
          await client.query(updateQuery);
          updatedCount++;
          console.log(`  Updated record for ${schemeId} - ${villageName}`);
        } else {
          // Record doesn't exist, so insert it
          const insertQuery = {
            text: `
              INSERT INTO water_scheme_data (
                scheme_id, village_name, region, circle, division, sub_division, block, scheme_name,
                water_value_day1, water_value_day2, water_value_day3, water_value_day4, water_value_day5, water_value_day6,
                lpcd_value_day1, lpcd_value_day2, lpcd_value_day3, lpcd_value_day4, lpcd_value_day5, lpcd_value_day6, lpcd_value_day7,
                water_date_day1, water_date_day2, water_date_day3, water_date_day4, water_date_day5, water_date_day6,
                lpcd_date_day1, lpcd_date_day2, lpcd_date_day3, lpcd_date_day4, lpcd_date_day5, lpcd_date_day6, lpcd_date_day7,
                population, number_of_esr
              )
              VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 
                $9, $10, $11, $12, $13, $14, 
                $15, $16, $17, $18, $19, $20, $21, 
                $22, $23, $24, $25, $26, $27, 
                $28, $29, $30, $31, $32, $33, $34, 
                $35, $36
              )
            `,
            values: [
              schemeId,
              villageName,
              row['Region'] || '',
              row['Circle'] || '',
              row['Division'] || '',
              row['Sub Division'] || '',
              row['Block'] || '',
              row['Scheme Name'] || '',
              row['water value day1  '] || row['Water Value Day 1'],
              row['water value day2  '] || row['Water Value Day 2'],
              row['water value day3  '] || row['Water Value Day 3'],
              row['water value day4  '] || row['Water Value Day 4'],
              row['water value day5  '] || row['Water Value Day 5'],
              waterDay6,
              row['lpcd value day1  '] || row['LPCD Value Day 1'],
              row['lpcd value day2  '] || row['LPCD Value Day 2'],
              row['lpcd value day3  '] || row['LPCD Value Day 3'],
              row['lpcd value day4  '] || row['LPCD Value Day 4'],
              row['lpcd value day5  '] || row['LPCD Value Day 5'],
              row['lpcd value day6  '] || row['LPCD Value Day 6'],
              lpcdDay7,
              row['water date day1  '] || row['Water Date Day 1'] || '',
              row['water date day2  '] || row['Water Date Day 2'] || '',
              row['water date day3  '] || row['Water Date Day 3'] || '',
              row['water date day4  '] || row['Water Date Day 4'] || '',
              row['water date day5  '] || row['Water Date Day 5'] || '',
              row['water date day6  '] || row['Water Date Day 6'] || '',
              row['lpcd date day1  '] || row['LPCD Date Day 1'] || '',
              row['lpcd date day2  '] || row['LPCD Date Day 2'] || '',
              row['lpcd date day3  '] || row['LPCD Date Day 3'] || '',
              row['lpcd date day4  '] || row['LPCD Date Day 4'] || '',
              row['lpcd date day5  '] || row['LPCD Date Day 5'] || '',
              row['lpcd date day6  '] || row['LPCD Date Day 6'] || '',
              row['lpcd date day7  '] || row['LPCD Date Day 7'] || '',
              row['Population'] ? parseInt(row['Population']) : null,
              row['Number of ESR'] ? parseFloat(row['Number of ESR'].toString()) : null
            ]
          };
          
          await client.query(insertQuery);
          insertedCount++;
          console.log(`  Inserted record for ${schemeId} - ${villageName}`);
        }
      } catch (error) {
        console.error(`Error processing row: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`Completed with: ${updatedCount} records updated, ${insertedCount} records inserted, ${errorCount} errors`);
    
    // Verify some data
    const verificationResult = await client.query(
      "SELECT scheme_id, village_name, water_value_day6, lpcd_value_day7 FROM water_scheme_data WHERE scheme_id = '5348540' LIMIT 10"
    );
    
    console.log('\nVerification of Scheme 5348540:');
    verificationResult.rows.forEach(row => {
      console.log(`  ${row.scheme_id} - ${row.village_name}: water_value_day6=${row.water_value_day6}, lpcd_value_day7=${row.lpcd_value_day7}`);
    });
    
  } catch (error) {
    console.error(`Database error: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the script
quickImportLpcd().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
});