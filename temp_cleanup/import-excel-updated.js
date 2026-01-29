require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create a PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Column mappings
const COLUMN_MAPPINGS = {
  'Total Villages Integrated': 'total_villages_integrated',
  'Fully Completed Villages': 'fully_completed_villages',
  'Total ESR Integrated': 'total_esr_integrated',
  'No. Fully Completed ESR': 'no_fully_completed_esr',
  'Flow Meters Connected': 'flow_meters_connected',
  'Residual Chlorine Analyzer Connected': 'residual_chlorine_analyzer_connected',
  'Pressure Transmitter Connected': 'pressure_transmitter_connected',
  'Fully completion Scheme Status': 'fully_completion_scheme_status',
};

// Region name mapping
const REGION_SHEET_MAPPING = {
  'Region - Amravati': 'Amravati',
  'Region - CS': 'Chhatrapati Sambhajinagar',
  'Region - Konkan': 'Konkan',
  'Region - Nagpur': 'Nagpur',
  'Region - Nashik': 'Nashik',
  'Region - Pune': 'Pune',
};

async function importExcelData(filePath) {
  console.log(`Reading Excel file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  // Read the Excel file
  const workbook = XLSX.readFile(filePath, { type: 'binary' });
  
  // Process each sheet with region data
  for (const sheetName of workbook.SheetNames) {
    // Skip sheets that don't match our expected region sheets
    if (!REGION_SHEET_MAPPING[sheetName]) {
      console.log(`Skipping sheet: ${sheetName} (not a recognized region sheet)`);
      continue;
    }
    
    const regionName = REGION_SHEET_MAPPING[sheetName];
    console.log(`Processing sheet: ${sheetName} for region: ${regionName}`);
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    if (!data || data.length === 0) {
      console.log(`No data found in sheet: ${sheetName}`);
      continue;
    }
    
    console.log(`Found ${data.length} rows in ${sheetName}`);
    
    // Import data for this region
    await importRegionData(data, regionName);
  }
  
  console.log('Excel import completed');
  
  // Update region summaries at the end
  await updateRegionSummaries(pool);
}

async function importRegionData(data, regionName) {
  for (const row of data) {
    // Find the scheme by scheme_id
    const schemeId = row['Scheme Id'] || row['Scheme ID'] || row['scheme_id'];
    if (!schemeId) {
      console.warn('Row missing scheme ID, skipping:', row);
      continue;
    }
    
    // Prepare the data to update
    const updateData = {};
    
    // Map columns according to the mappings
    for (const [excelCol, dbCol] of Object.entries(COLUMN_MAPPINGS)) {
      if (row[excelCol] !== undefined) {
        // For numeric columns, convert to number
        if (typeof row[excelCol] === 'string' && !isNaN(row[excelCol])) {
          updateData[dbCol] = parseInt(row[excelCol], 10);
        } else {
          updateData[dbCol] = row[excelCol];
        }
      }
    }
    
    // Handle special case for fully_completion_scheme_status
    if (updateData.fully_completion_scheme_status === 'Partial') {
      updateData.fully_completion_scheme_status = 'In Progress';
    }
    
    // Make sure we have the correct region
    updateData.region = regionName;
    
    // Skip if no data to update
    if (Object.keys(updateData).length === 0) {
      console.warn(`No valid data to update for scheme ${schemeId}`);
      continue;
    }
    
    try {
      // Check if the scheme exists
      const existsResult = await pool.query(
        'SELECT sr_no FROM scheme_status WHERE scheme_id = $1',
        [schemeId]
      );
      
      if (existsResult.rows.length === 0) {
        console.warn(`Scheme with ID ${schemeId} not found, skipping`);
        continue;
      }
      
      // Build the update query dynamically
      const keys = Object.keys(updateData);
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const values = [schemeId, ...keys.map(key => updateData[key])];
      
      const query = `
        UPDATE scheme_status 
        SET ${setClause}
        WHERE scheme_id = $1
        RETURNING *;
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`Updated scheme: ${schemeId}`);
      } else {
        console.warn(`Failed to update scheme: ${schemeId}`);
      }
    } catch (error) {
      console.error(`Error updating scheme ${schemeId}:`, error);
    }
  }
}

async function updateRegionSummaries(pool) {
  console.log("Updating region summaries...");
  
  // Update summaries for each region
  const regions = await pool.query('SELECT region_id, region_name FROM region');
  
  for (const region of regions.rows) {
    const regionName = region.region_name;
    try {
      // Count schemes by status
      const schemesQuery = await pool.query(
        `SELECT 
          COUNT(*) AS total_schemes,
          COUNT(CASE WHEN fully_completion_scheme_status = 'Fully-Completed' THEN 1 END) AS fully_completed_schemes
        FROM scheme_status 
        WHERE region = $1`,
        [regionName]
      );
      
      // Count ESRs and villages
      const countsQuery = await pool.query(
        `SELECT 
          SUM(total_esr_integrated) AS total_esr_integrated,
          SUM(no_fully_completed_esr) AS fully_completed_esr,
          SUM(total_esr_integrated - no_fully_completed_esr) AS partial_esr,
          SUM(total_villages_integrated) AS total_villages_integrated,
          SUM(fully_completed_villages) AS fully_completed_villages,
          SUM(flow_meters_connected) AS flow_meter_integrated,
          SUM(residual_chlorine_analyzer_connected) AS rca_integrated,
          SUM(pressure_transmitter_connected) AS pressure_transmitter_integrated
        FROM scheme_status 
        WHERE region = $1`,
        [regionName]
      );
      
      const schemes = schemesQuery.rows[0];
      const counts = countsQuery.rows[0];
      
      // Update the region summary
      await pool.query(
        `UPDATE region 
        SET 
          total_schemes_integrated = $1,
          fully_completed_schemes = $2,
          total_esr_integrated = $3,
          fully_completed_esr = $4,
          partial_esr = $5,
          total_villages_integrated = $6,
          fully_completed_villages = $7,
          flow_meter_integrated = $8,
          rca_integrated = $9,
          pressure_transmitter_integrated = $10
        WHERE region_id = $11`,
        [
          schemes.total_schemes,
          schemes.fully_completed_schemes,
          counts.total_esr_integrated || 0,
          counts.fully_completed_esr || 0,
          counts.partial_esr || 0,
          counts.total_villages_integrated || 0,
          counts.fully_completed_villages || 0,
          counts.flow_meter_integrated || 0,
          counts.rca_integrated || 0,
          counts.pressure_transmitter_integrated || 0,
          region.region_id
        ]
      );
      
      console.log(`Updated summary for region: ${regionName}`);
    } catch (err) {
      console.error(`Error updating summary for region ${regionName}:`, err);
    }
  }
  
  console.log("Region summaries updated successfully");
}

// Main function
async function main() {
  try {
    const filePath = process.argv[2]; // Get file path from command-line argument
    
    if (!filePath) {
      console.error('Please provide the Excel file path as a command-line argument');
      process.exit(1);
    }
    
    await importExcelData(filePath);
    
    // Close the pool
    await pool.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

// Run the script
main();