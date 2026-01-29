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
function generateSchemeId(region, counter) {
  const prefix = regionPrefixes[region] || 'XX';
  return `${prefix}-${counter.toString().padStart(3, '0')}`;
}

// Function to read Excel file and import data
async function importFromJson(jsonFilePath) {
  try {
    console.log(`Reading JSON file: ${jsonFilePath}`);
    
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Get all existing schemes from database
    const existingSchemes = await pool.query('SELECT scheme_id, scheme_name, region FROM scheme_status');
    const existingSchemesMap = {};
    
    existingSchemes.rows.forEach(scheme => {
      const key = `${scheme.region}:${scheme.scheme_name}`;
      existingSchemesMap[key] = scheme.scheme_id;
    });
    
    console.log(`Found ${Object.keys(existingSchemesMap).length} existing schemes in the database`);
    
    // Track scheme IDs per region for new schemes
    const regionCounters = {};
    
    // Process each region
    for (const regionKey in jsonData) {
      // Extract region name from the key (e.g., "Region - Nagpur" -> "Nagpur")
      let regionName = regionKey.replace('Region - ', '').trim();
      
      // Normalize region name
      for (const [key, value] of Object.entries(regionMapping)) {
        if (regionName.includes(key)) {
          regionName = value;
          break;
        }
      }
      
      console.log(`\nProcessing region: ${regionName}`);
      
      // Get the region data
      const regionData = jsonData[regionKey];
      
      if (!Array.isArray(regionData) || regionData.length === 0) {
        console.log(`No data found for region ${regionName}, skipping`);
        continue;
      }
      
      console.log(`Found ${regionData.length} schemes in region ${regionName}`);
      
      // Initialize counter for this region if not exists
      if (!regionCounters[regionName]) {
        // Find the highest existing scheme number for this region
        const regionPrefix = regionPrefixes[regionName] || 'XX';
        const existingRegionSchemes = existingSchemes.rows
          .filter(scheme => scheme.scheme_id.startsWith(regionPrefix))
          .map(scheme => {
            const match = scheme.scheme_id.match(/-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          });
          
        regionCounters[regionName] = existingRegionSchemes.length > 0 
          ? Math.max(...existingRegionSchemes) + 1 
          : 1;
      }
      
      // Analyze the first row to determine the data structure
      let headerRow = regionData[0];
      
      // Skip empty or invalid rows
      if (!headerRow || typeof headerRow !== 'object') {
        console.log(`Invalid data for region ${regionName}, skipping`);
        continue;
      }
      
      // Find the keys for important fields
      let fieldMap = {};
      
      // First, try to find standard field names
      if (headerRow['Column1'] === 'Sr No.' || headerRow['Sr No.']) {
        // This is a header row with standard column names
        console.log("Found standard header row format");
        
        // Map the fields based on header names
        fieldMap = {
          schemeId: 'Scheme ID' in headerRow ? 'Scheme ID' : 'Column7',
          schemeName: 'Scheme Name' in headerRow ? 'Scheme Name' : 'Column8',
          totalVillages: 'Number of Village' in headerRow ? 'Number of Village' : ('No. of Village' in headerRow ? 'No. of Village' : 'Column9'),
          functionalVillages: 'No. of Functional Village' in headerRow ? 'No. of Functional Village' : 'Column10',
          partialVillages: 'No. of Partial Village' in headerRow ? 'No. of Partial Village' : 'Column11',
          nonFunctionalVillages: 'No. of Non- Functional Village' in headerRow ? 'No. of Non- Functional Village' : 'Column12',
          fullyCompletedVillages: 'Fully completed Villages' in headerRow ? 'Fully completed Villages' : 'Column13',
          totalESR: 'Total Number of ESR' in headerRow ? 'Total Number of ESR' : 'Column14',
          schemeFunctionalStatus: 'Scheme Functional Status' in headerRow ? 'Scheme Functional Status' : 'Column15',
          fullyCompletedESR: 'No. Fully Completed ESR' in headerRow ? 'No. Fully Completed ESR' : 'Column16',
          balanceESR: 'Balance to Complete ESR' in headerRow ? 'Balance to Complete ESR' : 'Column17',
          flowMeters: ' Flow Meters Conneted' in headerRow ? ' Flow Meters Conneted' : 'Column18',
          pressureTransmitters: 'Pressure Transmitter Conneted' in headerRow ? 'Pressure Transmitter Conneted' : 'Column19',
          residualChlorine: 'Residual Chlorine Conneted' in headerRow ? 'Residual Chlorine Conneted' : 'Column20',
          schemeStatus: 'Fully completion Scheme Status' in headerRow ? 'Fully completion Scheme Status' : ('Scheme Status' in headerRow ? 'Scheme Status' : 'Column21')
        };
        
        // Skip the header row 
        regionData.shift();
      } else {
        // This is data in a columnar format
        console.log("Found columnar data format");
        
        // Map based on common column names
        fieldMap = {
          schemeId: 'Column7',
          schemeName: 'Column8',
          totalVillages: 'Column9',
          functionalVillages: 'Column10',
          partialVillages: 'Column11',
          nonFunctionalVillages: 'Column12',
          fullyCompletedVillages: 'Column13',
          totalESR: 'Column14',
          schemeFunctionalStatus: 'Column15',
          fullyCompletedESR: 'Column16',
          balanceESR: 'Column17',
          flowMeters: 'Column18',
          pressureTransmitters: 'Column19',
          residualChlorine: 'Column20',
          schemeStatus: 'Column21'
        };
      }
      
      console.log("Field mapping:");
      console.log(fieldMap);
      
      // Process each scheme in the region
      for (const row of regionData) {
        try {
          // Skip invalid rows or header rows
          if (!row || typeof row !== 'object' || row['Column1'] === 'Sr No.' || row['Sr No.'] === 'Sr No.') {
            continue;
          }
          
          // Get scheme name
          const schemeName = row[fieldMap.schemeName];
          
          // Skip rows without a scheme name
          if (!schemeName) {
            console.log("Skipping row without scheme name");
            continue;
          }
          
          console.log(`Processing scheme: ${schemeName}`);
          
          // Get imported scheme ID if available
          let originalSchemeId = row[fieldMap.schemeId];
          
          // Check if scheme already exists in database
          const schemeKey = `${regionName}:${schemeName}`;
          let schemeId = existingSchemesMap[schemeKey];
          
          // If scheme doesn't exist, generate a new ID
          if (!schemeId) {
            schemeId = generateSchemeId(regionName, regionCounters[regionName]++);
            console.log(`Generated new scheme ID: ${schemeId} for scheme: ${schemeName}`);
          } else {
            console.log(`Found existing scheme ID: ${schemeId} for scheme: ${schemeName}`);
          }
          
          // Determine scheme completion status
          let schemeCompletionStatus = 'Partial';
          if (row[fieldMap.schemeStatus] === 'Completed' || 
              row[fieldMap.schemeFunctionalStatus] === 'Functional') {
            schemeCompletionStatus = 'Fully-Completed';
          } else if (row[fieldMap.schemeFunctionalStatus] === 'Non-Functional') {
            schemeCompletionStatus = 'Not-Connected';
          }
          
          // Prepare the scheme data
          const schemeData = {
            scheme_id: schemeId,
            scheme_name: schemeName,
            region: regionName,
            total_villages: parseInt(row[fieldMap.totalVillages]) || 0,
            functional_villages: parseInt(row[fieldMap.functionalVillages]) || 0,
            partial_villages: parseInt(row[fieldMap.partialVillages]) || 0,
            non_functional_villages: parseInt(row[fieldMap.nonFunctionalVillages]) || 0,
            fully_completed_villages: parseInt(row[fieldMap.fullyCompletedVillages]) || 0,
            total_esr: parseInt(row[fieldMap.totalESR]) || 0,
            scheme_functional_status: row[fieldMap.schemeFunctionalStatus] || 'Partial',
            fully_completed_esr: parseInt(row[fieldMap.fullyCompletedESR]) || 0,
            balance_esr: parseInt(row[fieldMap.balanceESR]) || 0,
            flow_meters_connected: parseInt(row[fieldMap.flowMeters]) || 0,
            pressure_transmitters_connected: parseInt(row[fieldMap.pressureTransmitters]) || 0,
            residual_chlorine_connected: parseInt(row[fieldMap.residualChlorine]) || 0,
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
                scheme_id, scheme_name, region, number_of_village, no_of_functional_village,
                no_of_partial_village, no_of_non_functional_village, fully_completed_villages,
                total_number_of_esr, scheme_functional_status, no_fully_completed_esr, balance_to_complete_esr,
                flow_meters_connected, pressure_transmitter_connected, residual_chlorine_analyzer_connected,
                fully_completion_scheme_status, agency
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
              )`,
              [
                schemeData.scheme_id, schemeData.scheme_name, schemeData.region,
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
                number_of_village = $2,
                no_of_functional_village = $3,
                no_of_partial_village = $4,
                no_of_non_functional_village = $5,
                fully_completed_villages = $6,
                total_number_of_esr = $7,
                scheme_functional_status = $8,
                no_fully_completed_esr = $9,
                balance_to_complete_esr = $10,
                flow_meters_connected = $11,
                pressure_transmitter_connected = $12,
                residual_chlorine_analyzer_connected = $13,
                fully_completion_scheme_status = $14,
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
          console.error(`Error processing scheme ${row[fieldMap.schemeName]}:`, error);
        }
      }
    }
    
    console.log("\nImport completed successfully!");
    
    // Update region summaries
    await updateRegionSummaries();
    
    return true;
  } catch (error) {
    console.error("Error importing data:", error);
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
    
    // Create a new connection pool for this operation
    const updatePool = new pg.Pool(dbConfig);
    
    try {
      // Get all the regions
      const regionsResult = await updatePool.query('SELECT region_id, region_name FROM region');
      const regions = regionsResult.rows;
      
      for (const region of regions) {
        const regionName = region.region_name;
        // Calculate totals from scheme_status table
        const totalsResult = await updatePool.query(`
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
        `, [region]);
        
        if (totalsResult.rows.length > 0) {
          const totals = totalsResult.rows[0];
          
          // Update the region record
          await updatePool.query(`
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
    } finally {
      // Close the update pool
      await updatePool.end();
    }
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Path to the JSON file
const jsonFilePath = path.join(__dirname, 'attached_assets', 'scheme_status_table (2).json');
console.log(`Starting import process for JSON file: ${jsonFilePath}`);

// Run the import function
importFromJson(jsonFilePath)
  .then(success => {
    if (success) {
      console.log("Data import successful");
      process.exit(0);
    } else {
      console.error("Data import failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unhandled error in import script:", error);
    process.exit(1);
  });