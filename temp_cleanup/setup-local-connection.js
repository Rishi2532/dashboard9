/**
 * Local Database Connection Setup Script
 * 
 * This script helps configure the application to use a local PostgreSQL database
 * that has been set up and populated in pgAdmin.
 */

const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Create a PostgreSQL client
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Function to check if tables exist and create them if they don't
async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    // Check if regions table exists
    const regionsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'regions'
      );
    `);
    
    // Check if scheme_status table exists
    const schemeStatusCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scheme_status'
      );
    `);
    
    // Check if updates table exists
    const updatesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'updates'
      );
    `);
    
    // Check if users table exists
    const usersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('Table existence check results:');
    console.log('- regions table exists:', regionsCheck.rows[0].exists);
    console.log('- scheme_status table exists:', schemeStatusCheck.rows[0].exists);
    console.log('- updates table exists:', updatesCheck.rows[0].exists);
    console.log('- users table exists:', usersCheck.rows[0].exists);
    
    if (!regionsCheck.rows[0].exists) {
      console.log('Creating regions table...');
      await client.query(`
        CREATE TABLE regions (
          region_id SERIAL PRIMARY KEY,
          region_name TEXT NOT NULL,
          total_schemes_integrated INTEGER,
          fully_completed_schemes INTEGER,
          total_villages_integrated INTEGER,
          fully_completed_villages INTEGER,
          total_esr_integrated INTEGER,
          fully_completed_esr INTEGER,
          flow_meter_integrated INTEGER,
          rca_integrated INTEGER,
          pressure_transmitter_integrated INTEGER
        );
      `);
      console.log('Regions table created successfully');
    }
    
    if (!schemeStatusCheck.rows[0].exists) {
      console.log('Creating scheme_status table...');
      await client.query(`
        CREATE TABLE scheme_status (
          sr_no SERIAL PRIMARY KEY,
          scheme_id TEXT UNIQUE,
          region_name TEXT,
          district TEXT,
          taluka TEXT,
          scheme_name TEXT,
          agency TEXT,
          villages INTEGER,
          villages_integrated INTEGER,
          fully_completed_villages INTEGER,
          total_esr INTEGER,
          esr_integrated INTEGER,
          fully_completed_esr INTEGER,
          project_cost DECIMAL(15, 2),
          scheme_status TEXT,
          scheme_functional_status TEXT,
          flow_meters_connected INTEGER,
          pressure_transmitters_connected INTEGER,
          residual_chlorine_connected INTEGER,
          ph_meters_connected INTEGER,
          turbidity_meters_connected INTEGER,
          tds_meters_connected INTEGER,
          villages_status TEXT,
          esr_status TEXT,
          scheme_completion_percent DECIMAL(5, 2),
          location_latitude DECIMAL(11, 8),
          location_longitude DECIMAL(11, 8)
        );
      `);
      console.log('Scheme_status table created successfully');
    }
    
    if (!updatesCheck.rows[0].exists) {
      console.log('Creating updates table...');
      await client.query(`
        CREATE TABLE updates (
          id SERIAL PRIMARY KEY,
          date DATE,
          type TEXT,
          count INTEGER,
          region TEXT,
          affected_ids TEXT[]
        );
      `);
      console.log('Updates table created successfully');
    }
    
    if (!usersCheck.rows[0].exists) {
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE
        );
        
        -- Insert default admin user (username: admin, password: admin123)
        INSERT INTO users (username, password, is_admin) 
        VALUES ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MUZWRVnj0MSKqgq9tHKkEzJqDBK5pG', TRUE);
      `);
      console.log('Users table created successfully with default admin user');
    }
    
    // Check if we should import backup data
    if (!regionsCheck.rows[0].exists || !schemeStatusCheck.rows[0].exists) {
      console.log('\nYou need to import data from the backup file.');
      console.log('Run the following command to import the SQL backup:');
      console.log('psql -U postgres -d water_scheme_dashboard -f database_backup.sql');
      console.log('\nOr use the pgAdmin tool to restore the database from the backup file.');
    } else {
      // Check if tables have data
      const regionsCount = await client.query('SELECT COUNT(*) FROM regions');
      const schemesCount = await client.query('SELECT COUNT(*) FROM scheme_status');
      
      console.log('\nData count:');
      console.log('- Regions count:', regionsCount.rows[0].count);
      console.log('- Schemes count:', schemesCount.rows[0].count);
      
      if (regionsCount.rows[0].count === '0' || schemesCount.rows[0].count === '0') {
        console.log('\nYour tables have no data. You need to import data from the backup file.');
        console.log('Run the following command to import the SQL backup:');
        console.log('psql -U postgres -d water_scheme_dashboard -f database_backup.sql');
        console.log('\nOr use the pgAdmin tool to restore the database from the backup file.');
      }
    }
    
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

setupDatabase();