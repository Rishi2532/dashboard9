/**
 * Populate Dashboard URLs Script
 * 
 * This script populates dashboard URLs for all existing schemes in the database
 * by generating and storing the URLs in the dashboard_url column.
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// Base URL for PI Vision dashboard
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a dashboard URL for a scheme
 * @param {Object} scheme - The scheme object with region, circle, division, etc.
 * @returns {String} The complete URL or null if missing required fields
 */
function generateDashboardUrl(scheme) {
  // Skip if missing required hierarchical information
  if (!scheme.region || !scheme.circle || !scheme.division || 
      !scheme.sub_division || !scheme.block || !scheme.scheme_id || !scheme.scheme_name) {
    console.warn(`Cannot generate URL for scheme ${scheme.scheme_id} - missing hierarchical information.`);
    return null;
  }
  
  // Generate a UUID for this scheme
  const schemeUuid = uuidv4();
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = scheme.region === 'Amravati' ? 'Amaravati' : scheme.region;

  // Create the path without URL encoding
  const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}?${schemeUuid}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

/**
 * Main function to populate all schemes with dashboard URLs
 */
async function populateDashboardUrls() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      console.log('Fetching schemes without dashboard URLs...');
      
      // First, count how many schemes need URLs
      const countResult = await client.query(`
        SELECT COUNT(*) FROM scheme_status 
        WHERE dashboard_url IS NULL OR dashboard_url = ''
      `);
      
      const totalToUpdate = parseInt(countResult.rows[0].count);
      console.log(`Found ${totalToUpdate} schemes that need dashboard URLs.`);
      
      if (totalToUpdate === 0) {
        console.log('No schemes need dashboard URLs. Exiting.');
        return;
      }
      
      // Get all schemes without dashboard URLs
      const result = await client.query(`
        SELECT * FROM scheme_status 
        WHERE dashboard_url IS NULL OR dashboard_url = ''
      `);
      
      console.log(`Processing ${result.rows.length} schemes...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each scheme
      for (const scheme of result.rows) {
        try {
          // Generate URL
          const dashboardUrl = generateDashboardUrl(scheme);
          
          if (dashboardUrl) {
            // Update the database
            await client.query(
              'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3',
              [dashboardUrl, scheme.scheme_id, scheme.block]
            );
            
            successCount++;
            
            // Log progress every 10 schemes
            if (successCount % 10 === 0) {
              console.log(`Processed ${successCount}/${result.rows.length} schemes...`);
            }
          } else {
            console.warn(`Skipping scheme ${scheme.scheme_id} (${scheme.scheme_name}) - couldn't generate URL.`);
            errorCount++;
          }
        } catch (err) {
          console.error(`Error processing scheme ${scheme.scheme_id}: ${err.message}`);
          errorCount++;
        }
      }
      
      console.log('\nDashboard URL population complete.');
      console.log(`Successfully updated: ${successCount} schemes`);
      console.log(`Errors/Skipped: ${errorCount} schemes`);
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  } finally {
    // Close the pool when done
    await pool.end();
  }
}

// Run the main function
populateDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});