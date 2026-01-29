import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

const { Pool } = pg;

// Create a connection to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to read and parse the JSON file
async function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    throw error;
  }
}

// Function to map JSON data to database schema
function mapSchemeData(item, region) {
  // Skip header rows or null items
  if (!item || !item.Column1 || typeof item.Column1 !== 'number') {
    return null;
  }

  // Extract region name from the full region text (e.g., "Region - Amravati" -> "Amravati")
  const regionName = region.replace('Region - ', '');

  // Handle Nagpur region data which has different column names
  if (regionName === 'Nagpur') {
    return {
      region_name: regionName,
      scheme_id: item['Scheme ID'] || null,
      scheme_name: item['Scheme Name'] || null,
      total_villages: parseInt(item['Number of Village']) || 0,
      functional_villages: parseInt(item['No. of Functional Village']) || 0,
      partial_villages: parseInt(item['No. of Partial Village']) || 0,
      non_functional_villages: parseInt(item['No. of Non- Functional Village']) || 0,
      fully_completed_villages: parseInt(item['Fully completed Villages']) || 0,
      total_esr: parseInt(item['Total Number of ESR']) || 0,
      scheme_functional_status: item['Scheme Functional Status'] || null,
      fully_completed_esr: parseInt(item['No. Fully Completed ESR']) || 0,
      balance_esr: parseInt(item['Balance to Complete ESR']) || 0,
      flow_meters_connected: parseInt(item[' Flow Meters Conneted']) || 0,
      pressure_transmitters_connected: parseInt(item['Pressure Transmitter Conneted']) || 0,
      residual_chlorine_connected: parseInt(item['Residual Chlorine Conneted']) || 0,
      scheme_status: (item['Fully completion Scheme Status'] === 'Completed') ? 'Fully-Completed' : 
                     (item['Fully completion Scheme Status'] === 'In Progress') ? 'Partial' : item['Fully completion Scheme Status'] || null,
      agency: getAgencyByRegion(regionName)
    };
  }

  // For all other regions
  return {
    region_name: regionName,
    scheme_id: item.Column7 || null,
    scheme_name: item.Column8 || null,
    total_villages: parseInt(item.Column9) || 0,
    functional_villages: parseInt(item.Column10) || 0,
    partial_villages: parseInt(item.Column11) || 0,
    non_functional_villages: parseInt(item.Column12) || 0,
    fully_completed_villages: parseInt(item.Column13) || 0,
    total_esr: parseInt(item.Column14) || 0,
    scheme_functional_status: item.Column15 || null,
    fully_completed_esr: parseInt(item.Column16) || 0,
    balance_esr: parseInt(item.Column17) || 0,
    flow_meters_connected: parseInt(item.Column18) || 0,
    pressure_transmitters_connected: parseInt(item.Column19) || 0,
    residual_chlorine_connected: parseInt(item.Column20) || 0,
    scheme_status: (item.Column21 === 'Completed') ? 'Fully-Completed' : 
                  (item.Column21 === 'In Progress') ? 'Partial' : item.Column21 || null,
    agency: getAgencyByRegion(regionName)
  };
}

// Function to determine agency based on region
function getAgencyByRegion(regionName) {
  switch(regionName) {
    case 'Amravati':
      return 'M/S Ceinsys';
    case 'Nashik':
      return 'M/S Wipro';
    case 'Nagpur':
      return 'M/S Tata Consultancy Services';
    case 'Pune':
      return 'M/S Larsen & Toubro';
    case 'Konkan':
      return 'M/S Orange Business Services';
    case 'Chhatrapati Sambhajinagar':
      return 'M/S Siemens';
    default:
      return 'Not Specified';
  }
}

// Function to check if a scheme with the same ID already exists
async function schemeExists(schemeId) {
  if (!schemeId) return false;
  
  const result = await pool.query(
    'SELECT COUNT(*) FROM scheme_status WHERE scheme_id = $1',
    [schemeId]
  );
  return parseInt(result.rows[0].count) > 0;
}

// Function to import data into the database
async function importData(data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let totalInserted = 0;
    let totalSkipped = 0;
    
    // Process each region
    for (const region in data) {
      console.log(`Processing ${region}...`);
      
      const schemes = data[region];
      
      for (const item of schemes) {
        const schemeData = mapSchemeData(item, region);
        
        // Skip if mapping returned null (headers, etc.)
        if (!schemeData) {
          continue;
        }
        
        // Skip if scheme ID is missing
        if (!schemeData.scheme_id) {
          console.log(`Skipping scheme with missing ID: ${schemeData.scheme_name}`);
          totalSkipped++;
          continue;
        }
        
        // Check if scheme already exists
        const exists = await schemeExists(schemeData.scheme_id);
        
        if (exists) {
          console.log(`Scheme with ID ${schemeData.scheme_id} already exists. Skipping.`);
          totalSkipped++;
          continue;
        }
        
        // Insert the scheme
        const insertQuery = `
          INSERT INTO scheme_status (
            region_name, scheme_id, scheme_name, total_villages, functional_villages,
            partial_villages, non_functional_villages, fully_completed_villages,
            total_esr, scheme_functional_status, fully_completed_esr, balance_esr,
            flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected,
            scheme_status, agency
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
        `;
        
        const values = [
          schemeData.region_name,
          schemeData.scheme_id,
          schemeData.scheme_name,
          schemeData.total_villages,
          schemeData.functional_villages,
          schemeData.partial_villages,
          schemeData.non_functional_villages,
          schemeData.fully_completed_villages,
          schemeData.total_esr,
          schemeData.scheme_functional_status,
          schemeData.fully_completed_esr,
          schemeData.balance_esr,
          schemeData.flow_meters_connected,
          schemeData.pressure_transmitters_connected,
          schemeData.residual_chlorine_connected,
          schemeData.scheme_status,
          schemeData.agency
        ];
        
        await client.query(insertQuery, values);
        totalInserted++;
        
        if (totalInserted % 50 === 0) {
          console.log(`Inserted ${totalInserted} schemes so far...`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`Import completed successfully!`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped: ${totalSkipped}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main function to run the import
async function main() {
  try {
    // First, clear existing scheme data if needed
    console.log('Clearing existing scheme data...');
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE scheme_status RESTART IDENTITY');
      console.log('Existing scheme data cleared successfully');
    } finally {
      client.release();
    }
    
    // Now import the new data
    const jsonFilePath = './attached_assets/scheme_status_table (2).json';
    console.log(`Reading data from ${jsonFilePath}...`);
    const data = await readJsonFile(jsonFilePath);
    
    // Log the regions found in the file
    console.log('Regions found in the data file:');
    Object.keys(data).forEach(region => console.log(`- ${region}`));
    
    // Import the data
    console.log('Starting data import...');
    await importData(data);
    
    // Update region summaries after import
    console.log('Updating region summaries...');
    await pool.query('SELECT update_region_summaries()');
    
    console.log('Import process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error in import process:', error);
    process.exit(1);
  }
}

// Run the import
main();