// This script updates flow meter, RCA, and pressure transmitter values in the region table
// Use ES module imports for compatibility with package.json type: "module"
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// Direct database connection for utility script
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateRegionValues() {
  try {
    console.log("Starting region data update...");
    const client = await pool.connect();
    
    try {
      // Get all regions first
      const { rows: allRegions } = await client.query('SELECT * FROM region');
      
      console.log(`Found ${allRegions.length} regions in database`);
      
      // Sample values for flow meters, RCA, and pressure transmitters based on previous hardcoded data
      const regionUpdates = [
        {
          name: "Nagpur",
          flow_meter_integrated: 113,
          rca_integrated: 113, 
          pressure_transmitter_integrated: 63
        },
        {
          name: "Chhatrapati Sambhajinagar",
          flow_meter_integrated: 132,
          rca_integrated: 138,
          pressure_transmitter_integrated: 93
        },
        {
          name: "Pune",
          flow_meter_integrated: 95,
          rca_integrated: 65,
          pressure_transmitter_integrated: 49
        },
        {
          name: "Konkan",
          flow_meter_integrated: 11,
          rca_integrated: 10,
          pressure_transmitter_integrated: 3
        },
        {
          name: "Amravati",
          flow_meter_integrated: 143,
          rca_integrated: 95,
          pressure_transmitter_integrated: 111
        },
        {
          name: "Nashik",
          flow_meter_integrated: 89,
          rca_integrated: 91,
          pressure_transmitter_integrated: 38
        }
      ];
      
      // Update each region
      for (const update of regionUpdates) {
        const region = allRegions.find(r => r.region_name === update.name);
        
        if (region) {
          console.log(`Updating region ${update.name} with:`, update);
          
          await client.query(
            `UPDATE region SET 
              flow_meter_integrated = $1,
              rca_integrated = $2,
              pressure_transmitter_integrated = $3
            WHERE region_id = $4`,
            [
              update.flow_meter_integrated,
              update.rca_integrated,
              update.pressure_transmitter_integrated,
              region.region_id
            ]
          );
            
          console.log(`Updated ${update.name} successfully`);
        } else {
          console.log(`Region ${update.name} not found`);
        }
      }
      
      // Verify the updates
      const { rows: updatedRegions } = await client.query('SELECT * FROM region');
      
      console.log("\nVerifying updated values:");
      for (const region of updatedRegions) {
        console.log(`${region.region_name}:`, {
          flow_meter: region.flow_meter_integrated,
          rca: region.rca_integrated,
          pt: region.pressure_transmitter_integrated
        });
      }
      
      console.log("Region updates completed successfully");
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error("Error updating region data:", error);
  }
}

// Run the update
updateRegionValues();