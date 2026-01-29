import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define column name variations to handle different Excel file formats
const COLUMN_VARIANTS = {
  schemeId: ['Scheme ID', 'scheme id', 'SchemeId', 'Scheme_ID', 'scheme_id'],
  schemeName: ['Scheme Name', 'scheme name', 'Scheme_Name', 'scheme_name'],
  totalVillages: ['Number of Village', 'No. of Village', 'Total Villages', 'Number of Villages'],
  functionalVillages: ['No. of Functional Village', 'Functional Villages', 'Functional Village', 'No. of Functional Villages'],
  partialVillages: ['No. of Partial Village', 'Partial Villages', 'Partial Village', 'No. of Partial Villages'],
  nonFunctionalVillages: ['No. of Non- Functional Village', 'No. of Non-Functional Village', 'Non-Functional Villages', 'Non Functional Villages'],
  fullyCompletedVillages: ['Fully completed Villages', 'Fully Completed Villages', 'Fully-Completed Villages'],
  totalEsr: ['Total Number of ESR', 'Total ESR', 'ESR Total'],
  schemeFunctionalStatus: ['Scheme Functional Status', 'Functional Status'],
  fullyCompletedEsr: ['No. Fully Completed ESR', 'Fully Completed ESR', 'No. of Fully Completed ESR'],
  balanceEsr: ['Balance to Complete ESR', 'Balance ESR'],
  flowMeters: ['Flow Meters Connected', ' Flow Meters Connected', 'Flow Meters Conneted', 'Flow Meter Connected'],
  pressureTransmitters: ['Pressure Transmitter Connected', 'Pressure Transmitters Connected', 'Pressure Transmitter Conneted'],
  residualChlorine: ['Residual Chlorine Connected', 'Residual Chlorine Analyzer Connected', 'Residual Chlorine Conneted'],
  schemeStatus: ['Fully completion Scheme Status', 'Scheme Status', 'Status']
};

// Field mapping to database column names
const DB_COLUMN_MAPPING = {
  schemeId: 'scheme_id',
  schemeName: 'scheme_name',
  totalVillages: 'total_villages',
  functionalVillages: 'functional_villages',
  partialVillages: 'partial_villages',
  nonFunctionalVillages: 'non_functional_villages',
  fullyCompletedVillages: 'fully_completed_villages',
  totalEsr: 'total_esr',
  schemeFunctionalStatus: 'scheme_functional_status',
  fullyCompletedEsr: 'fully_completed_esr',
  balanceEsr: 'balance_esr',
  flowMeters: 'flow_meters_connected',
  pressureTransmitters: 'pressure_transmitters_connected',
  residualChlorine: 'residual_chlorine_connected',
  schemeStatus: 'scheme_status'
};

// Function to detect region from sheet name
function detectRegionFromSheetName(sheetName) {
  const regionPatterns = [
    { pattern: /\b(Amravati)\b/i, name: 'Amravati' },
    { pattern: /\b(Nashik)\b/i, name: 'Nashik' },
    { pattern: /\b(Nagpur)\b/i, name: 'Nagpur' },
    { pattern: /\b(Pune)\b/i, name: 'Pune' },
    { pattern: /\b(Konkan)\b/i, name: 'Konkan' },
    { pattern: /\b(CS)\b/i, name: 'Chhatrapati Sambhajinagar' },
    { pattern: /\b(Sambhajinagar)\b/i, name: 'Chhatrapati Sambhajinagar' },
    { pattern: /\b(Chhatrapati)\b/i, name: 'Chhatrapati Sambhajinagar' }
  ];
  
  for (const pattern of regionPatterns) {
    if (pattern.pattern.test(sheetName)) {
      return pattern.name;
    }
  }
  
  return null;
}

// Function to map column names to our standardized field names
function mapColumnsToFields(headers) {
  const columnMapping = {};
  
  for (const header of headers) {
    if (!header) continue;
    
    for (const [fieldName, variants] of Object.entries(COLUMN_VARIANTS)) {
      if (variants.some(variant => 
        header.toLowerCase() === variant.toLowerCase() ||
        header.toLowerCase().includes(variant.toLowerCase())
      )) {
        columnMapping[header] = fieldName;
        break;
      }
    }
  }
  
  return columnMapping;
}

