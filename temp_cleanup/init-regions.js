/**
 * Initialize regions data for Maharashtra Water Dashboard
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

async function initializeRegions() {
  console.log('Initializing regions data...');
  
  const client = await pool.connect();
  try {
    // Check if regions already exist
    const regionCount = await client.query('SELECT COUNT(*) FROM region');
    
    if (parseInt(regionCount.rows[0].count) === 0) {
      console.log('Adding default regions...');
      
      // Insert Maharashtra regions with default values
      await client.query(`
        INSERT INTO region (region_name, total_schemes_integrated, fully_completed_schemes, 
                           total_villages_integrated, fully_completed_villages, 
                           total_esr_integrated, fully_completed_esr, partial_esr,
                           flow_meter_integrated, rca_integrated, pressure_transmitter_integrated) 
        VALUES 
        ('Nagpur', 16, 8, 136, 59, 164, 87, 77, 120, 121, 66),
        ('Amravati', 11, 3, 103, 34, 123, 42, 81, 157, 114, 116),
        ('Chhatrapati Sambhajinagar', 11, 4, 87, 21, 143, 57, 86, 136, 143, 96),
        ('Nashik', 15, 0, 130, 54, 181, 87, 94, 113, 114, 47),
        ('Pune', 13, 0, 95, 0, 119, 0, 119, 160, 126, 74),
        ('Konkan', 4, 0, 47, 8, 51, 14, 37, 11, 10, 3);
      `);
      
      console.log('✅ Added default regions data');
    } else {
      console.log(`✅ Region table already has ${regionCount.rows[0].count} regions`);
    }
    
    // Verify data was inserted
    const regions = await client.query('SELECT * FROM region');
    console.log(`Regions in database: ${regions.rows.length}`);
    regions.rows.forEach(region => {
      console.log(`- ${region.region_name}`);
    });
    
    console.log('\n✅ Regions initialization complete');
    
  } catch (err) {
    console.error('Error initializing regions:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the initialization
initializeRegions().catch(console.error);