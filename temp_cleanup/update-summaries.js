/**
 * Update Region Summaries
 * 
 * This script updates the region summary data based on the scheme status data
 * to ensure the dashboard displays accurate totals.
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

async function updateRegionSummaries() {
  console.log('Updating region summaries...');
  
  const client = await pool.connect();
  try {
    // Get all regions
    const regions = await client.query('SELECT * FROM region');
    console.log(`Found ${regions.rows.length} regions to update`);
    
    for (const region of regions.rows) {
      const regionName = region.region_name;
      console.log(`Updating summaries for ${regionName}...`);
      
      // Get all schemes for this region
      const schemesQuery = await client.query(
        'SELECT * FROM scheme_status WHERE region = $1',
        [regionName]
      );
      
      const schemes = schemesQuery.rows;
      console.log(`  Found ${schemes.length} schemes in ${regionName}`);
      
      if (schemes.length === 0) {
        console.log(`  No schemes found for ${regionName}, skipping...`);
        continue;
      }
      
      // Calculate totals
      const totals = schemes.reduce((acc, scheme) => {
        // Increment total schemes
        acc.totalSchemes += 1;
        
        // Check if scheme is fully completed
        const isFullyCompleted = scheme.fully_completion_scheme_status === 'Fully-Completed';
        if (isFullyCompleted) {
          acc.fullyCompletedSchemes += 1;
        }
        
        // Add villages data
        acc.totalVillagesIntegrated += parseInt(scheme.total_villages_integrated || 0);
        acc.fullyCompletedVillages += parseInt(scheme.fully_completed_villages || 0);
        
        // Add ESR data
        acc.totalEsrIntegrated += parseInt(scheme.total_esr_integrated || 0);
        acc.fullyCompletedEsr += parseInt(scheme.no_fully_completed_esr || 0);
        acc.partialEsr += parseInt(scheme.total_esr_integrated || 0) - parseInt(scheme.no_fully_completed_esr || 0);
        
        // Add IoT device data
        acc.flowMeterIntegrated += parseInt(scheme.fm_integrated || scheme.flow_meters_connected || 0);
        acc.rcaIntegrated += parseInt(scheme.rca_integrated || scheme.residual_chlorine_analyzer_connected || 0);
        acc.pressureTransmitterIntegrated += parseInt(scheme.pt_integrated || scheme.pressure_transmitter_connected || 0);
        
        return acc;
      }, {
        totalSchemes: 0,
        fullyCompletedSchemes: 0,
        totalVillagesIntegrated: 0,
        fullyCompletedVillages: 0,
        totalEsrIntegrated: 0,
        fullyCompletedEsr: 0,
        partialEsr: 0,
        flowMeterIntegrated: 0,
        rcaIntegrated: 0,
        pressureTransmitterIntegrated: 0
      });
      
      console.log(`  Calculated totals for ${regionName}:`, totals);
      
      // Update region with calculated totals
      await client.query(
        `UPDATE region 
         SET total_schemes_integrated = $1,
             fully_completed_schemes = $2,
             total_villages_integrated = $3,
             fully_completed_villages = $4,
             total_esr_integrated = $5,
             fully_completed_esr = $6,
             partial_esr = $7,
             flow_meter_integrated = $8,
             rca_integrated = $9,
             pressure_transmitter_integrated = $10
         WHERE region_name = $11`,
        [
          totals.totalSchemes,
          totals.fullyCompletedSchemes,
          totals.totalVillagesIntegrated,
          totals.fullyCompletedVillages,
          totals.totalEsrIntegrated,
          totals.fullyCompletedEsr,
          totals.partialEsr,
          totals.flowMeterIntegrated,
          totals.rcaIntegrated,
          totals.pressureTransmitterIntegrated,
          regionName
        ]
      );
      
      console.log(`  ✅ Updated ${regionName} summaries successfully`);
    }
    
    console.log('\n✅ All region summaries updated successfully');
    
  } catch (err) {
    console.error('Error updating region summaries:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the update
updateRegionSummaries().catch(console.error);