// Sanitize and convert values to appropriate types
function sanitizeValue(fieldName, value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convert to number for numeric fields
  const numericFields = [
    'totalVillages', 'functionalVillages', 'partialVillages', 
    'nonFunctionalVillages', 'fullyCompletedVillages', 'totalEsr', 
    'fullyCompletedEsr', 'balanceEsr', 'flowMeters', 
    'pressureTransmitters', 'residualChlorine'
  ];
  
  if (numericFields.includes(fieldName)) {
    // Convert to number and ensure it's not NaN
    const num = Number(value);
    return isNaN(num) ? 0 : num; 
  }
  
  // Special handling for scheme status
  if (fieldName === 'schemeStatus') {
    // Map status values to standardized values
    const status = String(value).trim().toLowerCase();
    if (status === 'completed' || status === 'complete' || status === 'fully completed') {
      return 'Completed';
    } else if (status === 'in progress' || status === 'in-progress' || status === 'partial') {
      return 'In Progress';
    } else if (status === 'not connected' || status === 'not-connected') {
      return 'Not-Connected';
    }
    return String(value); // Return as is if no mapping found
  }
  
  // For scheme IDs, ensure they're treated as strings
  if (fieldName === 'schemeId') {
    return String(value).trim();
  }
  
  // Default handling for text fields
  return String(value);
}

// Determine agency based on region
function getAgencyByRegion(regionName) {
  if (!regionName) return null;
  
  const region = regionName.toLowerCase();
  
  if (region.includes('amravati')) {
    return 'MJP Amravati'; 
  } else if (region.includes('nashik')) {
    return 'MJP Nashik';
  } else if (region.includes('pune')) {
    return 'MJP Pune'; 
  } else if (region.includes('nagpur')) {
    return 'MJP Nagpur';
  } else if (region.includes('konkan')) {
    return 'MJP Konkan';
  } else if (region.includes('sambhajinagar') || region.includes('cs')) {
    return 'MJP Chhatrapati Sambhajinagar';
  }
  
  return null;
}

