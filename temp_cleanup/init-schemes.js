/**
 * Initialize scheme data for Maharashtra Water Dashboard
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create PostgreSQL connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper function to determine agency by region
function getAgencyByRegion(regionName) {
  const regionAgencyMap = {
    'Nagpur': 'M/s Rite Water',
    'Amravati': 'JISL',
    'Chhatrapati Sambhajinagar': 'L&T',
    'Pune': 'L&T',
    'Konkan': 'L&T',
    'Nashik': 'JISL'
  };
  
  return regionAgencyMap[regionName] || 'L&T';
}

async function initializeSchemes() {
  console.log('Initializing scheme data...');
  
  const client = await pool.connect();
  try {
    // Check if schemes already exist
    const schemeCount = await client.query('SELECT COUNT(*) FROM scheme_status');
    
    if (parseInt(schemeCount.rows[0].count) === 0) {
      console.log('No schemes found. Creating sample schemes...');
      
      // Get regions
      const regions = await client.query('SELECT * FROM region');
      
      for (const region of regions.rows) {
        const regionName = region.region_name;
        console.log(`Creating schemes for ${regionName}...`);
        
        // Create sample schemes based on total_schemes_integrated count
        const numSchemesToCreate = parseInt(region.total_schemes_integrated) || 5;
        
        for (let i = 0; i < numSchemesToCreate; i++) {
          const schemeId = `${regionName.substring(0, 3).toUpperCase()}${i+1000}`;
          const schemeName = `${regionName} Water Supply Scheme ${i+1}`;
          const agency = getAgencyByRegion(regionName);
          
          // Villages data
          const villages = Math.min(10, Math.max(1, Math.floor(Math.random() * 10) + 1));
          const villagesIntegrated = villages;
          const fullyCompletedVillages = regionName === 'Pune' ? 0 : Math.floor(villages * Math.random());
          
          // ESR data
          const totalEsr = Math.min(15, Math.max(1, Math.floor(Math.random() * 15) + 1));
          const esrIntegrated = totalEsr;
          const fullyCompletedEsr = regionName === 'Pune' || regionName === 'Konkan' ? 0 : Math.floor(totalEsr * Math.random());
          
          // Status data
          const isFullyCompleted = regionName !== 'Pune' && regionName !== 'Konkan' && regionName !== 'Nashik' && Math.random() > 0.7;
          const schemeStatus = isFullyCompleted ? 'Fully-Completed' : 'In Progress';
          const functionalStatus = isFullyCompleted ? 'Functional' : 'Partial';
          
          // Integration data
          const flowMeters = Math.floor(Math.random() * 10) + 1;
          const pressureTransmitters = Math.floor(Math.random() * 8) + 1;
          const residualChlorine = Math.floor(Math.random() * 5) + 1;
          
          try {
            // Insert the scheme
            await client.query(`
              INSERT INTO scheme_status (
                sr_no, scheme_id, region, scheme_name, agency,
                number_of_village, total_villages_integrated, fully_completed_villages,
                total_number_of_esr, total_esr_integrated, no_fully_completed_esr,
                scheme_functional_status, flow_meters_connected, fm_integrated, 
                pressure_transmitter_connected, pt_integrated, 
                residual_chlorine_analyzer_connected, rca_integrated,
                fully_completion_scheme_status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
              [
                i+1, schemeId, regionName, schemeName, agency,
                villages, villagesIntegrated, fullyCompletedVillages,
                totalEsr, esrIntegrated, fullyCompletedEsr,
                functionalStatus, flowMeters, flowMeters, 
                pressureTransmitters, pressureTransmitters, 
                residualChlorine, residualChlorine,
                schemeStatus
              ]
            );
          } catch (error) {
            console.error(`Error inserting scheme ${schemeId}:`, error.message);
          }
        }
        
        console.log(`✅ Created ${numSchemesToCreate} schemes for ${regionName}`);
      }
      
      console.log('✅ Sample schemes created for all regions');
    } else {
      console.log(`✅ Scheme_status table already has ${schemeCount.rows[0].count} schemes`);
    }
    
    // Show schemes count by region
    const schemesByRegion = await client.query(`
      SELECT region, COUNT(*) as count 
      FROM scheme_status 
      GROUP BY region 
      ORDER BY region
    `);
    
    console.log('\nSchemes by region:');
    schemesByRegion.rows.forEach(row => {
      console.log(`- ${row.region}: ${row.count} schemes`);
    });
    
    console.log('\n✅ Scheme initialization complete');
    
  } catch (err) {
    console.error('Error initializing schemes:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the initialization
initializeSchemes().catch(console.error);