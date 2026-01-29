/**
 * Targeted Import Script for Specific Villages
 * 
 * This script specifically imports data for KHUPTI, KARAJGAON, and KHARWANDI
 * ensuring their water consumption and LPCD values are correctly preserved
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function importSpecificVillages() {
  console.log('Starting targeted import for specific villages...');
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Define the specific villages and their data
    const villagesData = [
      {
        scheme_id: '5348540',
        village_name: 'KHUPTI',
        region: 'Nashik',
        circle: 'Ahmednagar',
        division: 'Ahmednagar',
        sub_division: 'Newasa',
        block: 'Nevasa',
        scheme_name: 'Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa',
        population: 2338,
        number_of_esr: 2,
        water_value_day1: 2.36,
        water_value_day2: 1.52,
        water_value_day3: 1.70,
        water_value_day4: 1.46,
        water_value_day5: 1.18,
        water_value_day6: 1.30,
        lpcd_value_day1: 68.18,
        lpcd_value_day2: 101.06,
        lpcd_value_day3: 64.90,
        lpcd_value_day4: 72.62,
        lpcd_value_day5: 62.65,
        lpcd_value_day6: 50.59,
        lpcd_value_day7: 55.49,
        water_date_day1: '12-Apr',
        water_date_day2: '13-Apr',
        water_date_day3: '14-Apr',
        water_date_day4: '15-Apr',
        water_date_day5: '16-Apr',
        water_date_day6: '17-Apr',
        lpcd_date_day1: '11-Apr',
        lpcd_date_day2: '12-Apr',
        lpcd_date_day3: '13-Apr',
        lpcd_date_day4: '14-Apr',
        lpcd_date_day5: '15-Apr',
        lpcd_date_day6: '16-Apr',
        lpcd_date_day7: '17-Apr',
        consistent_zero_lpcd_for_a_week: 0,
        below_55_lpcd_count: 4,
        above_55_lpcd_count: 0
      },
      {
        scheme_id: '5348540',
        village_name: 'KARAJGAON',
        region: 'Nashik',
        circle: 'Ahmednagar',
        division: 'Ahmednagar',
        sub_division: 'Newasa',
        block: 'Nevasa',
        scheme_name: 'Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa',
        population: 3750,
        number_of_esr: 3,
        water_value_day1: 1.99,
        water_value_day2: 2.10,
        water_value_day3: 2.11,
        water_value_day4: 1.81,
        water_value_day5: 1.04,
        water_value_day6: 2.01,
        lpcd_value_day1: 50.93,
        lpcd_value_day2: 53.00,
        lpcd_value_day3: 56.08,
        lpcd_value_day4: 56.25,
        lpcd_value_day5: 48.29,
        lpcd_value_day6: 27.75,
        lpcd_value_day7: 53.64,
        water_date_day1: '12-Apr',
        water_date_day2: '13-Apr',
        water_date_day3: '14-Apr',
        water_date_day4: '15-Apr',
        water_date_day5: '16-Apr',
        water_date_day6: '17-Apr',
        lpcd_date_day1: '11-Apr',
        lpcd_date_day2: '12-Apr',
        lpcd_date_day3: '13-Apr',
        lpcd_date_day4: '14-Apr',
        lpcd_date_day5: '15-Apr',
        lpcd_date_day6: '16-Apr',
        lpcd_date_day7: '17-Apr',
        consistent_zero_lpcd_for_a_week: 0,
        below_55_lpcd_count: 2,
        above_55_lpcd_count: 0
      },
      {
        scheme_id: '5348540',
        village_name: 'KHARWANDI',
        region: 'Nashik',
        circle: 'Ahmednagar',
        division: 'Ahmednagar',
        sub_division: 'Newasa',
        block: 'Nevasa',
        scheme_name: 'Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa',
        population: 6263,
        number_of_esr: 2,
        water_value_day1: 1.71,
        water_value_day2: 1.78,
        water_value_day3: 1.99,
        water_value_day4: 1.83,
        water_value_day5: 1.62,
        water_value_day6: 1.22,
        lpcd_value_day1: 26.97,
        lpcd_value_day2: 27.29,
        lpcd_value_day3: 28.46,
        lpcd_value_day4: 31.72,
        lpcd_value_day5: 29.21,
        lpcd_value_day6: 25.90,
        lpcd_value_day7: 19.44,
        water_date_day1: '12-Apr',
        water_date_day2: '13-Apr',
        water_date_day3: '14-Apr',
        water_date_day4: '15-Apr',
        water_date_day5: '16-Apr',
        water_date_day6: '17-Apr',
        lpcd_date_day1: '11-Apr',
        lpcd_date_day2: '12-Apr',
        lpcd_date_day3: '13-Apr',
        lpcd_date_day4: '14-Apr',
        lpcd_date_day5: '15-Apr',
        lpcd_date_day6: '16-Apr',
        lpcd_date_day7: '17-Apr',
        consistent_zero_lpcd_for_a_week: 0,
        below_55_lpcd_count: 7,
        above_55_lpcd_count: 0
      }
    ];
    
    // Delete existing entries for these villages
    for (const village of villagesData) {
      const deleteQuery = {
        text: 'DELETE FROM water_scheme_data WHERE scheme_id = $1 AND village_name = $2',
        values: [village.scheme_id, village.village_name]
      };
      
      await client.query(deleteQuery);
      console.log(`Deleted existing record for ${village.village_name}`);
    }
    
    // Insert the data with precise values
    for (const village of villagesData) {
      const columns = Object.keys(village);
      const values = Object.values(village);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertQuery = {
        text: `INSERT INTO water_scheme_data (${columns.join(', ')}) VALUES (${placeholders})`,
        values: values
      };
      
      await client.query(insertQuery);
      console.log(`Inserted record for ${village.village_name} with water_value_day6=${village.water_value_day6}, lpcd_value_day7=${village.lpcd_value_day7}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Successfully imported water scheme data for the specific villages');
    
    // Verify the data
    const verifyQuery = {
      text: 'SELECT scheme_id, village_name, water_value_day6, lpcd_value_day7 FROM water_scheme_data WHERE scheme_id = $1 AND village_name IN ($2, $3, $4)',
      values: ['5348540', 'KHUPTI', 'KARAJGAON', 'KHARWANDI']
    };
    
    const result = await client.query('SELECT scheme_id, village_name, water_value_day6, lpcd_value_day7 FROM water_scheme_data WHERE scheme_id = $1 AND village_name IN ($2, $3, $4)', 
      ['5348540', 'KHUPTI', 'KARAJGAON', 'KHARWANDI']);
    
    console.log('Verification results:');
    result.rows.forEach(row => {
      console.log(`  ${row.scheme_id} - ${row.village_name}: water_value_day6=${row.water_value_day6}, lpcd_value_day7=${row.lpcd_value_day7}`);
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error(`Error importing specific villages: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the import
importSpecificVillages().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
});