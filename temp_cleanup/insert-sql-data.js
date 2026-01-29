// This script inserts data from SQL file into the scheme_status table
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executeSqlInsert() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, 'attached_assets', 'insert_scheme_status.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Executing SQL insert statements...');
    await client.query(sql);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Data inserted successfully');
    
    // Update region summaries
    console.log('Updating region summaries...');
    await updateRegionSummaries(client);
    console.log('Region summaries updated');
    
    // Force refresh of today's updates to detect changes in app_state
    // This ensures that changes are detected immediately after import
    console.log('Refreshing today\'s updates...');
    await client.query('SELECT * FROM app_state WHERE key = $1', ['today_updates']);
    console.log('Today\'s updates refreshed');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error inserting data:', error);
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
          SUM(CASE WHEN fully_completion_scheme_status = 'Completed' THEN 1 ELSE 0 END) as completed_schemes,
          SUM(total_villages_integrated) as total_villages,
          SUM(fully_completed_villages) as completed_villages,
          SUM(total_esr_integrated) as total_esr,
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