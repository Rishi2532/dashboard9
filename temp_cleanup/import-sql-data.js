// This script for importing data from the transformed SQL file
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importSqlData() {
  // First, run the transform script to ensure we have the latest transformation
  console.log('Transforming SQL file...');
  execSync('node transform-sql-file.js', { stdio: 'inherit' });
  
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Read the transformed SQL file
    const sqlFilePath = path.join(__dirname, 'transformed_insert_scheme_status.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Extract scheme IDs from the SQL for smart deletion
    console.log('Extracting scheme IDs from the transformed SQL...');
    const schemeIds = [];
    const rows = sqlContent.match(/\([^)]+\)/g) || [];
    
    for (const row of rows) {
      // Use a more sophisticated approach to split CSV while respecting quotes
      const rawContent = row.slice(1, -1); // Remove outer parentheses
      
      // Use regex to handle proper CSV parsing with quoted values
      const valueRegex = /(?:,\s*|^)(?:"([^"]*)"|'([^']*)'|([^,]*))/g;
      const values = [];
      let match;
      
      while ((match = valueRegex.exec(rawContent)) !== null) {
        // Get the captured value (either quoted or unquoted)
        const value = match[1] || match[2] || match[3];
        values.push(value ? value.trim() : '');
      }
      
      if (values.length >= 7) {
        // scheme_id is the 7th item (index 6)
        const schemeId = values[6].replace(/'/g, '').replace(/"/g, '');
        // Ensure the scheme ID is treated as a string (important for display)
        const formattedSchemeId = schemeId.toString();
        schemeIds.push(formattedSchemeId);
      }
    }
    
    // Delete existing records with the same scheme IDs
    if (schemeIds.length > 0) {
      const uniqueSchemeIds = [...new Set(schemeIds)];
      console.log(`Found ${uniqueSchemeIds.length} unique scheme IDs to process`);
      
      console.log('Deleting existing records with the same scheme IDs...');
      for (const schemeId of uniqueSchemeIds) {
        await client.query('DELETE FROM scheme_status WHERE scheme_id = $1', [schemeId]);
      }
      console.log('Deletion completed');
    }
    
    // Split the SQL content into individual INSERT statements and execute them one by one
    // to better handle errors and continue on duplicate key errors
    console.log('Executing transformed SQL insert statements...');
    
    // Parse the transformed SQL into individual INSERT statements
    // Modified regex to handle multiline statements and properly match entire VALUES section
    const insertRegex = /INSERT INTO scheme_status \([^)]+\) VALUES\s*\([^)]+\)/g;
    const insertStatements = sqlContent.match(insertRegex) || [];
    
    console.log(`Found ${insertStatements.length} INSERT statements to process`);
    
    let successCount = 0;
    let errorCount = 0;
    let errorMessages = [];
    
    // Execute each statement individually to handle errors better
    for (let stmt of insertStatements) {
      try {
        // Process each statement to handle any special character issues
        stmt = stmt.replace(/\(\s*([^,]+),/g, (match, value) => {
          // Handle the sr_no value (first value)
          if (value.trim() === 'NULL' || value.trim() === 'null') {
            return '(NULL,';
          }
          return match; // Leave as is if not NULL
        });
        
        await client.query(stmt);
        successCount++;
      } catch (err) {
        errorCount++;
        // Log the error but continue with other statements
        console.log(`Error with statement: ${err.message}`);
        errorMessages.push(err.message);
      }
    }
    
    console.log(`Completed with ${successCount} successful inserts and ${errorCount} errors`);
    
    // Commit the transaction if there were any successful inserts
    await client.query('COMMIT');
    console.log('Data inserted successfully');
    
    // Update region summaries
    console.log('Updating region summaries...');
    await updateRegionSummaries(client);
    console.log('Region summaries updated');
    
    return { success: true, message: 'SQL data imported successfully', schemeCount: schemeIds.length };
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error importing SQL data:', error);
    return { success: false, message: `Error: ${error.message}` };
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

async function updateRegionSummaries(client) {
  try {
    // For each region, calculate and update the summary statistics
    const regions = await client.query('SELECT DISTINCT region_id, region_name FROM region');
    
    for (const region of regions.rows) {
      const regionName = region.region_name;
      const regionId = region.region_id;
      
      // Get scheme statistics for this region
      const schemeStats = await client.query(`
        SELECT 
          COUNT(*) as total_schemes,
          SUM(CASE WHEN LOWER(fully_completion_scheme_status) IN ('completed', 'fully-completed', 'fully completed') THEN 1 ELSE 0 END) as completed_schemes,
          SUM(number_of_village) as total_villages,
          SUM(fully_completed_villages) as completed_villages,
          SUM(total_number_of_esr) as total_esr,
          SUM(no_fully_completed_esr) as completed_esr,
          SUM(flow_meters_connected) as flow_meters,
          SUM(residual_chlorine_analyzer_connected) as rca,
          SUM(pressure_transmitter_connected) as pt
        FROM scheme_status 
        WHERE region = $1
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
          WHERE region_id = $10
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
          regionId
        ]);
        
        console.log(`Updated summary for region: ${regionName}`);
      }
    }
  } catch (error) {
    console.error('Error updating region summaries:', error);
    throw error;
  }
}

// Execute the function directly
importSqlData()
  .then((result) => {
    console.log('Import result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Script execution failed:', err);
    process.exit(1);
  });

// Export for use in other modules
export { importSqlData };