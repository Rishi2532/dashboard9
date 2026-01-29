import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection setup
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Map region names to their standardized format
const regionMapping = {
  'Nagpur': 'Nagpur',
  'Amravati': 'Amravati',
  'Nashik': 'Nashik',
  'Pune': 'Pune',
  'Konkan': 'Konkan',
  'CS': 'Chhatrapati Sambhajinagar',
  'Chhatrapati Sambhajinagar': 'Chhatrapati Sambhajinagar',
  'Sambhajinagar': 'Chhatrapati Sambhajinagar'
};

// Map region to prefix for scheme_id generation
const regionPrefixes = {
  'Nagpur': 'NG',
  'Amravati': 'AM',
  'Nashik': 'NS',
  'Pune': 'PN',
  'Konkan': 'KK',
  'Chhatrapati Sambhajinagar': 'CS'
};

// Function to generate a unique scheme_id
function generateSchemeId(region, existingIds, schemeName = '') {
  const prefix = regionPrefixes[region] || 'XX';
  
  // Filter existing IDs for this region
  const regionIds = existingIds.filter(id => id.startsWith(prefix));
  
  // Extract numbers from existing IDs
  const existingNumbers = regionIds.map(id => {
    const match = id.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  
  // Find the next available number
  let nextNumber = 1;
  if (existingNumbers.length > 0) {
    nextNumber = Math.max(...existingNumbers) + 1;
  }
  
  // Generate the new ID
  return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
}

async function processExcelFile(filePath) {
  let pool = null;
  
  try {
    console.log(`Processing Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    console.log(`Successfully read Excel file with ${workbook.SheetNames.length} sheets`);
    
    // Create database connection
    pool = new pg.Pool(dbConfig);
    
    // Get existing scheme IDs
    const existingSchemes = await pool.query('SELECT scheme_id, scheme_name, region_name FROM scheme_status');
    const existingIds = existingSchemes.rows.map(row => row.scheme_id);
    const existingSchemesMap = {};
    
    existingSchemes.rows.forEach(scheme => {
      const key = `${scheme.region_name}:${scheme.scheme_name}`;
      existingSchemesMap[key] = scheme.scheme_id;
    });
    
    console.log(`Found ${existingIds.length} existing scheme IDs in database`);
    
    // Process each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      // Find region name from sheet name
      let regionName = null;
      for (const key of Object.keys(regionMapping)) {
        if (sheetName.includes(key)) {
          regionName = regionMapping[key];
          break;
        }
      }
      
      // Skip sheets without a recognized region name
      if (!regionName) {
        console.log(`Skipping sheet ${sheetName} - no region name detected`);
        continue;
      }
      
      console.log(`Processing sheet: ${sheetName} for region: ${regionName}`);
      
      // Get sheet data as JSON
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      
      console.log(`Found ${jsonData.length} rows in sheet ${sheetName}`);
      
      if (jsonData.length === 0) {
        console.log(`No data found in sheet ${sheetName}, skipping`);
        continue;
      }
      
      // Analyze the sheet structure
      const sampleRow = jsonData[0];
      const headers = Object.keys(sampleRow);
      console.log("Sample headers:", headers);
      
      // Find header row with column titles
      let headerRow = null;
      let dataStartIndex = 0;
      
      for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
        const row = jsonData[i];
        // Look for rows that might contain column headers
        if (row && typeof row === 'object') {
          const values = Object.values(row).filter(v => v !== null);
          const headerKeywords = ['Sr', 'No.', 'Region', 'Scheme', 'Name', 'Village', 'ESR', 'Status'];
          
          // Check if this row looks like a header row
          const matchCount = headerKeywords.filter(keyword => 
            values.some(v => 
              typeof v === 'string' && v.includes(keyword)
            )
          ).length;
          
          if (matchCount >= 3) {
            headerRow = row;
            dataStartIndex = i + 1;
            console.log(`Found header row at index ${i}`);
            break;
          }
        }
      }
      
      // If no header row found, use column indexes
      if (!headerRow) {
        console.log("No explicit header row found, using first data row to infer structure");
        headerRow = sampleRow;
        dataStartIndex = 1;
      }
      
      // Map columns to fields
      const fieldMap = mapColumnsToFields(headerRow);
      console.log("Field mapping:", fieldMap);
      
      // Process each data row
      for (let i = dataStartIndex; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Skip empty rows or rows without a scheme name
        const schemeName = extractValue(row, fieldMap.schemeName);
        if (!schemeName) {
          continue;
        }
        
        try {
          // Check if the scheme already exists
          const schemeKey = `${regionName}:${schemeName}`;
          let schemeId = existingSchemesMap[schemeKey];
          
          if (!schemeId) {
            // Generate a new scheme ID
            schemeId = generateSchemeId(regionName, existingIds);
            existingIds.push(schemeId);
            existingSchemesMap[schemeKey] = schemeId;
            console.log(`Generated new scheme ID: ${schemeId} for scheme: ${schemeName}`);
          } else {
            console.log(`Found existing scheme ID: ${schemeId} for scheme: ${schemeName}`);
          }
          
          // Extract scheme data from row
          const totalVillages = extractNumericValue(row, fieldMap.totalVillages);
          const functionalVillages = extractNumericValue(row, fieldMap.functionalVillages);
          const partialVillages = extractNumericValue(row, fieldMap.partialVillages);
          const nonFunctionalVillages = extractNumericValue(row, fieldMap.nonFunctionalVillages);
          const fullyCompletedVillages = extractNumericValue(row, fieldMap.fullyCompletedVillages);
          const totalESR = extractNumericValue(row, fieldMap.totalESR);
          const schemeFunctionalStatus = extractValue(row, fieldMap.schemeFunctionalStatus) || 'Partial';
          const fullyCompletedESR = extractNumericValue(row, fieldMap.fullyCompletedESR);
          const balanceESR = extractNumericValue(row, fieldMap.balanceESR);
          const flowMeters = extractNumericValue(row, fieldMap.flowMeters);
          const pressureTransmitters = extractNumericValue(row, fieldMap.pressureTransmitters);
          const residualChlorine = extractNumericValue(row, fieldMap.residualChlorine);
          
          let schemeStatus = extractValue(row, fieldMap.schemeStatus) || 'In Progress';
          
          // Determine scheme completion status
          let schemeCompletionStatus = 'Partial';
          if (schemeStatus === 'Completed' || schemeFunctionalStatus === 'Functional') {
            schemeCompletionStatus = 'Fully-Completed';
          } else if (schemeFunctionalStatus === 'Non-Functional') {
            schemeCompletionStatus = 'Not-Connected';
          }
          
          // Create scheme data object
          const schemeData = {
            scheme_id: schemeId,
            scheme_name: schemeName,
            region_name: regionName,
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
            agency: 'M/S Tata Consultancy Services' // Default agency
          };
          
          // Check if scheme exists in database
          const existingScheme = await pool.query(
            'SELECT * FROM scheme_status WHERE scheme_id = $1',
            [schemeId]
          );
          
          if (existingScheme.rows.length === 0) {
            // Insert new scheme
            await pool.query(
              `INSERT INTO scheme_status (
                scheme_id, scheme_name, region_name, total_villages, functional_villages,
                partial_villages, non_functional_villages, fully_completed_villages,
                total_esr, scheme_functional_status, fully_completed_esr, balance_esr,
                flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected,
                scheme_status, agency
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
              )`,
              [
                schemeData.scheme_id, schemeData.scheme_name, schemeData.region_name,
                schemeData.total_villages, schemeData.functional_villages,
                schemeData.partial_villages, schemeData.non_functional_villages,
                schemeData.fully_completed_villages, schemeData.total_esr,
                schemeData.scheme_functional_status, schemeData.fully_completed_esr,
                schemeData.balance_esr, schemeData.flow_meters_connected,
                schemeData.pressure_transmitters_connected, schemeData.residual_chlorine_connected,
                schemeData.scheme_status, schemeData.agency
              ]
            );
            console.log(`Inserted new scheme: ${schemeName} with ID ${schemeId}`);
          } else {
            // Update existing scheme
            await pool.query(
              `UPDATE scheme_status SET
                scheme_name = $1,
                total_villages = $2,
                functional_villages = $3,
                partial_villages = $4,
                non_functional_villages = $5,
                fully_completed_villages = $6,
                total_esr = $7,
                scheme_functional_status = $8,
                fully_completed_esr = $9,
                balance_esr = $10,
                flow_meters_connected = $11,
                pressure_transmitters_connected = $12,
                residual_chlorine_connected = $13,
                scheme_status = $14,
                agency = $15
              WHERE scheme_id = $16`,
              [
                schemeData.scheme_name,
                schemeData.total_villages, schemeData.functional_villages,
                schemeData.partial_villages, schemeData.non_functional_villages,
                schemeData.fully_completed_villages, schemeData.total_esr,
                schemeData.scheme_functional_status, schemeData.fully_completed_esr,
                schemeData.balance_esr, schemeData.flow_meters_connected,
                schemeData.pressure_transmitters_connected, schemeData.residual_chlorine_connected,
                schemeData.scheme_status, schemeData.agency, schemeData.scheme_id
              ]
            );
            console.log(`Updated existing scheme: ${schemeName} with ID ${schemeId}`);
          }
        } catch (error) {
          console.error(`Error processing scheme ${schemeName}:`, error);
        }
      }
    }
    
    // Update region summaries
    await updateRegionSummaries(pool);
    
    console.log("Excel import completed successfully");
    return true;
  } catch (error) {
    console.error("Error processing Excel file:", error);
    return false;
  } finally {
    // Close the database connection
    if (pool) {
      await pool.end();
    }
  }
}

// Helper function to map columns to fields
function mapColumnsToFields(headerRow) {
  const fieldMap = {
    schemeName: null,
    totalVillages: null,
    functionalVillages: null,
    partialVillages: null,
    nonFunctionalVillages: null,
    fullyCompletedVillages: null,
    totalESR: null,
    schemeFunctionalStatus: null,
    fullyCompletedESR: null,
    balanceESR: null,
    flowMeters: null,
    pressureTransmitters: null,
    residualChlorine: null,
    schemeStatus: null
  };
  
  // Map common column identifiers to field names
  const columnMapping = {
    schemeName: ['Scheme Name', 'SCHEME NAME', 'Name of the Scheme', 'Scheme'],
    totalVillages: ['No. of Village', 'Number of Village', 'Total Villages', 'Villages'],
    functionalVillages: ['No. of Functional Village', 'Functional Villages', 'Functional'],
    partialVillages: ['No. of Partial Village', 'Partial Villages', 'Partial'],
    nonFunctionalVillages: ['No. of Non- Functional Village', 'Non-Functional Villages', 'Non Functional'],
    fullyCompletedVillages: ['Fully completed Villages', 'Completed Villages'],
    totalESR: ['Total Number of ESR', 'ESR', 'Total ESR'],
    schemeFunctionalStatus: ['Scheme Functional Status', 'Functional Status'],
    fullyCompletedESR: ['No. Fully Completed ESR', 'Completed ESR', 'Fully Completed ESR'],
    balanceESR: ['Balance to Complete ESR', 'Balance ESR'],
    flowMeters: ['Flow Meters Conneted', 'Flow Meters', 'Flow Meter'],
    pressureTransmitters: ['Pressure Transmitter Conneted', 'Pressure Transmitters', 'PT'],
    residualChlorine: ['Residual Chlorine Conneted', 'RCA', 'Chlorine'],
    schemeStatus: ['Fully completion Scheme Status', 'Scheme Status', 'Status']
  };
  
  // Try to find matches in the header
  for (const [field, possibleNames] of Object.entries(columnMapping)) {
    // First try exact matches
    for (const key of Object.keys(headerRow)) {
      const value = headerRow[key];
      if (value && typeof value === 'string') {
        for (const possibleName of possibleNames) {
          if (value.includes(possibleName)) {
            fieldMap[field] = key;
            break;
          }
        }
        if (fieldMap[field]) break;
      }
    }
    
    // If no match found, try with column names containing field names
    if (!fieldMap[field]) {
      for (const key of Object.keys(headerRow)) {
        if (key.includes('Scheme') && field === 'schemeName') {
          fieldMap[field] = key;
          break;
        } else if (key.includes('Village') && field === 'totalVillages') {
          fieldMap[field] = key;
          break;
        } else if (key.includes('ESR') && field === 'totalESR') {
          fieldMap[field] = key;
          break;
        } else if (key.includes('Flow') && field === 'flowMeters') {
          fieldMap[field] = key;
          break;
        } else if (key.includes('Pressure') && field === 'pressureTransmitters') {
          fieldMap[field] = key;
          break;
        } else if (key.includes('Chlorine') && field === 'residualChlorine') {
          fieldMap[field] = key;
          break;
        } else if (key.includes('Status') && field === 'schemeStatus') {
          fieldMap[field] = key;
          break;
        }
      }
    }
    
    // If still no match, use common column positions
    if (!fieldMap[field]) {
      if (field === 'schemeName' && 'Column8' in headerRow) {
        fieldMap[field] = 'Column8';
      } else if (field === 'totalVillages' && 'Column9' in headerRow) {
        fieldMap[field] = 'Column9';
      } else if (field === 'functionalVillages' && 'Column10' in headerRow) {
        fieldMap[field] = 'Column10';
      } else if (field === 'partialVillages' && 'Column11' in headerRow) {
        fieldMap[field] = 'Column11';
      } else if (field === 'nonFunctionalVillages' && 'Column12' in headerRow) {
        fieldMap[field] = 'Column12';
      } else if (field === 'fullyCompletedVillages' && 'Column13' in headerRow) {
        fieldMap[field] = 'Column13';
      } else if (field === 'totalESR' && 'Column14' in headerRow) {
        fieldMap[field] = 'Column14';
      } else if (field === 'schemeFunctionalStatus' && 'Column15' in headerRow) {
        fieldMap[field] = 'Column15';
      } else if (field === 'fullyCompletedESR' && 'Column16' in headerRow) {
        fieldMap[field] = 'Column16';
      } else if (field === 'balanceESR' && 'Column17' in headerRow) {
        fieldMap[field] = 'Column17';
      } else if (field === 'flowMeters' && 'Column18' in headerRow) {
        fieldMap[field] = 'Column18';
      } else if (field === 'pressureTransmitters' && 'Column19' in headerRow) {
        fieldMap[field] = 'Column19';
      } else if (field === 'residualChlorine' && 'Column20' in headerRow) {
        fieldMap[field] = 'Column20';
      } else if (field === 'schemeStatus' && 'Column21' in headerRow) {
        fieldMap[field] = 'Column21';
      }
    }
  }
  
  return fieldMap;
}

// Helper function to extract values from rows
function extractValue(row, field) {
  if (!field || !row) return null;
  return row[field] !== undefined ? row[field] : null;
}

// Helper function to extract numeric values
function extractNumericValue(row, field) {
  const value = extractValue(row, field);
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

// Function to update region summaries
async function updateRegionSummaries(dbPool) {
  console.log("Updating region summaries...");
  
  try {
    // Get all the regions
    const regionsResult = await dbPool.query('SELECT region_name FROM region');
    const regions = regionsResult.rows.map(row => row.region_name);
    
    for (const region of regions) {
      // Calculate totals from scheme_status table
      const totalsResult = await dbPool.query(`
        SELECT 
          COUNT(*) as total_schemes_integrated,
          SUM(CASE WHEN scheme_status = 'Fully-Completed' THEN 1 ELSE 0 END) as fully_completed_schemes,
          SUM(total_villages) as total_villages_integrated,
          SUM(fully_completed_villages) as fully_completed_villages,
          SUM(total_esr) as total_esr_integrated,
          SUM(fully_completed_esr) as fully_completed_esr,
          SUM(total_esr - fully_completed_esr) as partial_esr,
          SUM(flow_meters_connected) as flow_meter_integrated,
          SUM(residual_chlorine_connected) as rca_integrated,
          SUM(pressure_transmitters_connected) as pressure_transmitter_integrated
        FROM scheme_status
        WHERE region_name = $1
      `, [region]);
      
      if (totalsResult.rows.length > 0) {
        const totals = totalsResult.rows[0];
        
        // Update the region record
        await dbPool.query(`
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
          region
        ]);
        
        console.log(`Updated summary data for region: ${region}`);
      }
    }
    
    console.log("All region summaries updated successfully");
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Path to the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'scheme_status_table.xlsx');

// Run the import function
console.log(`Starting import process for Excel file: ${filePath}`);
processExcelFile(filePath)
  .then(success => {
    if (success) {
      console.log("Excel data import completed successfully");
      process.exit(0);
    } else {
      console.error("Excel data import failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unhandled error in import script:", error);
    process.exit(1);
  });