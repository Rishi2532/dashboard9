/**
 * Update Dashboard URLs Script
 * 
 * This script generates dashboard URLs for all schemes in the database
 * and stores them in the dashboard_url column of the scheme_status table.
 */

const { Client } = require('pg');
const { v1: uuidv1 } = require('uuid');

// Base URL for PI Vision dashboard
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';

// Standard parameters for the dashboard
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate a dashboard URL for a scheme
 * @param {Object} scheme - The scheme object with region, circle, division, etc.
 * @returns {String} The complete URL
 */
function generateDashboardUrl(scheme) {
  // Generate a UUID for this scheme (always the same for the same scheme)
  const schemeUuid = uuidv1();
  
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
 * Main function to update all schemes with dashboard URLs
 */
async function updateDashboardUrls() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // Get all schemes from the database
    const result = await client.query('SELECT * FROM scheme_status');
    console.log(`Found ${result.rows.length} schemes to process.`);
    
    // For each scheme, generate a dashboard URL and update the database
    let successCount = 0;
    let errorCount = 0;
    
    for (const scheme of result.rows) {
      try {
        // Handle schemes with missing values
        if (!scheme.region || !scheme.circle || !scheme.division || 
            !scheme.sub_division || !scheme.block || !scheme.scheme_id || !scheme.scheme_name) {
          console.warn(`Skipping scheme ${scheme.scheme_id} - ${scheme.scheme_name} due to missing hierarchical information.`);
          errorCount++;
          continue;
        }
        
        // Generate the dashboard URL
        const dashboardUrl = generateDashboardUrl(scheme);
        
        // Update the database with the new URL
        await client.query(
          'UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3', 
          [dashboardUrl, scheme.scheme_id, scheme.block]
        );
        
        successCount++;
        
        // Log progress every 10 schemes
        if (successCount % 10 === 0) {
          console.log(`Processed ${successCount} schemes successfully...`);
        }
      } catch (schemeError) {
        console.error(`Error processing scheme ${scheme.scheme_id}: ${schemeError.message}`);
        errorCount++;
      }
    }
    
    console.log(`\nDashboard URL generation complete.`);
    console.log(`Successfully updated: ${successCount} schemes`);
    console.log(`Errors/Skipped: ${errorCount} schemes`);
    
  } catch (error) {
    console.error('Error updating dashboard URLs:', error.message);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the main function
updateDashboardUrls().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});