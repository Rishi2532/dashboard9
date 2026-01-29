/**
 * Fix Missing Dashboard URLs Script
 * 
 * This script regenerates all dashboard URLs for schemes and villages.
 * Run this script if you download the ZIP file and dashboard buttons are not visible.
 * 
 * Usage: node fix-missing-dashboard-urls.cjs
 */

const { Pool } = require('pg');
require('dotenv').config();

// Special case for Bargaonpimpri scheme in Nashik region
function generateSpecialCaseUrl(scheme) {
  const { scheme_id, scheme_name } = scheme;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name.includes('Bargaonpimpri')) {
    const path = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
    const encodedPath = encodeURIComponent(path);
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for a scheme
function generateDashboardUrl(scheme) {
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseUrl(scheme);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Default values for missing fields to ensure URL generation works even with partial data
  const region = scheme.region || 'Unknown Region';
  const circle = scheme.circle || 'Unknown Circle';
  const division = scheme.division || 'Unknown Division';
  const sub_division = scheme.sub_division || 'Unknown Sub Division';
  const block = scheme.block || 'Unknown Block';
  const scheme_id = scheme.scheme_id || `Unknown-${Date.now()}`;
  const scheme_name = scheme.scheme_name || `Unknown Scheme ${scheme_id}`;
  
  // Base URL for PI Vision dashboard with the correct display ID (10108)
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
  
  // Standard parameters for the dashboard
  const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = region === 'Amravati' ? 'Amaravati' : region;

  // Create the path without URL encoding
  // Use different spacing formats based on the region and scheme name
  let path;
  
  // Different format for Pune region
  if (region === 'Pune') {
    // Pune region has hyphen with no space after scheme_id
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id}-${scheme_name}`;
  } else {
    // Standard format for other regions (space after scheme_id, then hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
  }

  // Encode the path for the URL
  const encodedPath = encodeURIComponent(path);

  // Return the complete URL with parameters
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Special case for Bargaonpimpri village URLs in Nashik region
function generateSpecialCaseVillageUrl(village) {
  const { scheme_id, scheme_name, village_name } = village;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name && scheme_name.includes('Bargaonpimpri')) {
    // Insert the non-breaking space character (\u00A0) in the right position
    const path = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS${String.fromCharCode(160)} Tal Sinnar\\\\Village-${village_name}`;
    const encodedPath = encodeURIComponent(path);
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for a village
function generateVillageDashboardUrl(village) {
  // Skip if missing required hierarchical information
  if (!village.region || !village.circle || !village.division || 
      !village.sub_division || !village.block || !village.scheme_id || 
      !village.scheme_name || !village.village_name) {
    console.warn(`Cannot generate URL for village ${village.village_name || 'unknown'} - missing hierarchical information.`);
    return null;
  }
  
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseVillageUrl(village);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Base URL and parameters for the dashboard URLs
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
  const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
  
  // Handle the special case for Amravati region (change to Amaravati in the URL)
  const regionDisplay = village.region === 'Amravati' ? 'Amaravati' : village.region;
  
  // Create the path based on region format
  let path;
  
  // Different format for Pune region
  if (village.region === 'Pune') {
    // Format for Pune region (no space between scheme_id and hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id}-${village.scheme_name}\\${village.village_name}`;
  } else {
    // Standard format for other regions (space between scheme_id and hyphen)
    path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;
  }
  
  // Encode the path for use in URL
  const encodedPath = encodeURIComponent(path);
  
  // Return the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Main function to fix missing dashboard URLs
async function fixMissingDashboardUrls() {
  // Create a connection pool
  const poolConfig = {
    connectionString: process.env.DATABASE_URL
  };
  
  // Only add SSL for non-local connections
  const isLocalHost = process.env.DATABASE_URL?.includes('localhost') || 
                      process.env.DATABASE_URL?.includes('127.0.0.1');
                      
  if (process.env.NODE_ENV === 'production' && !isLocalHost) {
    poolConfig.ssl = {
      require: true,
      rejectUnauthorized: false,
    };
  }
  
  const pool = new Pool(poolConfig);
  
  try {
    // Check if tables exist before proceeding
    try {
      await pool.query('SELECT COUNT(*) FROM scheme_status');
      await pool.query('SELECT COUNT(*) FROM water_scheme_data');
    } catch (error) {
      console.error('Error: Database tables do not exist yet.');
      console.error('Please run the application first to initialize the database before running this script.');
      process.exit(1);
    }
    
    console.log('🔄 Fixing missing dashboard URLs...');
    
    // Step 1: Check and fix all scheme-level dashboard URLs (including ones that might have wrong format)
    console.log('🔄 Updating all scheme dashboard URLs...');
    const schemeResults = await pool.query(`SELECT * FROM scheme_status`);
    
    if (schemeResults.rows.length > 0) {
      console.log(`Found ${schemeResults.rows.length} schemes to update.`);
      
      // Add a dashboard_url column if it doesn't exist
      try {
        await pool.query(`
          ALTER TABLE scheme_status 
          ADD COLUMN IF NOT EXISTS dashboard_url TEXT;
        `);
      } catch (error) {
        console.log('Dashboard URL column already exists in scheme_status table');
      }
      
      for (const scheme of schemeResults.rows) {
        const dashboardUrl = generateDashboardUrl(scheme);
        
        if (dashboardUrl) {
          process.stdout.write('.');
          await pool.query(`
            UPDATE scheme_status 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND scheme_name = $3
          `, [dashboardUrl, scheme.scheme_id, scheme.scheme_name]);
        }
      }
      console.log('\n✅ Scheme dashboard URLs updated successfully!');
    } else {
      console.log('No schemes found in the database.');
    }
    
    // Step 2: Check and fix all village-level dashboard URLs
    console.log('🔄 Updating all village dashboard URLs...');
    const villageResults = await pool.query(`SELECT * FROM water_scheme_data`);
    
    if (villageResults.rows.length > 0) {
      console.log(`Found ${villageResults.rows.length} villages to update.`);
      
      // Add a dashboard_url column if it doesn't exist
      try {
        await pool.query(`
          ALTER TABLE water_scheme_data 
          ADD COLUMN IF NOT EXISTS dashboard_url TEXT;
        `);
      } catch (error) {
        console.log('Dashboard URL column already exists in water_scheme_data table');
      }
      
      for (const village of villageResults.rows) {
        const dashboardUrl = generateVillageDashboardUrl(village);
        
        if (dashboardUrl) {
          process.stdout.write('.');
          await pool.query(`
            UPDATE water_scheme_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3
          `, [dashboardUrl, village.scheme_id, village.village_name]);
        }
      }
      console.log('\n✅ Village dashboard URLs updated successfully!');
    } else {
      console.log('No villages found in the database.');
    }
    
    console.log('✅ All dashboard URLs have been updated!');
    console.log('✅ You should now see dashboard buttons when viewing scheme and village details.');
  } catch (error) {
    console.error('❌ Error generating dashboard URLs:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
fixMissingDashboardUrls();
