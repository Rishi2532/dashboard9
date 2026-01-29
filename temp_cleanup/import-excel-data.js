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

const pool = new pg.Pool(dbConfig);

// Map region names to their standardized format
const regionMapping = {
  'Nagpur': 'Nagpur',
  'Amravati': 'Amravati',
  'Nashik': 'Nashik',
  'Pune': 'Pune',
  'Konkan': 'Konkan',
  'CS': 'Chhatrapati Sambhajinagar',
  'Chhatrapati Sambhajinagar': 'Chhatrapati Sambhajinagar'
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
function generateSchemeId(region, schemeName, existingIds) {
  const prefix = regionPrefixes[region] || 'XX';
  let counter = 1;
  
  // Get the existing numbers for this region
  const existingNumbers = existingIds
    .filter(id => id.startsWith(prefix))
    .map(id => {
      const match = id.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));
  
  // Find the next available number
  if (existingNumbers.length > 0) {
    counter = Math.max(...existingNumbers) + 1;
  }
  
  return `${prefix}-${counter.toString().padStart(3, '0')}`;
}

// Function to read Excel file and map data
async function readExcelAndImportData(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // List all sheets
    console.log("Available sheets in the Excel file:");
    workbook.SheetNames.forEach((name) => {
      console.log(`- ${name}`);
    });
    
    // Get existing scheme IDs from the database
    const existingIdsResult = await pool.query('SELECT scheme_id FROM scheme_status');
    const existingIds = existingIdsResult.rows.map(row => row.scheme_id);
    console.log(`Found ${existingIds.length} existing scheme IDs in the database`);
    
    // Process each region sheet
    for (const sheetName of workbook.SheetNames) {
      // Extract region name from sheet name
      let regionName = sheetName.replace(' Datalink', '').trim();
      
      // Skip non-region sheets
      if (!Object.keys(regionMapping).some(key => regionName.includes(key))) {
        console.log(`Skipping sheet ${sheetName} - not a recognized region`);
        continue;
      }
      
      // Normalize region name
      for (const [key, value] of Object.entries(regionMapping)) {
        if (regionName.includes(key)) {
          regionName = value;
          break;
        }
      }
      
      console.log(`\nProcessing sheet for region: ${regionName}`);
      
      // Get the data from the sheet
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`Found ${jsonData.length} rows in ${sheetName}`);
      
      if (jsonData.length === 0) {
        console.log(`No data found in ${sheetName}, skipping`);
        continue;
      }
      
      // Print sample headers for debugging
      console.log("Excel headers from this sheet:");
      const sampleHeaders = Object.keys(jsonData[0]);
      sampleHeaders.forEach(header => {
        console.log(`- "${header}"`);
      });
      
      // Define field mappings based on the actual headers in the Excel file
      // This may need adjustment based on your actual Excel file structure
      const fieldMapping = {
        schemeName: sampleHeaders.find(h => h.includes('Scheme Name') || h.includes('scheme name')),
        totalVillages: sampleHeaders.find(h => h.includes('Total Villages')),
        functionalVillages: sampleHeaders.find(h => h.includes('Functional Villages')),
        partialVillages: sampleHeaders.find(h => h.includes('Partial Villages')),
        nonFunctionalVillages: sampleHeaders.find(h => h.includes('Non-Functional Villages')),
        fullyCompletedVillages: sampleHeaders.find(h => h.includes('Fully Completed Villages')),
        totalESR: sampleHeaders.find(h => h.includes('Total ESR')),
        schemeStatus: sampleHeaders.find(h => h.includes('Scheme Status')),
        fullyCompletedESR: sampleHeaders.find(h => h.includes('Fully Completed ESR')),
        balanceESR: sampleHeaders.find(h => h.includes('Balance ESR')),
        flowMeters: sampleHeaders.find(h => 
          h.includes('Flow Meter') || 
          h.includes('flow meter') || 
          h.includes('Flow_Meter') || 
          h.includes('Flowmeter') || 
          h.includes('flowmeter') || 
          h.includes('Flow Meters') || 
          h.includes('flow meters') ||
          h.includes('Flow_Meters') ||
          h.includes('Flow Meters Connected') ||
          h.includes('Flow_Meters_Connected')),
        rca: sampleHeaders.find(h => 
          h.includes('RCA') || 
          h.includes('rca') || 
          h.includes('Residual Chlorine') || 
          h.includes('residual chlorine') || 
          h.includes('Residual_Chlorine') || 
          h.includes('Chlorine Analyzer') || 
          h.includes('chlorine analyzer') ||
          h.includes('Chlorine_Analyzer') ||
          h.includes('Residual Chlorine Connected') ||
          h.includes('Residual_Chlorine_Connected')),
        pressureTransmitters: sampleHeaders.find(h => 
          h.includes('Pressure Transmitter') || 
          h.includes('pressure transmitter') || 
          h.includes('Pressure_Transmitter') || 
          h.includes('Pressure Transmitters') || 
          h.includes('pressure transmitters') ||
          h.includes('Pressure_Transmitters') ||
          h.includes('Pressure Transmitters Connected') ||
          h.includes('Pressure_Transmitters_Connected') ||
          h.includes('PT') || 
          h.includes('pressure sensor')),
        agency: sampleHeaders.find(h => h.includes('Agency') || h.includes('agency'))
      };
      
      console.log("Field mappings:");
      Object.entries(fieldMapping).forEach(([key, value]) => {
        console.log(`- ${key}: ${value || 'Not found'}`);
      });
      
      // Process each row of data
      for (const row of jsonData) {
        try {
          // Skip rows without a scheme name
          if (!row[fieldMapping.schemeName]) {
            console.log("Skipping row without scheme name");
            continue;
          }
          
          const schemeName = row[fieldMapping.schemeName];
          
          // Check if scheme already exists in the database
          const existingSchemeResult = await pool.query(
            'SELECT * FROM scheme_status WHERE scheme_name = $1 AND region_name = $2',
            [schemeName, regionName]
          );
          
          let schemeId;
          let isNewScheme = false;
          
          if (existingSchemeResult.rows.length > 0) {
            schemeId = existingSchemeResult.rows[0].scheme_id;
            console.log(`Found existing scheme: ${schemeName} with ID: ${schemeId}`);
          } else {
            // Generate a new scheme_id
            schemeId = generateSchemeId(regionName, schemeName, existingIds);
            existingIds.push(schemeId); // Add to our tracking list
            isNewScheme = true;
            console.log(`Generated new scheme ID: ${schemeId} for scheme: ${schemeName}`);
          }
          
          // Extract data from the row using our mappings
          const schemeData = {
            scheme_id: schemeId,
            scheme_name: schemeName,
            region_name: regionName,
            total_villages: row[fieldMapping.totalVillages] || 0,
            functional_villages: row[fieldMapping.functionalVillages] || 0,
            partial_villages: row[fieldMapping.partialVillages] || 0,
            non_functional_villages: row[fieldMapping.nonFunctionalVillages] || 0,
            fully_completed_villages: row[fieldMapping.fullyCompletedVillages] || 0,
            total_esr: row[fieldMapping.totalESR] || 0,
            scheme_functional_status: 'Functional', // Default value
            fully_completed_esr: row[fieldMapping.fullyCompletedESR] || 0,
            balance_esr: row[fieldMapping.balanceESR] || 0,
            flow_meters_connected: row[fieldMapping.flowMeters] || 0,
            pressure_transmitters_connected: row[fieldMapping.pressureTransmitters] || 0,
            residual_chlorine_connected: row[fieldMapping.rca] || 0,
            scheme_status: row[fieldMapping.schemeStatus] || 'Partial',
            agency: row[fieldMapping.agency] || null
          };
          
          // Insert or update the database
          if (isNewScheme) {
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
            console.log(`Inserted new scheme: ${schemeName}`);
          } else {
            // Update existing scheme
            await pool.query(
              `UPDATE scheme_status SET
                total_villages = $1,
                functional_villages = $2,
                partial_villages = $3,
                non_functional_villages = $4,
                fully_completed_villages = $5,
                total_esr = $6,
                scheme_functional_status = $7,
                fully_completed_esr = $8,
                balance_esr = $9,
                flow_meters_connected = $10,
                pressure_transmitters_connected = $11,
                residual_chlorine_connected = $12,
                scheme_status = $13,
                agency = $14
              WHERE scheme_id = $15`,
              [
                schemeData.total_villages, schemeData.functional_villages,
                schemeData.partial_villages, schemeData.non_functional_villages,
                schemeData.fully_completed_villages, schemeData.total_esr,
                schemeData.scheme_functional_status, schemeData.fully_completed_esr,
                schemeData.balance_esr, schemeData.flow_meters_connected,
                schemeData.pressure_transmitters_connected, schemeData.residual_chlorine_connected,
                schemeData.scheme_status, schemeData.agency, schemeData.scheme_id
              ]
            );
            console.log(`Updated existing scheme: ${schemeName}`);
          }
        } catch (error) {
          console.error(`Error processing row for scheme ${row[fieldMapping.schemeName]}:`, error);
        }
      }
    }
    
    console.log("\nImport completed successfully!");
    
    // Update region summaries
    await updateRegionSummaries();
    
    return true;
  } catch (error) {
    console.error("Error in readExcelAndImportData:", error);
    return false;
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Function to update region summaries
async function updateRegionSummaries() {
  try {
    console.log("Updating region summaries...");
    
    // Get all the regions
    const regionsResult = await pool.query('SELECT region_name FROM region');
    const regions = regionsResult.rows.map(row => row.region_name);
    
    for (const region of regions) {
      // Calculate totals from scheme_status table
      const totalsResult = await pool.query(`
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
console.log(`Starting import process for Excel file: ${filePath}`);

// Run the import function
readExcelAndImportData(filePath)
  .then(success => {
    if (success) {
      console.log("Excel data import successful");
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