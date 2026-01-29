// Import required libraries
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import XLSX from 'xlsx';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Create all scheme data
const schemeData = [];

// Process Excel file function
async function processExcel(filePath) {
  try {
    console.log(`Reading Excel file from: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    console.log(`Found ${workbook.SheetNames.length} sheets in the Excel file`);
    
    // Iterate through each sheet
    for (const sheetName of workbook.SheetNames) {
      // Check if this sheet appears to be for a region
      const regionMatch = sheetName.match(/Region.*?(\w+)/i);
      let regionName = null;
      
      if (regionMatch) {
        regionName = regionMatch[1].trim();
        console.log(`Processing sheet: ${sheetName} for region: ${regionName}`);
      } else {
        console.log(`Processing sheet: ${sheetName} (region unknown)`);
      }
      
      // Get data from sheet
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        console.log(`No data found in sheet ${sheetName}, skipping`);
        continue;
      }
      
      console.log(`Found ${jsonData.length} rows in sheet ${sheetName}`);
      
      // Sample the first row to understand the data structure
      const sampleRow = jsonData[0];
      const headers = Object.keys(sampleRow);
      
      // Print headers for debugging
      console.log("Headers in this sheet:", headers);
      
      // Process each row
      for (const row of jsonData) {
        try {
          // Identify the columns by finding common patterns
          const regionCol = findColumn(row, ['Region']);
          const schemeIdCol = findColumn(row, ['Scheme ID', 'SchemeID', 'Scheme Id']);
          const schemeNameCol = findColumn(row, ['Scheme Name', 'SchemeName']);
          const villagesCol = findColumn(row, ['Number of Village', 'No. of Village', 'Villages']);
          const functionalVillagesCol = findColumn(row, ['Functional Village', 'No. of Functional']);
          const partialVillagesCol = findColumn(row, ['Partial Village', 'No. of Partial']);
          const nonFunctionalVillagesCol = findColumn(row, ['Non-Functional Village', 'Non- Functional']);
          const fullyCompletedVillagesCol = findColumn(row, ['Fully completed Villages']);
          const totalESRCol = findColumn(row, ['Total Number of ESR', 'ESR']);
          const statusCol = findColumn(row, ['Scheme Functional Status', 'Functional Status']);
          const fullyCompletedESRCol = findColumn(row, ['No. Fully Completed ESR', 'Fully Completed ESR']);
          const balanceESRCol = findColumn(row, ['Balance to Complete ESR', 'Balance ESR']);
          const flowMetersCol = findColumn(row, ['Flow Meters', 'Conneted']);
          const ptCol = findColumn(row, ['Pressure Transmitter', 'PT']);
          const rcaCol = findColumn(row, ['Residual Chlorine', 'RCA']);
          const schemeStatusCol = findColumn(row, ['completion Scheme Status', 'Scheme Status']);
          
          // Skip header rows (usually they have "Sr" or "No." in one of the fields)
          const isSrNoRow = Object.values(row).some(
            val => val && typeof val === 'string' && (val.includes('Sr') || val.includes('No.'))
          );
          
          if (isSrNoRow) {
            continue;
          }
          
          // Extract region name
          let extractedRegion = regionName;
          if (!extractedRegion && regionCol && row[regionCol]) {
            extractedRegion = row[regionCol];
          }
          
          // Skip rows without essential data
          if (!row[schemeIdCol] || !row[schemeNameCol]) {
            continue;
          }
          
          // Normalize region name
          if (extractedRegion) {
            if (extractedRegion.includes('Nagpur')) extractedRegion = 'Nagpur';
            else if (extractedRegion.includes('Amravati')) extractedRegion = 'Amravati';
            else if (extractedRegion.includes('Nashik')) extractedRegion = 'Nashik';
            else if (extractedRegion.includes('Pune')) extractedRegion = 'Pune';
            else if (extractedRegion.includes('Konkan')) extractedRegion = 'Konkan';
            else if (extractedRegion.includes('CS') || extractedRegion.includes('Sambhaji')) extractedRegion = 'Chhatrapati Sambhajinagar';
          }
          
          // Skip rows without region
          if (!extractedRegion) {
            continue;
          }
          
          // Extract all values
          const schemeId = row[schemeIdCol] || '';
          const schemeName = row[schemeNameCol] || '';
          const totalVillages = getNumber(row[villagesCol]);
          const functionalVillages = getNumber(row[functionalVillagesCol]);
          const partialVillages = getNumber(row[partialVillagesCol]);
          const nonFunctionalVillages = getNumber(row[nonFunctionalVillagesCol]);
          const fullyCompletedVillages = getNumber(row[fullyCompletedVillagesCol]);
          const totalESR = getNumber(row[totalESRCol]);
          const schemeFunctionalStatus = row[statusCol] || 'Partial';
          const fullyCompletedESR = getNumber(row[fullyCompletedESRCol]);
          const balanceESR = getNumber(row[balanceESRCol]);
          const flowMeters = getNumber(row[flowMetersCol]);
          const pressureTransmitters = getNumber(row[ptCol]);
          const residualChlorine = getNumber(row[rcaCol]);
          const rawSchemeStatus = row[schemeStatusCol] || 'In Progress';
          
          // Determine scheme completion status
          let schemeCompletionStatus = 'Partial';
          if (rawSchemeStatus === 'Completed' || rawSchemeStatus.includes('Complete') || schemeFunctionalStatus === 'Functional') {
            schemeCompletionStatus = 'Fully-Completed';
          } else if (schemeFunctionalStatus === 'Non-Functional') {
            schemeCompletionStatus = 'Not-Connected';
          }
          
          // Add to scheme data array
          schemeData.push({
            scheme_id: String(schemeId),
            scheme_name: String(schemeName),
            region: extractedRegion,
            total_villages: totalVillages,
            functional_villages: functionalVillages,
            partial_villages: partialVillages,
            non_functional_villages: nonFunctionalVillages,
            fully_completed_villages: fullyCompletedVillages,
            total_esr: totalESR,
            scheme_functional_status: schemeFunctionalStatus,
            fully_completed_esr: fullyCompletedESR,
            balance_esr: balanceESR || (totalESR - fullyCompletedESR),
            flow_meters_connected: flowMeters,
            pressure_transmitters_connected: pressureTransmitters,
            residual_chlorine_connected: residualChlorine,
            scheme_status: schemeCompletionStatus,
            agency: getAgencyByRegion(extractedRegion)
          });
        } catch (error) {
          console.error('Error processing row:', error);
        }
      }
    }
    
    console.log(`Extracted ${schemeData.length} schemes from Excel file`);
    return true;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return false;
  }
}

// Helper function to find a column key
function findColumn(row, possibleNames) {
  const keys = Object.keys(row);
  for (const key of keys) {
    for (const name of possibleNames) {
      if (key && typeof key === 'string' && key.includes(name)) {
        return key;
      }
    }
  }
  
  // Try alternative method - check values
  for (const key of keys) {
    const value = row[key];
    if (value && typeof value === 'string') {
      for (const name of possibleNames) {
        if (value.includes(name)) {
          return key;
        }
      }
    }
  }
  
  return null;
}

// Helper function to get numeric value
function getNumber(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numStr = value.replace(/[^0-9.-]/g, '');
    return numStr ? parseInt(numStr) : 0;
  }
  return 0;
}

// Get agency by region
function getAgencyByRegion(regionName) {
  const agencies = {
    'Nagpur': 'M/S Tata Consultancy Services',
    'Amravati': 'M/S Tata Consultancy Services',
    'Nashik': 'M/S Tata Consultancy Services',
    'Pune': 'M/S Tata Consultancy Services',
    'Konkan': 'M/S Tata Consultancy Services',
    'Chhatrapati Sambhajinagar': 'M/S Tata Consultancy Services'
  };
  
  return agencies[regionName] || 'M/S Tata Consultancy Services';
}

// Import schemes to database
async function importSchemesToDatabase() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(`Importing ${schemeData.length} schemes to database...`);
    
    // Clear existing schemes
    await pool.query('DELETE FROM scheme_status');
    console.log('Cleared existing schemes from database');
    
    // Create a single prepared statement for better performance
    const insertStmt = `
      INSERT INTO scheme_status (
        scheme_id, scheme_name, region, number_of_village, no_of_functional_village,
        no_of_partial_village, no_of_non_functional_village, fully_completed_villages,
        total_number_of_esr, scheme_functional_status, no_fully_completed_esr, balance_to_complete_esr,
        flow_meters_connected, pressure_transmitter_connected, residual_chlorine_analyzer_connected,
        fully_completion_scheme_status, agency
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
    `;
    
    // Process each scheme
    for (const scheme of schemeData) {
      try {
        await pool.query(insertStmt, [
          scheme.scheme_id, scheme.scheme_name, scheme.region,
          scheme.total_villages, scheme.functional_villages,
          scheme.partial_villages, scheme.non_functional_villages,
          scheme.fully_completed_villages, scheme.total_esr,
          scheme.scheme_functional_status, scheme.fully_completed_esr,
          scheme.balance_esr, scheme.flow_meters_connected,
          scheme.pressure_transmitters_connected, scheme.residual_chlorine_connected,
          scheme.scheme_status, scheme.agency
        ]);
        console.log(`Imported scheme: ${scheme.scheme_id} - ${scheme.scheme_name}`);
      } catch (error) {
        console.error(`Error importing scheme ${scheme.scheme_id}:`, error);
      }
    }
    
    // Update region summaries
    await updateRegionSummaries(pool);
    
    console.log('All schemes imported successfully!');
    return true;
  } catch (error) {
    console.error('Error importing schemes to database:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Update region summaries
async function updateRegionSummaries(pool) {
  console.log("Updating region summaries...");
  
  try {
    // Get all the regions
    const regionsResult = await pool.query('SELECT region_id, region_name FROM region');
    const regions = regionsResult.rows;
    
    for (const region of regions) {
      const regionName = region.region_name;
      // Calculate totals from scheme_status table
      const totalsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_schemes_integrated,
          SUM(CASE WHEN fully_completion_scheme_status = 'Fully-Completed' THEN 1 ELSE 0 END) as fully_completed_schemes,
          SUM(number_of_village) as total_villages_integrated,
          SUM(fully_completed_villages) as fully_completed_villages,
          SUM(total_number_of_esr) as total_esr_integrated,
          SUM(no_fully_completed_esr) as fully_completed_esr,
          SUM(total_number_of_esr - no_fully_completed_esr) as partial_esr,
          SUM(flow_meters_connected) as flow_meter_integrated,
          SUM(residual_chlorine_analyzer_connected) as rca_integrated,
          SUM(pressure_transmitter_connected) as pressure_transmitter_integrated
        FROM scheme_status
        WHERE region = $1
      `, [regionName]);
      
      if (totalsResult.rows.length > 0) {
        const totals = totalsResult.rows[0];
        
        // Update the region record
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
          WHERE region_id = $11
        `, [
          totals.total_schemes_integrated || 0,
          totals.fully_completed_schemes || 0,
          totals.total_villages_integrated || 0,
          totals.fully_completed_villages || 0,
          totals.total_esr_integrated || 0,
          totals.fully_completed_esr || 0,
          totals.partial_esr || 0,
          totals.flow_meter_integrated || 0,
          totals.rca_integrated || 0,
          totals.pressure_transmitter_integrated || 0,
          region.region_id
        ]);
        
        console.log(`Updated summary data for region: ${regionName}`);
      }
    }
    
    console.log("All region summaries updated successfully");
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Main execution
async function main() {
  try {
    // Path to Excel file
    const excelFilePath = path.join(__dirname, 'attached_assets', 'scheme_status_table.xlsx');
    
    // Process Excel file
    const processResult = await processExcel(excelFilePath);
    if (!processResult) {
      console.error('Failed to process Excel file');
      process.exit(1);
    }
    
    // Import data to database
    const importResult = await importSchemesToDatabase();
    if (!importResult) {
      console.error('Failed to import data to database');
      process.exit(1);
    }
    
    console.log('Data import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
}

// Run the program
main();