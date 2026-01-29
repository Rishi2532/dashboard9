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
  console.log('Starting database initialization...');
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connected to database, inserting sample data...');
    
    // Check if regions table already has data
    const regionsCount = await pool.query('SELECT COUNT(*) FROM region');
    
    if (parseInt(regionsCount.rows[0].count, 10) === 0) {
      console.log('Adding sample region data...');
      
      // Insert region data
      await pool.query(`
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
    const schemesCount = await pool.query('SELECT COUNT(*) FROM scheme_status');
    
    if (parseInt(schemesCount.rows[0].count, 10) === 0) {
      console.log('Adding sample scheme data...');
      
      // Generate scheme IDs for sample data
      const schemeId1 = 'NS-001';
      const schemeId2 = 'NS-002';
      const schemeId3 = 'NS-003';
      
      // Insert scheme data
      await pool.query(`
        INSERT INTO scheme_status (
          sr_no, scheme_id, region, scheme_name, number_of_village, total_villages_integrated,
          no_of_functional_village, no_of_partial_village, no_of_non_functional_village,
          fully_completed_villages, total_number_of_esr, scheme_functional_status,
          total_esr_integrated, no_fully_completed_esr, balance_to_complete_esr,
          flow_meters_connected, pressure_transmitter_connected, residual_chlorine_analyzer_connected,
          fully_completion_scheme_status
        )
        VALUES 
          (1, $1, 'Nashik', 'Retro. Bargaonpimpri & 6 VRWSS Tal Sinnar', 7, 7, 5, 2, 0, 0, 16, 'Functional', 
           16, 0, 16, 7, 0, 11, 'Partial'),
          
          (2, $2, 'Nashik', 'Ozar-Sakore & 2 Villages', 4, 4, 3, 1, 0, 1, 10, 'Functional', 
           8, 5, 5, 6, 5, 7, 'Partial'),
           
          (3, $3, 'Pune', 'Pune Rural Water Supply Scheme', 5, 5, 4, 1, 0, 4, 7, 'Functional', 
           7, 5, 2, 5, 3, 5, 'Fully Completed')
      `, [schemeId1, schemeId2, schemeId3]);
      
      console.log('Sample scheme data added successfully');
    } else {
      console.log('Scheme data already exists, skipping...');
    }
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();