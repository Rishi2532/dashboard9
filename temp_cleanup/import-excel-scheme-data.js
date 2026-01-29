import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection setup
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Process and map JSON scheme data
async function processJsonFile(filePath) {
  try {
    console.log(`Reading JSON file from: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    const allSchemes = [];
    
    // Process each region
    for (const regionKey of Object.keys(jsonData)) {
      console.log(`Processing region: ${regionKey}`);
      
      const regionData = jsonData[regionKey];
      let regionName = '';
      
      // Extract region name from key (e.g., "Region - Amravati" -> "Amravati")
      if (regionKey.includes('-')) {
        regionName = regionKey.split('-')[1].trim();
      } else {
        regionName = regionKey.replace('Region', '').trim();
      }
      
      // Skip header rows and process each scheme in the region
      for (const item of regionData) {
        // Skip null items or headers
        if (!item || typeof item !== 'object') continue;
        
        // Skip header rows (those with column definitions)
        if (item.Column1 === 'Sr No.' || item.Column1 === "Sr No." || item["Sr No."] === 'Sr No.') continue;
        
        try {
          // Extract scheme data
          const schemeId = item.Column7 || item["Scheme ID"] || '';
          if (!schemeId) continue; // Skip if no scheme ID
          
          const schemeName = item.Column8 || item["Scheme Name"] || '';
          const totalVillages = getNumber(item.Column9 || item["Number of Village"]);
          const functionalVillages = getNumber(item.Column10 || item["No. of Functional Village"]);
          const partialVillages = getNumber(item.Column11 || item["No. of Partial Village"]);
          const nonFunctionalVillages = getNumber(item.Column12 || item["No. of Non- Functional Village"]);
          const fullyCompletedVillages = getNumber(item.Column13 || item["Fully completed Villages"]);
          const totalESR = getNumber(item.Column14 || item["Total Number of ESR"]);
          const schemeFunctionalStatus = item.Column15 || item["Scheme Functional Status"] || 'Partial';
          const fullyCompletedESR = getNumber(item.Column16 || item["No. Fully Completed ESR"]);
          const balanceESR = getNumber(item.Column17 || item["Balance to Complete ESR"]);
          const flowMeters = getNumber(item.Column18 || item[" Flow Meters Conneted"]);
          const pressureTransmitters = getNumber(item.Column19 || item["Pressure Transmitter Conneted"]);
          const residualChlorine = getNumber(item.Column20 || item["Residual Chlorine Conneted"]);
          const schemeStatus = item.Column21 || item["Fully completion Scheme Status"] || 'In Progress';
          
          // Determine scheme completion status
          let schemeCompletionStatus = 'Partial';
          if (schemeStatus === 'Completed' || schemeFunctionalStatus === 'Functional') {
            schemeCompletionStatus = 'Fully-Completed';
          } else if (schemeFunctionalStatus === 'Non-Functional') {
            schemeCompletionStatus = 'Not-Connected';
          }
          
          // Add to schemes array
          allSchemes.push({
            scheme_id: String(schemeId),
            scheme_name: String(schemeName),
            region_name: regionName,
            total_villages: totalVillages,
            functional_villages: functionalVillages,
            partial_villages: partialVillages,
            non_functional_villages: nonFunctionalVillages,
            fully_completed_villages: fullyCompletedVillages,
            total_esr: totalESR,
            scheme_functional_status: schemeFunctionalStatus,
            fully_completed_esr: fullyCompletedESR,
            balance_esr: balanceESR,
            flow_meters_connected: flowMeters,
            pressure_transmitters_connected: pressureTransmitters,
            residual_chlorine_connected: residualChlorine,
            scheme_status: schemeCompletionStatus,
            agency: getAgencyByRegion(regionName)
          });
          
          console.log(`Processed scheme: ${schemeId} - ${schemeName}`);
        } catch (error) {
          console.error('Error processing scheme item:', error);
        }
      }
    }
    
    console.log(`Successfully processed ${allSchemes.length} schemes from JSON file`);
    return allSchemes;
  } catch (error) {
    console.error('Error processing JSON file:', error);
    return [];
  }
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
async function importSchemesToDatabase(schemes) {
  if (!schemes || schemes.length === 0) {
    console.error('No schemes to import');
    return false;
  }

  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(`Importing ${schemes.length} schemes to database...`);
    
    // Clear existing schemes
    await pool.query('DELETE FROM scheme_status');
    console.log('Cleared existing schemes from database');
    
    // Create a single prepared statement for better performance
    const insertStmt = `
      INSERT INTO scheme_status (
        scheme_id, scheme_name, region_name, total_villages, functional_villages,
        partial_villages, non_functional_villages, fully_completed_villages,
        total_esr, scheme_functional_status, fully_completed_esr, balance_esr,
        flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected,
        scheme_status, agency
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
    `;
    
    // Process each scheme
    for (const scheme of schemes) {
      try {
        await pool.query(insertStmt, [
          scheme.scheme_id, scheme.scheme_name, scheme.region_name,
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

// Main function
async function main() {
  try {
    // Path to the JSON file
    const jsonFilePath = path.join(__dirname, 'attached_assets', 'scheme_status_table (2).json');
    
    // Process JSON file
    const schemes = await processJsonFile(jsonFilePath);
    
    if (schemes.length === 0) {
      console.error("No schemes found in the JSON file");
      process.exit(1);
    }
    
    console.log(`Found ${schemes.length} schemes in JSON file`);
    
    // Import schemes to database
    const success = await importSchemesToDatabase(schemes);
    
    if (success) {
      console.log("Data import completed successfully");
      process.exit(0);
    } else {
      console.error("Data import failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
}

// Run the main function
main();