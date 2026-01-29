/**
 * Fix script for Bargaonpimpri scheme URLs
 * This script will update the dashboard URLs for the Bargaonpimpri scheme and its villages
 * to include the non-breaking space character where needed.
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');

// Configure WebSocket for Neon Serverless
neonConfig.webSocketConstructor = ws;

// Main function to fix the Bargaonpimpri URLs
async function fixBargaonpimpriUrls() {
  console.log('Starting Bargaonpimpri URL fix script...');

  // Connect to database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Step 1: Get the scheme record
    const scheme = await getSchemeById(db, '20019176');
    if (!scheme) {
      console.error('Scheme with ID 20019176 not found');
      return;
    }

    console.log('Found scheme:', scheme.scheme_name);

    // Step 2: Generate the special URL with non-breaking space
    const specialUrl = generateSpecialBargaonpimpriUrl(scheme);
    console.log('Generated special URL:', specialUrl);

    // Step 3: Update the scheme URL
    console.log('Updating scheme URL...');
    await updateSchemeUrl(db, scheme.scheme_id, specialUrl);

    // Step 4: Update all village URLs for this scheme
    console.log('Updating village URLs...');
    await updateVillageUrls(db, scheme.scheme_id, scheme);

    console.log('All Bargaonpimpri URLs updated successfully!');
  } catch (error) {
    console.error('Error fixing Bargaonpimpri URLs:', error);
  } finally {
    await pool.end();
  }
}

// Helper function to get a scheme by ID
async function getSchemeById(db, schemeId) {
  const result = await db.execute(
    `SELECT * FROM scheme_status WHERE scheme_id = $1 LIMIT 1`,
    [schemeId]
  );
  return result.rows[0];
}

// Generate the special URL for Bargaonpimpri scheme with non-breaking space
function generateSpecialBargaonpimpriUrl(scheme) {
  // Base URL and params
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
  const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

  // Create path with non-breaking space
  const path = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Generate village URL with the special path
function generateVillageUrl(scheme, villageName) {
  // Base URL for village dashboard
  const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
  const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

  // Create path with non-breaking space
  const basePath = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
  const path = `${basePath}\\\\${villageName}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Update the scheme URL in the database
async function updateSchemeUrl(db, schemeId, url) {
  await db.execute(
    `UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2`,
    [url, schemeId]
  );
  console.log(`Updated URL for scheme ${schemeId}`);
}

// Update all village URLs for the scheme
async function updateVillageUrls(db, schemeId, scheme) {
  // Get all villages for this scheme
  const villages = await db.execute(
    `SELECT * FROM water_scheme_data WHERE scheme_id = $1`,
    [schemeId]
  );

  console.log(`Found ${villages.rows.length} villages to update`);

  // Update each village URL
  for (const village of villages.rows) {
    const villageUrl = generateVillageUrl(scheme, village.village_name);
    await db.execute(
      `UPDATE water_scheme_data SET dashboard_url = $1 WHERE scheme_id = $2 AND village_name = $3`,
      [villageUrl, schemeId, village.village_name]
    );
    console.log(`Updated URL for village ${village.village_name}`);
  }
}

// Run the fix script
fixBargaonpimpriUrls();
