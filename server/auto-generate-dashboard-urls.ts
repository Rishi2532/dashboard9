/**
 * Auto-generate Dashboard URLs Script
 * 
 * This script runs during application startup to ensure all dashboard URLs
 * are properly generated. It checks for schemes and villages with missing dashboard URLs
 * and regenerates them using the proper format.
 * 
 * It also generates ESR-level dashboard URLs for the chlorine and pressure tables.
 * 
 * NEW PATTERNS (Updated):
 * - Base URL: https://mahajaliot.in
 * - Server Path: \\DemoAF\JJM\JJM\Maharashtra
 * 
 * Display IDs:
 * - Scheme Level: 10108
 * - Village Level: 10109
 * - ESR Level: 10086
 */

import { Pool } from 'pg';
import { getDB } from './db';

// Base URLs for PI Vision dashboards
const SCHEME_BASE_URL = 'https://mahajaliot.in/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
const VILLAGE_BASE_URL = 'https://mahajaliot.in/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
const ESR_BASE_URL = 'https://mahajaliot.in/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD';

// Standard parameters for all dashboards
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

// Server path prefix
const SERVER_PATH = '\\\\DemoAF\\JJM\\JJM\\Maharashtra';

// Special case for Bargaonpimpri scheme in Nashik region
function generateSpecialCaseUrl(scheme: any): string | null {
  const { scheme_id, scheme_name } = scheme;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name.includes('Bargaonpimpri')) {
    const path = `${SERVER_PATH}\\Region-Nashik\\Circle-Nashik\\Division-Nashik\\Sub Division-Sinnar\\Block-Sinnar\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS${String.fromCharCode(160)} Tal Sinnar`;
    const encodedPath = encodeURIComponent(path);
    
    return `${SCHEME_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }

  // Modgaon & Tornipada RWSS scheme (20047871) - needs NBSP before scheme name
  if (scheme_id === '20047871') {
    const region = scheme.region || 'Konkan';
    const circle = scheme.circle || 'Thane';
    const division = scheme.division || 'Palghar';
    const sub_division = scheme.sub_division || 'Dahanu';
    const block = scheme.block || 'Dahanu';
    
    // Note: The path requires a non-breaking space (char 160) after the dash-space separator
    const path = `${SERVER_PATH}\\Region-${region}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${String.fromCharCode(160)}${scheme_name}`;
    const encodedPath = encodeURIComponent(path);
    
    return `${SCHEME_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for a scheme
export function generateDashboardUrl(scheme: any): string | null {
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
  
  // Create the path - standard format: scheme_id - scheme_name (space-hyphen-space)
  // All regions now use the same format (including Amravati which stays as Amravati)
  const path = `${SERVER_PATH}\\Region-${region}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;

  // Encode the path for the URL
  const encodedPath = encodeURIComponent(path);

  // Return the complete URL with parameters
  return `${SCHEME_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Special case for Bargaonpimpri village URLs in Nashik region
function generateSpecialCaseVillageUrl(village: any): string | null {
  const { scheme_id, scheme_name, village_name } = village;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name.includes('Bargaonpimpri')) {
    const path = `${SERVER_PATH}\\Region-Nashik\\Circle-Nashik\\Division-Nashik\\Sub Division-Sinnar\\Block-Sinnar\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS${String.fromCharCode(160)} Tal Sinnar\\${village_name}`;
    const encodedPath = encodeURIComponent(path);
    
    return `${VILLAGE_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }

  // Modgaon & Tornipada RWSS scheme (20047871) - needs NBSP before scheme name
  if (scheme_id === '20047871') {
    const region = village.region || 'Konkan';
    const circle = village.circle || 'Thane';
    const division = village.division || 'Palghar';
    const sub_division = village.sub_division || 'Dahanu';
    const block = village.block || 'Dahanu';
    
    // Note: The path requires a non-breaking space (char 160) after the dash-space separator
    const path = `${SERVER_PATH}\\Region-${region}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${String.fromCharCode(160)}${scheme_name}\\${village_name}`;
    const encodedPath = encodeURIComponent(path);
    
    return `${VILLAGE_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for a village
export function generateVillageDashboardUrl(village: any): string | null {
  // Skip if missing required hierarchical information
  if (!village.region || !village.circle || !village.division || 
      !village.sub_division || !village.block || !village.scheme_id || 
      !village.scheme_name || !village.village_name) {
    console.warn(`Cannot generate URL for village ${village.village_name} - missing hierarchical information.`);
    return null;
  }
  
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseVillageUrl(village);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Create the path - all regions use standard format (space-dash-space)
  // Amravati stays as Amravati (no conversion to Amaravati)
  const path = `${SERVER_PATH}\\Region-${village.region}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;
  
  // Encode the path for use in URL
  const encodedPath = encodeURIComponent(path);
  
  // Return the complete URL
  return `${VILLAGE_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
}

// Special case for Bargaonpimpri ESR URLs in Nashik region
function generateSpecialCaseEsrUrl(esr: any): string | null {
  const { scheme_id, scheme_name, village_name, esr_name } = esr;
  
  // Bargaonpimpri scheme in Nashik region (includes non-breaking space character)
  if (scheme_id === '20019176' && scheme_name && scheme_name.includes('Bargaonpimpri')) {
    const path = `${SERVER_PATH}\\Region-Nashik\\Circle-Nashik\\Division-Nashik\\Sub Division-Sinnar\\Block-Sinnar\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS${String.fromCharCode(160)} Tal Sinnar\\${village_name}\\${esr_name}`;
    const encodedPath = encodeURIComponent(path);
    
    return `${ESR_BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
  }

  // Modgaon & Tornipada RWSS scheme (20047871) - needs NBSP before scheme name
  if (scheme_id === '20047871') {
    const region = esr.region || 'Konkan';
    const circle = esr.circle || 'Thane';
    const division = esr.division || 'Palghar';
    const sub_division = esr.sub_division || 'Dahanu';
    const block = esr.block || 'Dahanu';
    
    // Note: The path requires a non-breaking space (char 160) after the dash-space separator
    const path = `${SERVER_PATH}\\Region-${region}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${String.fromCharCode(160)}${scheme_name}\\${village_name}\\${esr_name}`;
    const encodedPath = encodeURIComponent(path);
    
    return `${ESR_BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
  }
  
  return null; // No special case matched
}

// Generate dashboard URL for an ESR
export function generateEsrDashboardUrl(esr: any): string | null {
  // Skip if missing required hierarchical information
  if (!esr.region || !esr.circle || !esr.division || 
      !esr.sub_division || !esr.block || !esr.scheme_id || 
      !esr.scheme_name || !esr.village_name || !esr.esr_name) {
    console.warn(`Cannot generate URL for ESR ${esr.esr_name} in village ${esr.village_name} - missing hierarchical information.`);
    return null;
  }
  
  // Check for special case URLs first
  const specialCaseUrl = generateSpecialCaseEsrUrl(esr);
  if (specialCaseUrl) {
    return specialCaseUrl;
  }
  
  // Create the path - all regions use standard format (space-dash-space)
  // Amravati stays as Amravati (no conversion to Amaravati)
  // Pune region also uses space-dash-space format for ESR URLs
  const path = `${SERVER_PATH}\\Region-${esr.region}\\Circle-${esr.circle}\\Division-${esr.division}\\Sub Division-${esr.sub_division}\\Block-${esr.block}\\Scheme-${esr.scheme_id} - ${esr.scheme_name}\\${esr.village_name}\\${esr.esr_name}`;
  
  // Encode the path for use in URL
  const encodedPath = encodeURIComponent(path);
  
  // Return the complete URL (note: using asset parameter for ESR instead of rootpath)
  return `${ESR_BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
}

// Main function to fix missing dashboard URLs
export async function autoGenerateDashboardUrls() {
  try {
    console.log('Generating any missing dashboard URLs...');
    const db = await getDB();
    
    // Step 1: Check and fix scheme-level dashboard URLs
    console.log('Checking for schemes with missing dashboard URLs...');
    const schemeResults = await db.execute(`
      SELECT * FROM scheme_status WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (schemeResults.rows.length > 0) {
      console.log(`Found ${schemeResults.rows.length} schemes with missing dashboard URLs.`);
      
      for (const scheme of schemeResults.rows) {
        const dashboardUrl = generateDashboardUrl(scheme);
        
        if (dashboardUrl) {
          console.log(`Generating URL for scheme: ${scheme.scheme_name} in block: ${scheme.block}`);
          await db.execute(`
            UPDATE scheme_status 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND scheme_name = $3 AND block = $4
          `, [dashboardUrl, scheme.scheme_id, scheme.scheme_name, scheme.block]);
        }
      }
      
      console.log('Scheme dashboard URLs generated successfully!');
    } else {
      console.log('No schemes with missing dashboard URLs found.');
    }
    
    // Step 2: Check and fix village-level dashboard URLs
    console.log('Checking for villages with missing dashboard URLs...');
    const villageResults = await db.execute(`
      SELECT * FROM water_scheme_data WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (villageResults.rows.length > 0) {
      console.log(`Found ${villageResults.rows.length} villages with missing dashboard URLs.`);
      
      for (const village of villageResults.rows) {
        const dashboardUrl = generateVillageDashboardUrl(village);
        
        if (dashboardUrl) {
          console.log(`Generating URL for village: ${village.village_name} in scheme: ${village.scheme_name}`);
          await db.execute(`
            UPDATE water_scheme_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3
          `, [dashboardUrl, village.scheme_id, village.village_name]);
        }
      }
      
      console.log('Village dashboard URLs generated successfully!');
    } else {
      console.log('No villages with missing dashboard URLs found.');
    }
    
    // Step 3: Check and fix ESR-level dashboard URLs for chlorine data
    console.log('Checking for chlorine ESRs with missing dashboard URLs...');
    const chlorineResults = await db.execute(`
      SELECT * FROM chlorine_data WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (chlorineResults.rows.length > 0) {
      console.log(`Found ${chlorineResults.rows.length} chlorine ESRs with missing dashboard URLs.`);
      
      for (const esr of chlorineResults.rows) {
        const dashboardUrl = generateEsrDashboardUrl(esr);
        
        if (dashboardUrl) {
          console.log(`Generating URL for ESR: ${esr.esr_name} in village: ${esr.village_name}`);
          await db.execute(`
            UPDATE chlorine_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
          `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        }
      }
      
      console.log('Chlorine ESR dashboard URLs generated successfully!');
    } else {
      console.log('No chlorine ESRs with missing dashboard URLs found.');
    }
    
    // Step 4: Check and fix ESR-level dashboard URLs for pressure data
    console.log('Checking for pressure ESRs with missing dashboard URLs...');
    const pressureResults = await db.execute(`
      SELECT * FROM pressure_data WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (pressureResults.rows.length > 0) {
      console.log(`Found ${pressureResults.rows.length} pressure ESRs with missing dashboard URLs.`);
      
      for (const esr of pressureResults.rows) {
        const dashboardUrl = generateEsrDashboardUrl(esr);
        
        if (dashboardUrl) {
          console.log(`Generating URL for ESR: ${esr.esr_name} in village: ${esr.village_name}`);
          await db.execute(`
            UPDATE pressure_data 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
          `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        }
      }
      
      console.log('Pressure ESR dashboard URLs generated successfully!');
    } else {
      console.log('No pressure ESRs with missing dashboard URLs found.');
    }
    
    // Step 5: Check and fix water_consumption dashboard URLs (uses ESR-level pattern like chlorine_data)
    console.log('Checking for water_consumption with missing dashboard URLs...');
    const waterConsumptionResults = await db.execute(`
      SELECT * FROM water_consumption WHERE dashboard_url IS NULL OR dashboard_url = '';
    `);
    
    if (waterConsumptionResults.rows.length > 0) {
      console.log(`Found ${waterConsumptionResults.rows.length} water consumption records with missing dashboard URLs.`);
      
      for (const esr of waterConsumptionResults.rows) {
        const dashboardUrl = generateEsrDashboardUrl(esr);
        
        if (dashboardUrl) {
          console.log(`Generating ESR URL for water consumption: ${esr.esr_name} in village: ${esr.village_name}`);
          await db.execute(`
            UPDATE water_consumption 
            SET dashboard_url = $1 
            WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
          `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        }
      }
      
      console.log('Water consumption ESR dashboard URLs generated successfully!');
    } else {
      console.log('No water consumption records with missing dashboard URLs found.');
    }
    
    console.log('All dashboard URLs have been generated!');
  } catch (error) {
    console.error('Error generating dashboard URLs:', error);
  }
}

// Function to regenerate ALL dashboard URLs (useful for migration to new patterns)
export async function regenerateAllDashboardUrls() {
  try {
    console.log('Regenerating ALL dashboard URLs with new pattern...');
    const db = await getDB();
    
    // Regenerate scheme_status URLs
    console.log('Regenerating scheme_status dashboard URLs...');
    const schemeResults = await db.execute(`SELECT * FROM scheme_status`);
    let schemeCount = 0;
    for (const scheme of schemeResults.rows) {
      const dashboardUrl = generateDashboardUrl(scheme);
      if (dashboardUrl) {
        await db.execute(`
          UPDATE scheme_status 
          SET dashboard_url = $1 
          WHERE scheme_id = $2 AND scheme_name = $3 AND block = $4
        `, [dashboardUrl, scheme.scheme_id, scheme.scheme_name, scheme.block]);
        schemeCount++;
      }
    }
    console.log(`Updated ${schemeCount} scheme_status URLs`);
    
    // Regenerate water_scheme_data URLs
    console.log('Regenerating water_scheme_data dashboard URLs...');
    const villageResults = await db.execute(`SELECT * FROM water_scheme_data`);
    let villageCount = 0;
    for (const village of villageResults.rows) {
      const dashboardUrl = generateVillageDashboardUrl(village);
      if (dashboardUrl) {
        await db.execute(`
          UPDATE water_scheme_data 
          SET dashboard_url = $1 
          WHERE scheme_id = $2 AND village_name = $3
        `, [dashboardUrl, village.scheme_id, village.village_name]);
        villageCount++;
      }
    }
    console.log(`Updated ${villageCount} water_scheme_data URLs`);
    
    // Regenerate chlorine_data URLs
    console.log('Regenerating chlorine_data dashboard URLs...');
    const chlorineResults = await db.execute(`SELECT * FROM chlorine_data`);
    let chlorineCount = 0;
    for (const esr of chlorineResults.rows) {
      const dashboardUrl = generateEsrDashboardUrl(esr);
      if (dashboardUrl) {
        await db.execute(`
          UPDATE chlorine_data 
          SET dashboard_url = $1 
          WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
        `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        chlorineCount++;
      }
    }
    console.log(`Updated ${chlorineCount} chlorine_data URLs`);
    
    // Regenerate pressure_data URLs
    console.log('Regenerating pressure_data dashboard URLs...');
    const pressureResults = await db.execute(`SELECT * FROM pressure_data`);
    let pressureCount = 0;
    for (const esr of pressureResults.rows) {
      const dashboardUrl = generateEsrDashboardUrl(esr);
      if (dashboardUrl) {
        await db.execute(`
          UPDATE pressure_data 
          SET dashboard_url = $1 
          WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
        `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        pressureCount++;
      }
    }
    console.log(`Updated ${pressureCount} pressure_data URLs`);
    
    // Regenerate water_consumption URLs (using ESR-level pattern like chlorine_data)
    console.log('Regenerating water_consumption dashboard URLs...');
    const waterConsumptionResults = await db.execute(`SELECT * FROM water_consumption`);
    let waterCount = 0;
    for (const esr of waterConsumptionResults.rows) {
      const dashboardUrl = generateEsrDashboardUrl(esr);
      if (dashboardUrl) {
        await db.execute(`
          UPDATE water_consumption 
          SET dashboard_url = $1 
          WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4
        `, [dashboardUrl, esr.scheme_id, esr.village_name, esr.esr_name]);
        waterCount++;
      }
    }
    console.log(`Updated ${waterCount} water_consumption URLs`);
    
    console.log('All dashboard URLs have been regenerated with new pattern!');
    return {
      scheme_status: schemeCount,
      water_scheme_data: villageCount,
      chlorine_data: chlorineCount,
      pressure_data: pressureCount,
      water_consumption: waterCount
    };
  } catch (error) {
    console.error('Error regenerating dashboard URLs:', error);
    throw error;
  }
}
