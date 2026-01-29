/**
 * Water Scheme Data Initialization Script
 * 
 * This script initializes the water_scheme_data table with sample data.
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function initializeWaterSchemeData() {
  console.log('Starting water scheme data initialization...');
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connected to database, checking water scheme data...');
    
    // Check if water_scheme_data table already has data
    const dataCount = await pool.query('SELECT COUNT(*) FROM water_scheme_data');
    
    if (parseInt(dataCount.rows[0].count, 10) === 0) {
      console.log('Adding sample water scheme data...');
      
      // Insert water scheme data for existing schemes
      await pool.query(`
        INSERT INTO water_scheme_data (
          region, circle, division, sub_division, block, scheme_id, scheme_name, 
          village_name, population, number_of_esr, 
          water_value_day1, water_value_day2, water_value_day3, water_value_day4, water_value_day5, water_value_day6,
          lpcd_value_day1, lpcd_value_day2, lpcd_value_day3, lpcd_value_day4, lpcd_value_day5, lpcd_value_day6, lpcd_value_day7,
          water_date_day1, water_date_day2, water_date_day3, water_date_day4, water_date_day5, water_date_day6,
          lpcd_date_day1, lpcd_date_day2, lpcd_date_day3, lpcd_date_day4, lpcd_date_day5, lpcd_date_day6, lpcd_date_day7,
          consistent_zero_lpcd_for_a_week, below_55_lpcd_count, above_55_lpcd_count
        )
        VALUES 
          (
            'Nashik', 'Nashik', 'Nashik', 'Sinnar', 'Sinnar', 'NS-001', 'Retro. Bargaonpimpri & 6 VRWSS Tal Sinnar', 
            'Bargaonpimpri', 5200, 3,
            120.5, 115.3, 119.8, 122.1, 118.7, 125.0,
            65.2, 63.8, 64.5, 66.2, 62.9, 67.8, 68.1,
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18',
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18', '2025-04-19',
            0, 0, 7
          ),
          (
            'Nashik', 'Nashik', 'Nashik', 'Ozar', 'Ozar', 'NS-002', 'Ozar-Sakore & 2 Villages', 
            'Ozar', 3800, 2,
            95.2, 92.8, 94.5, 98.3, 90.1, 97.2,
            55.3, 54.2, 55.9, 58.2, 52.8, 56.9, 57.1,
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18',
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18', '2025-04-19',
            0, 3, 4
          ),
          (
            'Pune', 'Pune', 'Pune Rural', 'Pune East', 'Wagholi', 'NS-003', 'Pune Rural Water Supply Scheme', 
            'Wagholi', 6500, 4,
            158.5, 162.3, 155.8, 159.1, 160.7, 158.2,
            75.6, 78.2, 73.4, 76.8, 75.9, 74.5, 76.2,
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18',
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18', '2025-04-19',
            0, 0, 7
          ),
          (
            'Nashik', 'Nashik', 'Nashik', 'Sinnar', 'Sinnar', 'NS-004', 'Sinnar Village Supply', 
            'Sinnar', 2800, 2,
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18',
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18', '2025-04-19',
            1, 7, 0
          ),
          (
            'Pune', 'Pune', 'Pune Rural', 'Pune East', 'Wagholi', 'NS-005', 'Pune East Supply', 
            'East Pune', 4200, 3,
            42.5, 41.8, 40.2, 42.1, 43.5, 39.8,
            35.2, 34.8, 33.5, 35.1, 36.2, 33.2, 34.5,
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18',
            '2025-04-13', '2025-04-14', '2025-04-15', '2025-04-16', '2025-04-17', '2025-04-18', '2025-04-19',
            0, 7, 0
          )
      `);
      
      console.log('Sample water scheme data added successfully');
    } else {
      console.log('Water scheme data already exists, skipping...');
    }
    
    console.log('Water scheme data initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing water scheme data:', error);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeWaterSchemeData();
