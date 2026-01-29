/**
 * Database Initialization Script
 * 
 * This script initializes the database with sample data for the 
 * Maharashtra Water Dashboard application.
 */
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' && {
      rejectUnauthorized: false,
    },
  });

  console.log('Connected to database. Initializing with sample data...');

  try {
    const client = await pool.connect();
    
    try {
      // Check if regions table already has data
      const regionsCount = await client.query('SELECT COUNT(*) FROM region');
      
      if (parseInt(regionsCount.rows[0].count, 10) === 0) {
        console.log('Adding sample region data...');
        
        // Insert region data
        await client.query(`
          INSERT INTO region (region_name, total_esr_integrated, fully_completed_esr, partial_esr, 
                            total_villages_integrated, fully_completed_villages, 
                            total_schemes_integrated, fully_completed_schemes,
                            flow_meter_integrated, rca_integrated, pressure_transmitter_integrated)
          VALUES 
            ('Nagpur', 117, 58, 58, 91, 38, 15, 9, 113, 113, 63),
            ('Chhatrapati Sambhajinagar', 147, 73, 69, 140, 71, 10, 2, 132, 138, 93),
            ('Pune', 97, 31, 66, 53, 16, 9, 0, 95, 65, 49),
            ('Konkan', 11, 1, 10, 11, 0, 4, 0, 11, 10, 3),
            ('Amravati', 149, 59, 86, 121, 24, 11, 1, 143, 95, 111),
            ('Nashik', 106, 23, 46, 76, 4, 14, 1, 81, 82, 38)
        `);
        
        console.log('Sample region data added successfully');
      } else {
        console.log('Regions data already exists, skipping...');
      }
      
      // Check if schemes table already has data
      const schemesCount = await client.query('SELECT COUNT(*) FROM scheme_status');
      
      if (parseInt(schemesCount.rows[0].count, 10) === 0) {
        console.log('Adding sample scheme data...');
        
        // Get all regions
        const regions = await client.query('SELECT * FROM region');
        
        // For each region, create some sample schemes
        for (const region of regions.rows) {
          const regionName = region.region_name;
          const agency = getAgencyByRegion(regionName);
          
          console.log(`Creating schemes for ${regionName}...`);
          
          // Number of schemes to create per region (based on total_schemes_integrated)
          const schemesToCreate = region.total_schemes_integrated || 5;
          
          for (let i = 0; i < schemesToCreate; i++) {
            const schemeId = `${regionName.substring(0, 3).toUpperCase()}-${i + 1000}`;
            const schemeName = `${regionName} Water Scheme ${i + 1}`;
            
            // Random values for villages and ESR counts
            const totalVillages = Math.floor(Math.random() * 10) + 1;
            const totalESR = Math.floor(Math.random() * 5) + 1;
            const integratedVillages = Math.min(totalVillages, Math.floor(Math.random() * totalVillages) + 1);
            const fullyCompletedVillages = Math.min(integratedVillages, Math.floor(Math.random() * integratedVillages));
            const integratedESR = Math.min(totalESR, Math.floor(Math.random() * totalESR) + 1);
            const fullyCompletedESR = Math.min(integratedESR, Math.floor(Math.random() * integratedESR));
            
            // Status based on completion
            const schemeStatus = fullyCompletedVillages === totalVillages ? 'Fully Completed' : 'Partial';
            const completionStatus = fullyCompletedVillages === totalVillages ? 'Full Integration' : 'Partial';
            
            // Insert scheme
            await client.query(`
              INSERT INTO scheme_status (
                scheme_id, region, scheme_name, agency, 
                number_of_village, total_villages_integrated, total_villages_in_scheme, 
                fully_completed_villages, no_of_functional_village, no_of_partial_village,
                total_number_of_esr, total_esr_integrated, no_fully_completed_esr,
                scheme_functional_status, fully_completion_scheme_status,
                flow_meters_connected, pressure_transmitter_connected, residual_chlorine_analyzer_connected
              ) VALUES (
                $1, $2, $3, $4, 
                $5, $6, $7, 
                $8, $9, $10,
                $11, $12, $13,
                $14, $15,
                $16, $17, $18
              )
            `, [
              schemeId, regionName, schemeName, agency,
              totalVillages, integratedVillages, totalVillages,
              fullyCompletedVillages, fullyCompletedVillages, integratedVillages - fullyCompletedVillages,
              totalESR, integratedESR, fullyCompletedESR,
              schemeStatus, completionStatus,
              Math.floor(Math.random() * integratedESR) + 1,
              Math.floor(Math.random() * integratedESR) + 1,
              Math.floor(Math.random() * integratedESR) + 1
            ]);
            
            // Create sample water_scheme_data for each scheme and its villages
            for (let v = 0; v < totalVillages; v++) {
              const villageName = `${regionName} Village ${v + 1}`;
              const population = Math.floor(Math.random() * 5000) + 500;
              
              // Generate LPCD data for 7 days
              const lpcdValues = [];
              const waterValues = [];
              
              for (let day = 0; day < 7; day++) {
                // Generate reasonable water values
                const waterValue = Math.random() * population * 0.15; // approx water in kl
                waterValues.push(waterValue);
                
                // Calculate LPCD
                const lpcd = (waterValue * 1000) / population;
                lpcdValues.push(lpcd);
              }
              
              // Get date string for each day (last 7 days)
              const dates = [];
              for (let d = 6; d >= 0; d--) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                dates.push(date.toISOString().split('T')[0]);
              }
              
              // Insert water scheme data
              await client.query(`
                INSERT INTO water_scheme_data (
                  region, scheme_id, scheme_name, village_name, population, number_of_esr,
                  water_value_day1, water_value_day2, water_value_day3, water_value_day4, water_value_day5, water_value_day6,
                  lpcd_value_day1, lpcd_value_day2, lpcd_value_day3, lpcd_value_day4, lpcd_value_day5, lpcd_value_day6, lpcd_value_day7,
                  water_date_day1, water_date_day2, water_date_day3, water_date_day4, water_date_day5, water_date_day6,
                  lpcd_date_day1, lpcd_date_day2, lpcd_date_day3, lpcd_date_day4, lpcd_date_day5, lpcd_date_day6, lpcd_date_day7,
                  below_55_lpcd_count, above_55_lpcd_count
                ) VALUES (
                  $1, $2, $3, $4, $5, $6,
                  $7, $8, $9, $10, $11, $12,
                  $13, $14, $15, $16, $17, $18, $19,
                  $20, $21, $22, $23, $24, $25,
                  $26, $27, $28, $29, $30, $31, $32,
                  $33, $34
                )
              `, [
                regionName, schemeId, schemeName, villageName, population, Math.min(2, totalESR),
                waterValues[0], waterValues[1], waterValues[2], waterValues[3], waterValues[4], waterValues[5],
                lpcdValues[0], lpcdValues[1], lpcdValues[2], lpcdValues[3], lpcdValues[4], lpcdValues[5], lpcdValues[6],
                dates[0], dates[1], dates[2], dates[3], dates[4], dates[5],
                dates[0], dates[1], dates[2], dates[3], dates[4], dates[5], dates[6],
                lpcdValues.filter(v => v < 55).length,
                lpcdValues.filter(v => v >= 55).length
              ]);
            }
          }
        }
        
        console.log('Sample scheme data added successfully');
      } else {
        console.log('Scheme data already exists, skipping...');
      }
      
      console.log('Database initialization completed successfully');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

// Helper function to determine agency by region
function getAgencyByRegion(regionName) {
  const regionAgencyMap = {
    'Nagpur': 'MRRDA',
    'Amravati': 'MSRDC',
    'Chhatrapati Sambhajinagar': 'MRRDA',
    'Nashik': 'MJP',
    'Pune': 'MSRDC',
    'Konkan': 'MJP'
  };
  
  return regionAgencyMap[regionName] || 'MRRDA';
}

// Run the script
initializeDatabase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});