/**
 * Script to import LPCD sample data from the provided SQL file
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importLpcdData() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Please set it in your environment variables.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'attached_assets', 'deepseek_sql_20250420_7b9ba1.sql');
    let sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('SQL file read successfully');
    
    // Execute the SQL commands
    console.log('Importing data into database...');
    await pool.query(sql);
    
    console.log('LPCD data imported successfully');
    
    // Update the water scheme counts in the region table
    await updateRegionSummaries(pool);
    
    console.log('Region summaries updated');
  } catch (error) {
    console.error('Error importing LPCD data:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

async function updateRegionSummaries(pool) {
  try {
    // Get all regions from the database
    const regionsQuery = 'SELECT DISTINCT region FROM water_scheme_data';
    const { rows: regions } = await pool.query(regionsQuery);
    
    // Update the region table for each region with a summary of water scheme data
    for (const { region } of regions) {
      // Get the counts for this region
      const countsQuery = `
        SELECT 
          COUNT(DISTINCT scheme_id) as total_schemes,
          COUNT(DISTINCT CASE WHEN above_55_lpcd_count > below_55_lpcd_count THEN scheme_id END) as good_schemes,
          COUNT(DISTINCT CASE WHEN consistent_zero_lpcd_for_a_week = 7 THEN scheme_id END) as zero_supply_schemes
        FROM water_scheme_data
        WHERE region = $1
      `;
      
      const { rows: [counts] } = await pool.query(countsQuery, [region]);
      
      // Check if the region exists in the region table
      const checkRegionQuery = 'SELECT * FROM region WHERE region_name = $1';
      const { rows: existingRegions } = await pool.query(checkRegionQuery, [region]);
      
      if (existingRegions.length > 0) {
        // Update the existing region
        const updateQuery = `
          UPDATE region 
          SET 
            total_schemes_integrated = $1,
            fully_completed_schemes = $2
          WHERE region_name = $3
        `;
        
        await pool.query(updateQuery, [
          counts.total_schemes || 0, 
          counts.good_schemes || 0,
          region
        ]);
        
        console.log(`Updated summary data for region: ${region}`);
      } else {
        // Create a new region
        const insertQuery = `
          INSERT INTO region (
            region_name, 
            total_schemes_integrated, 
            fully_completed_schemes
          ) VALUES ($1, $2, $3)
        `;
        
        await pool.query(insertQuery, [
          region,
          counts.total_schemes || 0,
          counts.good_schemes || 0
        ]);
        
        console.log(`Created new region: ${region} with water scheme data`);
      }
    }
  } catch (error) {
    console.error('Error updating region summaries:', error);
  }
}

// Run the import function
importLpcdData().catch(console.error);