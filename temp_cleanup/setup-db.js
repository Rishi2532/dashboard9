/**
 * Database Setup Script for PostgreSQL on Replit
 * 
 * This script sets up the database tables and sample data
 * for the Maharashtra Water Dashboard application.
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

async function setupDatabase() {
  console.log('========================================');
  console.log('Database Setup for Maharashtra Water Dashboard');
  console.log('========================================\n');
  
  console.log('Connecting to PostgreSQL database...');
  
  const client = await pool.connect();
  try {
    console.log('✅ Connected to PostgreSQL database successfully');
    
    // PART 1: Check and create tables
    console.log('\n📊 Checking database tables...');
    
    // Check if key tables exist
    const tables = ['region', 'scheme_status', 'app_state', 'users'];
    
    for (const table of tables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log(`Creating missing table: ${table}...`);
        
        if (table === 'region') {
          await client.query(`
            CREATE TABLE region (
              region_id SERIAL PRIMARY KEY,
              region_name TEXT NOT NULL,
              total_schemes_integrated INTEGER,
              fully_completed_schemes INTEGER,
              total_villages_integrated INTEGER,
              fully_completed_villages INTEGER,
              total_esr_integrated INTEGER,
              fully_completed_esr INTEGER,
              partial_esr INTEGER,
              flow_meter_integrated INTEGER,
              rca_integrated INTEGER,
              pressure_transmitter_integrated INTEGER
            );
          `);
          console.log('✅ Created region table');
        }
        
        if (table === 'scheme_status') {
          await client.query(`
            CREATE TABLE scheme_status (
              sr_no INTEGER,
              scheme_id TEXT PRIMARY KEY,
              region TEXT,
              circle TEXT,
              division TEXT,
              sub_division TEXT,
              block TEXT,
              scheme_name TEXT NOT NULL,
              agency TEXT,
              number_of_village INTEGER,
              total_villages_integrated INTEGER,
              total_villages_in_scheme INTEGER,
              no_of_functional_village INTEGER,
              no_of_partial_village INTEGER,
              no_of_non_functional_village INTEGER,
              fully_completed_villages INTEGER,
              total_number_of_esr INTEGER,
              scheme_functional_status TEXT,
              total_esr_integrated INTEGER,
              no_fully_completed_esr INTEGER,
              balance_to_complete_esr INTEGER,
              flow_meters_connected INTEGER,
              fm_integrated INTEGER,
              pressure_transmitter_connected INTEGER,
              pt_integrated INTEGER,
              residual_chlorine_analyzer_connected INTEGER,
              rca_integrated INTEGER,
              fully_completion_scheme_status TEXT
            );
          `);
          console.log('✅ Created scheme_status table');
        }
        
        if (table === 'app_state') {
          await client.query(`
            CREATE TABLE app_state (
              key TEXT PRIMARY KEY,
              value JSONB NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);
          console.log('✅ Created app_state table');
        }
        
        if (table === 'users') {
          await client.query(`
            CREATE TABLE users (
              id SERIAL PRIMARY KEY,
              username TEXT NOT NULL UNIQUE,
              password TEXT NOT NULL,
              name TEXT,
              role TEXT NOT NULL DEFAULT 'user'
            );
            
            -- Insert default admin user (username: admin, password: admin123)
            INSERT INTO users (username, password, name, role) 
            VALUES ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MUZWRVnj0MSKqgq9tHKkEzJqDBK5pG', 'Administrator', 'admin');
          `);
          console.log('✅ Created users table with default admin user (admin/admin123)');
        }
      } else {
        console.log(`✅ Table ${table} already exists`);
      }
    }
    
    // PART 2: Check data exists in tables
    console.log('\n📈 Checking data in tables...');
    
    // Check regions data
    const regionCount = await client.query('SELECT COUNT(*) FROM region');
    if (parseInt(regionCount.rows[0].count) === 0) {
      console.log('Adding default regions data...');
      
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
      console.log(`✅ Region table has ${regionCount.rows[0].count} regions`);
    }
    
    // Check scheme_status data
    const schemeCount = await client.query('SELECT COUNT(*) FROM scheme_status');
    if (parseInt(schemeCount.rows[0].count) === 0) {
      console.log('No schemes found. Generating sample schemes for each region...');
      
      // Get regions to create sample schemes
      const regions = await client.query('SELECT * FROM region');
      
      for (const region of regions.rows) {
        const regionName = region.region_name;
        console.log(`  Creating schemes for ${regionName}...`);
        
        // Create sample schemes based on total_schemes_integrated count
        const numSchemesToCreate = parseInt(region.total_schemes_integrated) || 1;
        
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
        }
      }
      
      console.log('✅ Created sample schemes for all regions');
    } else {
      console.log(`✅ Scheme_status table has ${schemeCount.rows[0].count} schemes`);
    }
    
    // PART 3: Fix schema issues
    console.log('\n🔧 Checking for schema issues...');
    
    // Fix functional status values to ensure they're text
    const wrongStatusCount = await client.query(
      `SELECT COUNT(*) FROM scheme_status 
       WHERE scheme_functional_status IS NOT NULL 
       AND scheme_functional_status NOT IN ('Functional', 'Partial')`
    );
    
    if (parseInt(wrongStatusCount.rows[0].count) > 0) {
      console.log('Fixing functional status values...');
      
      await client.query(
        `UPDATE scheme_status 
         SET scheme_functional_status = 'Functional' 
         WHERE scheme_functional_status IN ('true', '1') 
         OR scheme_functional_status::text = 'true'`
      );
      
      await client.query(
        `UPDATE scheme_status 
         SET scheme_functional_status = 'Partial' 
         WHERE scheme_functional_status IN ('false', '0')
         OR scheme_functional_status::text = 'false'`
      );
      
      console.log('✅ Fixed functional status values');
    } else {
      console.log('✅ Functional status values are correct');
    }
    
    // PART 4: Update summary
    console.log('\n✨ Setup Complete! ✨');
    console.log('\nYour application is now ready to run:');
    console.log('  1. Start your application with: npm run dev');
    console.log('  2. Access the dashboard at your Replit URL');
    console.log('  3. Login with: admin / admin123');
    
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the setup
setupDatabase().catch(console.error);