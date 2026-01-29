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

// Read the JSON file
async function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return null;
  }
}

// Map scheme data from JSON to our database schema
function mapSchemeData(item, region) {
  // Determine scheme completion status
  let schemeCompletionStatus = 'Partial';
  if (item.scheme_status === 'Completed' || item.scheme_functional_status === 'Functional') {
    schemeCompletionStatus = 'Fully-Completed';
  } else if (item.scheme_functional_status === 'Non-Functional') {
    schemeCompletionStatus = 'Not-Connected';
  }

  // Create agency value
  const agency = getAgencyByRegion(item.region);

  return {
    scheme_id: String(item.scheme_id),
    scheme_name: String(item.scheme_name),
    region: item.region,
    total_villages: item.number_of_village || 0,
    functional_villages: item.functional_villages || 0,
    partial_villages: item.partial_villages || 0,
    non_functional_villages: item.non_functional_villages || 0,
    fully_completed_villages: item.fully_completed_villages || 0,
    total_esr: item.total_esr || 0,
    scheme_functional_status: item.scheme_functional_status || 'Partial',
    fully_completed_esr: item.fully_completed_esr || 0,
    balance_esr: item.balance_esr || 0,
    flow_meters_connected: item.flow_meters_connected || 0,
    pressure_transmitters_connected: item.pressure_transmitters_connected || 0,
    residual_chlorine_connected: item.residual_chlorine_connected || 0,
    scheme_status: schemeCompletionStatus,
    agency: agency
  };
}

// Get agency name based on region
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

// Check if a scheme exists in the database
async function schemeExists(schemeId) {
  const pool = new pg.Pool(dbConfig);
  try {
    const result = await pool.query('SELECT * FROM scheme_status WHERE scheme_id = $1', [schemeId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking if scheme exists:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Import data from JSON to database
async function importData(data) {
  if (!data || !data.schemes || !Array.isArray(data.schemes)) {
    console.error('Invalid data format');
    return false;
  }

  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(`Importing ${data.schemes.length} schemes...`);
    
    // Clear existing schemes
    await pool.query('DELETE FROM scheme_status');
    console.log('Cleared existing schemes from database');
    
    // Import each scheme
    for (const item of data.schemes) {
      try {
        const schemeData = mapSchemeData(item, item.region);
        
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
        console.log(`Imported scheme: ${schemeData.scheme_id} - ${schemeData.scheme_name}`);
      } catch (error) {
        console.error(`Error importing scheme ${item.scheme_id}:`, error);
      }
    }
    
    // Update region summaries
    await updateRegionSummaries(pool);
    
    console.log('Import completed successfully!');
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
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

// Main function
async function main() {
  try {
    // Path to the JSON file
    const jsonFilePath = path.join(__dirname, 'scheme_status_data.json');
    console.log(`Reading JSON data from: ${jsonFilePath}`);
    
    // Read the JSON data
    const data = await readJsonFile(jsonFilePath);
    
    if (!data) {
      console.error("Failed to read JSON data");
      process.exit(1);
    }
    
    // Import the data
    const success = await importData(data);
    
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