// Main function to process Excel file
async function processExcelFile(filePath) {
  try {
    console.log(`Reading Excel file from: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    console.log(`Found ${workbook.SheetNames.length} sheets in the Excel file`);
    
    // Array to store extracted scheme data
    const schemeData = [];
    
    // Iterate through each sheet
    for (const sheetName of workbook.SheetNames) {
      // Detect region from sheet name
      const regionName = detectRegionFromSheetName(sheetName);
      console.log(`Processing sheet: ${sheetName} ${regionName ? `(Region: ${regionName})` : ''}`);
      
      const sheet = workbook.Sheets[sheetName];
      
      // Try parsing with automatic headers first
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
      
      if (jsonData && jsonData.length > 0) {
        // Map column names to our standardized fields
        const columnMapping = mapColumnsToFields(Object.keys(jsonData[0]));
        
        // Log column mapping for debugging
        console.log('Column mapping:');
        Object.entries(columnMapping).forEach(([original, mapped]) => {
          console.log(`  "${original}" → "${mapped}"`);
        });
        
        // Process each row of data
        for (const row of jsonData) {
          const mappedData = {};
          
          // Populate data fields based on column mapping
          for (const [originalCol, value] of Object.entries(row)) {
            const fieldName = columnMapping[originalCol];
            if (fieldName) {
              mappedData[fieldName] = sanitizeValue(fieldName, value);
            }
          }
          
          // Only add row if it has a scheme ID
          if (mappedData.schemeId) {
            // Set region and agency
            mappedData.regionName = regionName;
            mappedData.agency = getAgencyByRegion(regionName);
            
            // Add to collected data
            schemeData.push(mappedData);
          }
        }
      } else {
        console.log(`No data could be parsed automatically from sheet: ${sheetName}`);
        
        // Try manual parsing with row-by-row approach
        // This approach would need row-by-row matching for complex sheets
        // Skipping implementation for this basic script but could be added for robustness
      }
    }
    
    console.log(`Extracted ${schemeData.length} schemes from Excel file`);
    
    // Print sample of the data
    if (schemeData.length > 0) {
      console.log("Sample of extracted data:");
      console.log(JSON.stringify(schemeData[0], null, 2));
    }
    
    return schemeData;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return [];
  }
}

// Function to update schemes in database
async function updateSchemesInDatabase(schemeData) {
  // Create a connection pool
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log(`Connecting to database...`);
    await pool.connect();
    
    console.log(`Updating ${schemeData.length} schemes in database...`);
    let updatedCount = 0;
    
    for (const scheme of schemeData) {
      // Skip records without scheme_id
      if (!scheme.schemeId) {
        continue;
      }
      
      // Prepare database record
      const dbRecord = {};
      
      // Map fields to database columns
      for (const [fieldName, value] of Object.entries(scheme)) {
        const dbColumn = DB_COLUMN_MAPPING[fieldName];
        if (dbColumn) {
          dbRecord[dbColumn] = value;
        } else if (fieldName === 'regionName') {
          dbRecord['region_name'] = value;
        } else if (fieldName === 'agency') {
          dbRecord['agency'] = value;
        }
      }
      
      // Check if scheme exists
      const existingResult = await pool.query(
        'SELECT * FROM scheme_status WHERE scheme_id = $1',
        [scheme.schemeId]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing scheme
        const setClauses = [];
        const values = [];
        let paramCounter = 1;
        
        for (const [column, value] of Object.entries(dbRecord)) {
          setClauses.push(`${column} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        }
        
        values.push(scheme.schemeId);
        
        const query = `
          UPDATE scheme_status 
          SET ${setClauses.join(', ')} 
          WHERE scheme_id = $${paramCounter}
        `;
        
        await pool.query(query, values);
        updatedCount++;
      } else {
        // Insert new scheme
        const columns = Object.keys(dbRecord);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = columns.map(col => dbRecord[col]);
        
        const query = `
          INSERT INTO scheme_status (${columns.join(', ')})
          VALUES (${placeholders})
        `;
        
        await pool.query(query, values);
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} schemes in database`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating database:', error);
    return 0;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Function to update region summaries
async function updateRegionSummaries() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Get all distinct regions
    const regionsResult = await pool.query('SELECT DISTINCT region_name FROM scheme_status');
    const regions = regionsResult.rows.map(row => row.region_name);
    
    console.log(`Updating summaries for ${regions.length} regions...`);
    
    for (const region of regions) {
      if (!region) continue;
      
      // Get summary data for this region
      const summary = await pool.query(`
        SELECT 
          COUNT(*) as total_schemes,
          SUM(CASE WHEN scheme_status = 'Completed' THEN 1 ELSE 0 END) as completed_schemes,
          SUM(total_villages) as total_villages,
          SUM(fully_completed_villages) as fully_completed_villages,
          SUM(total_esr) as total_esr,
          SUM(fully_completed_esr) as fully_completed_esr,
          SUM(flow_meters_connected) as flow_meters,
          SUM(residual_chlorine_connected) as residual_chlorine,
          SUM(pressure_transmitters_connected) as pressure_transmitters
        FROM scheme_status
        WHERE region_name = $1
      `, [region]);
      
      const {
        total_schemes,
        completed_schemes,
        total_villages,
        fully_completed_villages,
        total_esr,
        fully_completed_esr,
        flow_meters,
        residual_chlorine,
        pressure_transmitters
      } = summary.rows[0];
      
      // Check if region exists in region table
      const regionResult = await pool.query('SELECT * FROM region WHERE region_name = $1', [region]);
      
      if (regionResult.rows.length > 0) {
        // Update existing region
        await pool.query(`
          UPDATE region SET
            total_schemes_integrated = $1,
            fully_completed_schemes = $2,
            total_villages_integrated = $3,
            fully_completed_villages = $4,
            total_esr_integrated = $5,
            fully_completed_esr = $6,
            partial_esr = $7,
            flow_meter_integrated = $8,
            rca_integrated = $9,
            pressure_transmitter_integrated = $10
          WHERE region_name = $11
        `, [
          total_schemes,
          completed_schemes,
          total_villages,
          fully_completed_villages,
          total_esr,
          fully_completed_esr,
          total_esr - fully_completed_esr,
          flow_meters,
          residual_chlorine,
          pressure_transmitters,
          region
        ]);
      } else {
        // Insert new region
        await pool.query(`
          INSERT INTO region (
            region_name,
            total_schemes_integrated,
            fully_completed_schemes,
            total_villages_integrated,
            fully_completed_villages,
            total_esr_integrated,
            fully_completed_esr,
            partial_esr,
            flow_meter_integrated,
            rca_integrated,
            pressure_transmitter_integrated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          region,
          total_schemes,
          completed_schemes,
          total_villages,
          fully_completed_villages,
          total_esr,
          fully_completed_esr,
          total_esr - fully_completed_esr,
          flow_meters,
          residual_chlorine,
          pressure_transmitters
        ]);
      }
      
      console.log(`Updated summary for ${region}`);
    }
    
    console.log('Region summaries updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating region summaries:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    // Process Excel file
    const filePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');
    const extractedData = await processExcelFile(filePath);
    
    if (extractedData.length === 0) {
      console.log('No valid data extracted from Excel file');
      return;
    }
    
    // Update database with extracted data
    const updatedCount = await updateSchemesInDatabase(extractedData);
    
    if (updatedCount > 0) {
      // Update region summaries
      await updateRegionSummaries();
    }
    
    console.log(`Excel import completed successfully. Updated ${updatedCount} schemes.`);
  } catch (error) {
    console.error('Error in import process:', error);
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error in main:', err);
  process.exit(1);
});