/**
 * Comprehensive Fix for ALL Village Dashboard URLs Across All Regions
 * 
 * This script fixes all village-level dashboard URLs to ensure they use the correct block
 * in their URLs, especially for multi-block schemes. This ensures proper navigation and
 * data display in the PI Vision dashboard.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Base URL components
const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

/**
 * Generate the correct dashboard URL for a village based on its metadata
 * @param {Object} village - Village data including region, circle, division, etc.
 * @returns {string} The complete, properly formatted dashboard URL
 */
function generateCorrectVillageUrl(village) {
  // Skip if missing required information
  if (!village.region || !village.circle || !village.division ||
      !village.sub_division || !village.block || !village.scheme_id ||
      !village.scheme_name || !village.village_name) {
    console.log(`Cannot generate URL for ${village.village_name || 'unknown village'} - missing data`);
    return null;
  }
  
  // Handle special case for Amravati region (displayed as Amaravati in URLs)
  const regionDisplay = village.region === 'Amravati' ? 'Amaravati' : village.region;
  
  // Build the path hierarchy using the village's correct block
  const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

/**
 * Fix dashboard URLs for all villages in a specific region
 * @param {Object} client - Database client
 * @param {string} region - Region name to process
 */
async function fixRegionUrls(client, region) {
  console.log(`Processing region: ${region}`);
  
  // Get all villages in this region
  const { rows: villages } = await client.query(
    `SELECT * FROM water_scheme_data WHERE region = $1`,
    [region]
  );
  
  console.log(`  Found ${villages.length} villages in ${region} region`);
  let totalFixed = 0;
  
  // Track unique schemes for logging
  const schemes = new Map();
  
  // Process each village
  for (const village of villages) {
    const correctUrl = generateCorrectVillageUrl(village);
    
    if (correctUrl && village.dashboard_url !== correctUrl) {
      // Update the URL if it's different from the current one
      await client.query(
        `UPDATE water_scheme_data SET dashboard_url = $1 WHERE scheme_id = $2 AND village_name = $3`,
        [correctUrl, village.scheme_id, village.village_name]
      );
      totalFixed++;
      
      // Track which scheme was updated
      const schemeKey = `${village.scheme_id}-${village.scheme_name}`;
      if (!schemes.has(schemeKey)) {
        schemes.set(schemeKey, { name: village.scheme_name, id: village.scheme_id, count: 0 });
      }
      schemes.get(schemeKey).count++;
    }
  }
  
  // Log which schemes were updated
  for (const scheme of schemes.values()) {
    if (scheme.count > 0) {
      console.log(`    ✓ Fixed ${scheme.count} villages in scheme "${scheme.name}" (${scheme.id})`);
    }
  }
  
  console.log(`  ✅ Total fixed in ${region} region: ${totalFixed} villages`);
  return totalFixed;
}

/**
 * Main function to fix all village dashboard URLs across all regions
 */
async function fixAllVillageUrls() {
  console.log('Starting comprehensive village dashboard URL fix across all regions...');
  
  const client = await pool.connect();
  
  try {
    // Get all distinct regions
    const { rows: regions } = await client.query('SELECT DISTINCT region FROM water_scheme_data ORDER BY region');
    console.log(`Found ${regions.length} regions to process.`);
    
    // Track total fixes
    let grandTotal = 0;
    
    // Process each region
    for (const row of regions) {
      const fixed = await fixRegionUrls(client, row.region);
      grandTotal += fixed;
    }
    
    // Final verification
    const { rows: mismatchedUrls } = await client.query(`
      SELECT COUNT(*) as mismatched_count
      FROM water_scheme_data
      WHERE dashboard_url NOT LIKE CONCAT('%Block-', block, '%')
      AND dashboard_url IS NOT NULL
    `);
    
    console.log('\n============ Summary ============');
    console.log(`✅ Successfully fixed dashboard URLs for ${grandTotal} villages across all regions`);
    
    if (mismatchedUrls[0].mismatched_count > 0) {
      console.log(`⚠️ There are still ${mismatchedUrls[0].mismatched_count} villages with mismatched blocks in their URLs.`);
      console.log('Please run this script again or check these villages manually.');
    } else {
      console.log('🎉 All village dashboard URLs now correctly match their respective blocks!');
    }
    
  } finally {
    client.release();
  }
  
  // Close the pool
  await pool.end();
  console.log('Database connection closed.');
}

// Run the main function
fixAllVillageUrls().catch(err => {
  console.error('Error fixing village dashboard URLs:', err);
  process.exit(1);
}).then(() => {
  console.log('Script completed successfully.');
  process.exit(0);
});
