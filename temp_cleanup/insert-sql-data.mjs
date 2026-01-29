// This script inserts data from SQL file into the scheme_status table
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeSqlInsert() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, 'attached_assets', 'insert_scheme_status.sql');
    const originalSql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Parse scheme IDs from the SQL content
    console.log('Extracting Scheme IDs from SQL file...');
    const schemeIds = [];
    const rows = originalSql.match(/\([^)]+\)/g) || [];
    
    for (const row of rows) {
      // Each row is in the format: (1, 'Amravati', ..., 7945938, '83 Village...', ...)
      // We need to extract the scheme ID which is the 7th element (index 6)
      const values = row.slice(1, -1).split(',').map(v => v.trim());
      if (values.length >= 7) {
        const schemeId = values[6].replace(/'/g, ''); // Remove quotes if present
        schemeIds.push(schemeId);
      }
    }
    
    // If there are scheme_ids to process, delete existing records first
    if (schemeIds.length > 0) {
      const uniqueSchemeIds = [...new Set(schemeIds)];
      console.log(`Found ${uniqueSchemeIds.length} unique scheme_ids in the SQL file`);
      
      console.log('Deleting existing records with the same scheme_ids...');
      for (const schemeId of uniqueSchemeIds) {
        await client.query('DELETE FROM scheme_status WHERE scheme_id = $1', [schemeId]);
      }
      console.log('Deletion completed');
    }
    
    // Create a modified SQL statement that maps the columns correctly
    const modifiedSql = originalSql
      .replace(
        'INSERT INTO scheme_status (', 
        'INSERT INTO scheme_status ('
      )
      .replace(
        'Sr_No, Region, Circle, Division, Sub_Division, Block, Scheme_ID, Scheme_Name, Number_of_Village, Total_Villages_Integrated, No_of_Functional_Village, No_of_Partial_Village, No_of_Non_Functional_Village, Fully_Completed_Villages, Total_Number_of_ESR, Scheme_Functional_Status, Total_ESR_Integrated, No_Fully_Completed_ESR, Balance_to_Complete_ESR, Flow_Meters_Connected, Pressure_Transmitter_Connected, Residual_Chlorine_Analyzer_Connected, Fully_completion_Scheme_Status',
        'sr_no, region_name, circle, division, sub_division, block, scheme_id, scheme_name, total_villages, villages_integrated, functional_villages, partial_villages, non_functional_villages, fully_completed_villages, total_esr, scheme_functional_status, esr_integrated_on_iot, fully_completed_esr, balance_esr, flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected, scheme_status'
      );
    
    console.log('Executing modified SQL insert statements...');
    await client.query(modifiedSql);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Data inserted successfully');
    
    // Update region summaries
    console.log('Updating region summaries...');
    await updateRegionSummaries(client);
    console.log('Region summaries updated');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error inserting data:', error);
    throw error; // Re-throw to propagate to the catch block below
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

async function updateRegionSummaries(client) {
  try {
    // For each region, calculate and update the summary statistics
    const regions = await client.query('SELECT DISTINCT region_name FROM region');
    
    for (const region of regions.rows) {
      const regionName = region.region_name;
      
      // Get scheme statistics for this region
      const schemeStats = await client.query(`
        SELECT 
          COUNT(*) as total_schemes,
          SUM(CASE WHEN scheme_status = 'Completed' THEN 1 ELSE 0 END) as completed_schemes,
          SUM(villages_integrated) as total_villages,
          SUM(fully_completed_villages) as completed_villages,
          SUM(esr_integrated_on_iot) as total_esr,
          SUM(fully_completed_esr) as completed_esr,
          SUM(flow_meters_connected) as flow_meters,
          SUM(residual_chlorine_connected) as rca,
          SUM(pressure_transmitters_connected) as pt
        FROM scheme_status 
        WHERE region_name = $1
      `, [regionName]);
      
      if (schemeStats.rows.length > 0) {
        const stats = schemeStats.rows[0];
        
        // Update the region with these statistics
        await client.query(`
          UPDATE region 
          SET 
            total_schemes_integrated = $1,
            fully_completed_schemes = $2,
            total_villages_integrated = $3,
            fully_completed_villages = $4,
            total_esr_integrated = $5,
            fully_completed_esr = $6,
            flow_meter_integrated = $7,
            rca_integrated = $8,
            pressure_transmitter_integrated = $9
          WHERE region_name = $10
        `, [
          stats.total_schemes || 0,
          stats.completed_schemes || 0,
          stats.total_villages || 0,
          stats.completed_villages || 0,
          stats.total_esr || 0,
          stats.completed_esr || 0, 
          stats.flow_meters || 0,
          stats.rca || 0,
          stats.pt || 0,
          regionName
        ]);
        
        console.log(`Updated summary for region: ${regionName}`);
      }
    }
  } catch (error) {
    console.error('Error updating region summaries:', error);
    throw error;
  }
}

// Execute the function
executeSqlInsert()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script execution failed:', err);
    process.exit(1);
  });