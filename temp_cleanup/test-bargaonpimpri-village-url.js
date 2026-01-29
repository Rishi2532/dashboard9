/**
 * Test script to verify the special URL generation for Bargaonpimpri scheme's villages
 * 
 * This script tests the URL generation logic without modifying the database
 */

// Load environment variables
import 'dotenv/config';

// Define the test village data
const testVillage = {
  scheme_id: '20019176',
  scheme_name: 'Retro. Bargaonpimpri & 6 VRWSS Tal Sinnar',
  village_name: 'Test Village',
  region: 'Nashik',
  circle: 'Nashik',
  division: 'Nashik',
  sub_division: 'Sinnar',
  block: 'Sinnar'
};

/**
 * Check if this is a village in the special case Bargaonpimpri scheme
 * @param village The village data to check
 * @returns A special case URL or null if not a special case
 */
function generateSpecialCaseVillageUrl(village) {
  // Special case for Bargaonpimpri scheme in Nashik region
  if (village.scheme_id === '20019176' && village.scheme_name.includes('Bargaonpimpri')) {
    // Base URL parameters
    const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
    const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
    
    // Special scheme path with non-breaking space
    const schemePath = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS' + String.fromCharCode(160) + ' Tal Sinnar';
    
    // Append village name to path
    const path = `${schemePath}\\\\${village.village_name}`;
    
    // URL encode the path
    const encodedPath = encodeURIComponent(path);
    
    // Return the complete URL
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // Not a special case
}

/**
 * Generate a dashboard URL for a village
 */
function generateVillageDashboardUrl(village) {
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

  // Create the path with proper block and village information
  const path = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-${regionDisplay}\\\\Circle-${village.circle}\\\\Division-${village.division}\\\\Sub Division-${village.sub_division}\\\\Block-${village.block}\\\\Scheme-${village.scheme_id} - ${village.scheme_name}\\\\${village.village_name}`;
  
  // URL encode the path
  const encodedPath = encodeURIComponent(path);
  
  // Combine all parts to create the complete URL
  return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

async function testBargaonpimpriVillageUrl() {
  console.log('Testing Bargaonpimpri scheme village URL generation...');
  console.log('\nTest Village Data:', testVillage);
  
  // Generate URL using special case handler
  const specialUrl = generateSpecialCaseVillageUrl(testVillage);
  console.log('\nSpecial Case URL generated:');
  console.log(specialUrl);
  
  // Also test the regular URL generation method
  const regularUrl = generateVillageDashboardUrl(testVillage);
  console.log('\nRegular URL generation result (should use special case):');
  console.log(regularUrl);
  
  // Verify they are the same
  console.log('\nURLs are identical:', specialUrl === regularUrl);
  
  // Check that the non-breaking space is in the URL
  console.log('\nURL contains non-breaking space character:', specialUrl.includes('%C2%A0'));
}

// Execute the function
testBargaonpimpriVillageUrl().catch(err => {
  console.error('Error:', err);
});
