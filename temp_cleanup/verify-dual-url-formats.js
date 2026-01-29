/**
 * Verify Dual URL Formats (Different patterns for Pune vs Other Regions)
 * This script checks that all dashboard URLs follow their respective regional formats
 */

import pg from 'pg';
const { Pool } = pg;

async function verifyDualUrlFormats() {
  // Create a connection pool using the DATABASE_URL environment variable
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    
    try {
      // Get all regions
      const regionsResult = await client.query('SELECT DISTINCT region FROM scheme_status');
      const regions = regionsResult.rows.map(row => row.region);
      
      console.log(`Found ${regions.length} regions to verify`);
      
      let totalSchemes = 0;
      let correctlyFormatted = 0;
      let incorrectlyFormatted = 0;
      
      // Check each region
      for (const region of regions) {
        console.log(`\nVerifying region: ${region}`);
        
        // Get schemes for this region
        const schemesResult = await client.query('SELECT scheme_id, scheme_name, block, dashboard_url FROM scheme_status WHERE region = $1', [region]);
        const schemes = schemesResult.rows;
        
        console.log(`Found ${schemes.length} schemes in region ${region}`);
        totalSchemes += schemes.length;
        
        let regionCorrect = 0;
        let regionIncorrect = 0;
        
        // Define patterns based on region
        const isPuneRegion = region === 'Pune';
        
        // Set pattern expectations based on region
        const blockPattern = isPuneRegion ? 'Block%20-' : 'Block-';
        const schemePattern = isPuneRegion ? 'Scheme%20-%20' : 'Scheme-';
        
        // Check format of each scheme's URL
        for (const scheme of schemes) {
          // Skip null URLs
          if (!scheme.dashboard_url) {
            console.log(`  WARNING: Missing URL for scheme "${scheme.scheme_name}" (ID: ${scheme.scheme_id})`);
            regionIncorrect++;
            incorrectlyFormatted++;
            continue;
          }
          
          // Check the patterns
          const hasCorrectBlockPattern = scheme.dashboard_url.includes(blockPattern);
          const hasCorrectSchemePattern = scheme.dashboard_url.includes(schemePattern);
          
          if (hasCorrectBlockPattern && hasCorrectSchemePattern) {
            regionCorrect++;
            correctlyFormatted++;
          } else {
            console.log(`  INCORRECT FORMAT: Scheme "${scheme.scheme_name}" (ID: ${scheme.scheme_id}) in block "${scheme.block}"`);
            console.log(`    Block pattern: ${hasCorrectBlockPattern ? 'OK' : 'MISSING'}`);
            console.log(`    Scheme pattern: ${hasCorrectSchemePattern ? 'OK' : 'MISSING'}`);
            console.log(`    URL: ${scheme.dashboard_url.substring(0, 150)}...`);
            regionIncorrect++;
            incorrectlyFormatted++;
          }
        }
        
        console.log(`Region ${region} summary: ${regionCorrect} correct, ${regionIncorrect} incorrect`);
      }
      
      // Print overall summary
      console.log(`\n========== VERIFICATION SUMMARY ==========`);
      console.log(`Total schemes checked: ${totalSchemes}`);
      console.log(`Correctly formatted URLs: ${correctlyFormatted} (${Math.round(correctlyFormatted/totalSchemes*100)}%)`);
      console.log(`Incorrectly formatted URLs: ${incorrectlyFormatted} (${Math.round(incorrectlyFormatted/totalSchemes*100)}%)`);
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  } finally {
    await pool.end();
  }
}

// Run the function
verifyDualUrlFormats().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});