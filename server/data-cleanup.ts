/**
 * Data Cleanup Utility for Water Scheme Data
 * 
 * This module ensures data integrity by cleaning up region names and other data issues
 * that might occur during data imports or remixes.
 */

import pg from 'pg';

const { Pool } = pg;

/**
 * Clean up data integrity issues in the water_scheme_data table
 */
export async function cleanupWaterSchemeData() {
  console.log('🧹 Starting data cleanup for water scheme data...');
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Fix trailing spaces and other whitespace issues in region names
      console.log('Cleaning up region names...');
      const regionCleanupResult = await client.query(`
        UPDATE water_scheme_data 
        SET region = TRIM(region) 
        WHERE region != TRIM(region)
      `);
      console.log(`✅ Cleaned up ${regionCleanupResult.rowCount} records with trailing spaces in region names`);
      
      // Fix UTF-8 BOM and special characters in region names
      console.log('Fixing UTF-8 BOM and special characters...');
      const bomCleanupResult = await client.query(`
        UPDATE water_scheme_data 
        SET region = 'Amravati' 
        WHERE region LIKE '%Amravati%' AND region != 'Amravati'
      `);
      console.log(`✅ Fixed ${bomCleanupResult.rowCount} records with UTF-8 BOM in Amravati region`);
      
      // Clean up scheme names
      console.log('Cleaning up scheme names...');
      const schemeCleanupResult = await client.query(`
        UPDATE water_scheme_data 
        SET scheme_name = TRIM(scheme_name) 
        WHERE scheme_name != TRIM(scheme_name) AND scheme_name IS NOT NULL
      `);
      console.log(`✅ Cleaned up ${schemeCleanupResult.rowCount} records with trailing spaces in scheme names`);
      
      // Clean up village names
      console.log('Cleaning up village names...');
      const villageCleanupResult = await client.query(`
        UPDATE water_scheme_data 
        SET village_name = TRIM(village_name) 
        WHERE village_name != TRIM(village_name) AND village_name IS NOT NULL
      `);
      console.log(`✅ Cleaned up ${villageCleanupResult.rowCount} records with trailing spaces in village names`);
      
      // Verify data integrity after cleanup
      console.log('Verifying data integrity...');
      const regionCount = await client.query(`
        SELECT DISTINCT TRIM(region) as region, COUNT(*) as record_count
        FROM water_scheme_data 
        WHERE region IS NOT NULL AND region != ''
        GROUP BY TRIM(region)
        ORDER BY region
      `);
      
      console.log('✅ Current regions in database:');
      regionCount.rows.forEach(row => {
        console.log(`  - ${row.region}: ${row.record_count} records`);
      });
      
      console.log('✅ Data cleanup completed successfully!');
      
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
    throw error;
  }
}

/**
 * Initialize data cleanup - run this on app startup
 */
export async function initializeDataCleanup() {
  try {
    await cleanupWaterSchemeData();
  } catch (error) {
    console.error('Failed to initialize data cleanup:', error);
  }
}