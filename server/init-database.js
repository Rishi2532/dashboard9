/**
 * Database Initialization Script
 * 
 * This script automatically sets up the database with all required tables and columns
 * when the project is first started or remixed. It will check for the existence of
 * tables and columns and add any missing ones.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// First, store any existing Replit environment variables to preserve them
const replitDatabaseUrl = process.env.DATABASE_URL;
const replitPgHost = process.env.PGHOST;
const replitPgUser = process.env.PGUSER;
const replitPgPassword = process.env.PGPASSWORD;
const replitPgDatabase = process.env.PGDATABASE;
const replitPgPort = process.env.PGPORT;

// Load environment variables from .env file
dotenv.config();

// Now restore Replit environment variables if they exist (they take priority)
if (replitDatabaseUrl) {
  process.env.DATABASE_URL = replitDatabaseUrl;
  console.log("Using Replit-provided DATABASE_URL for database initialization");
}
if (replitPgHost) process.env.PGHOST = replitPgHost;
if (replitPgUser) process.env.PGUSER = replitPgUser;
if (replitPgPassword) process.env.PGPASSWORD = replitPgPassword;
if (replitPgDatabase) process.env.PGDATABASE = replitPgDatabase;
if (replitPgPort) process.env.PGPORT = replitPgPort;

// Check for Replit environment and ensure DATABASE_URL is available
const isReplit = process.env.REPL_ID || process.env.REPLIT;
if (isReplit) {
  console.log("Database initialization: Replit environment detected!");
  console.log(`Database initialization: DATABASE_URL available: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
  
  // If DATABASE_URL is not set but individual components are available, construct it
  if (!process.env.DATABASE_URL && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    console.log("Database initialization: Constructing DATABASE_URL from individual Replit components...");
    process.env.DATABASE_URL = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}?sslmode=require`;
    console.log("Database initialization: Successfully constructed DATABASE_URL from individual components");
  }
}

const { Pool } = pg;

/**
 * Initialize the PostgreSQL database
 */
async function initializeDatabase() {
  console.log('📝 Starting database initialization check...');
  
  // Create a connection pool
  const poolConfig = {
    connectionString: process.env.DATABASE_URL
  };
  
  // Only add SSL for non-local connections
  const isLocalHost = process.env.DATABASE_URL?.includes('localhost') || 
                      process.env.DATABASE_URL?.includes('127.0.0.1');
                      
  if (process.env.NODE_ENV === 'production' && !isLocalHost) {
    poolConfig.ssl = {
      require: true,
      rejectUnauthorized: false,
    };
  }
  
  const pool = new Pool(poolConfig);
  
  try {
    console.log('🔄 Checking database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Create required tables if they don't exist
    console.log('🔄 Checking and creating required tables...');
    
    // Region table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "region" (
        "region_id" SERIAL PRIMARY KEY,
        "region_name" TEXT NOT NULL,
        "total_esr_integrated" INTEGER,
        "fully_completed_esr" INTEGER,
        "partial_esr" INTEGER,
        "total_villages_integrated" INTEGER,
        "fully_completed_villages" INTEGER,
        "total_schemes_integrated" INTEGER,
        "fully_completed_schemes" INTEGER,
        "flow_meter_integrated" INTEGER,
        "rca_integrated" INTEGER,
        "pressure_transmitter_integrated" INTEGER
      );
    `);
    
    // Scheme status table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "scheme_status" (
        "sr_no" INTEGER,
        "scheme_id" TEXT NOT NULL,
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_name" TEXT NOT NULL,
        "agency" TEXT,
        "number_of_village" INTEGER,
        "total_villages_integrated" INTEGER,
        "total_villages_in_scheme" INTEGER,
        "no_of_functional_village" INTEGER,
        "no_of_partial_village" INTEGER,
        "no_of_non_functional_village" INTEGER,
        "fully_completed_villages" INTEGER,
        "total_number_of_esr" INTEGER,
        "scheme_functional_status" TEXT,
        "total_esr_integrated" INTEGER,
        "no_fully_completed_esr" INTEGER,
        "balance_to_complete_esr" INTEGER,
        "flow_meters_connected" INTEGER,
        "pressure_transmitter_connected" INTEGER,
        "residual_chlorine_analyzer_connected" INTEGER,
        "fully_completion_scheme_status" TEXT,
        "dashboard_url" TEXT
      );
    `);
    
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user'
      );
    `);
    
    // App state table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Water scheme data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "water_scheme_data" (
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_id" VARCHAR(100),
        "scheme_name" TEXT,
        "village_name" TEXT,
        "population" INTEGER,
        "number_of_esr" INTEGER,
        "water_value_day1" DECIMAL(20,6),
        "water_value_day2" DECIMAL(20,6),
        "water_value_day3" DECIMAL(20,6),
        "water_value_day4" DECIMAL(20,6),
        "water_value_day5" DECIMAL(20,6),
        "water_value_day6" DECIMAL(20,6),
        "water_value_day7" DECIMAL(20,6),
        "lpcd_value_day1" DECIMAL(20,6),
        "lpcd_value_day2" DECIMAL(20,6),
        "lpcd_value_day3" DECIMAL(20,6),
        "lpcd_value_day4" DECIMAL(20,6),
        "lpcd_value_day5" DECIMAL(20,6),
        "lpcd_value_day6" DECIMAL(20,6),
        "lpcd_value_day7" DECIMAL(20,6),
        "water_date_day1" VARCHAR(20),
        "water_date_day2" VARCHAR(20),
        "water_date_day3" VARCHAR(20),
        "water_date_day4" VARCHAR(20),
        "water_date_day5" VARCHAR(20),
        "water_date_day6" VARCHAR(20),
        "water_date_day7" VARCHAR(20),
        "lpcd_date_day1" VARCHAR(20),
        "lpcd_date_day2" VARCHAR(20),
        "lpcd_date_day3" VARCHAR(20),
        "lpcd_date_day4" VARCHAR(20),
        "lpcd_date_day5" VARCHAR(20),
        "lpcd_date_day6" VARCHAR(20),
        "lpcd_date_day7" VARCHAR(20),
        "consistent_zero_lpcd_for_a_week" INTEGER,
        "below_55_lpcd_count" INTEGER,
        "above_55_lpcd_count" INTEGER,
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name")
      );
    `);
    
    // Water scheme data history table for permanent historical storage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "water_scheme_data_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "population" INTEGER,
        "number_of_esr" INTEGER,
        "data_date" VARCHAR(15) NOT NULL,
        "water_value" DECIMAL(20,6),
        "lpcd_value" DECIMAL(20,6),
        "uploaded_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "data_date", "uploaded_at")
      );
    `);
    
    // Chlorine data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "chlorine_data" (
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "chlorine_value_1" NUMERIC(12,2),
        "chlorine_value_2" NUMERIC(12,2),
        "chlorine_value_3" NUMERIC(12,2),
        "chlorine_value_4" NUMERIC(12,2),
        "chlorine_value_5" NUMERIC(12,2),
        "chlorine_value_6" NUMERIC(12,2),
        "chlorine_value_7" NUMERIC(12,2),
        "chlorine_date_day_1" VARCHAR(15),
        "chlorine_date_day_2" VARCHAR(15),
        "chlorine_date_day_3" VARCHAR(15),
        "chlorine_date_day_4" VARCHAR(15),
        "chlorine_date_day_5" VARCHAR(15),
        "chlorine_date_day_6" VARCHAR(15),
        "chlorine_date_day_7" VARCHAR(15),
        "number_of_consistent_zero_value_in_chlorine" INTEGER,
        "chlorine_less_than_02_mgl" NUMERIC(12,2),
        "chlorine_between_02_05_mgl" NUMERIC(12,2),
        "chlorine_greater_than_05_mgl" NUMERIC(12,2),
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);
    
    // Pressure data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "pressure_data" (
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_id" TEXT,
        "scheme_name" TEXT,
        "village_name" TEXT,
        "esr_name" TEXT,
        "pressure_value_1" DECIMAL(12,2),
        "pressure_value_2" DECIMAL(12,2),
        "pressure_value_3" DECIMAL(12,2),
        "pressure_value_4" DECIMAL(12,2),
        "pressure_value_5" DECIMAL(12,2),
        "pressure_value_6" DECIMAL(12,2),
        "pressure_value_7" DECIMAL(12,2),
        "pressure_date_day_1" VARCHAR(15),
        "pressure_date_day_2" VARCHAR(15),
        "pressure_date_day_3" VARCHAR(15),
        "pressure_date_day_4" VARCHAR(15),
        "pressure_date_day_5" VARCHAR(15),
        "pressure_date_day_6" VARCHAR(15),
        "pressure_date_day_7" VARCHAR(15),
        "number_of_consistent_zero_value_in_pressure" INTEGER,
        "pressure_less_than_02_bar" DECIMAL(12,2),
        "pressure_between_02_07_bar" DECIMAL(12,2),
        "pressure_greater_than_07_bar" DECIMAL(12,2),
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);
    
    // Check if the scheme_status table has the dashboard_url column
    const schemeColumnCheckResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_status' 
      AND column_name = 'dashboard_url';
    `);
    
    // Add the dashboard_url column if it doesn't exist
    if (schemeColumnCheckResult.rows.length === 0) {
      console.log('🔄 Adding missing dashboard_url column to scheme_status table...');
      await pool.query(`
        ALTER TABLE scheme_status 
        ADD COLUMN dashboard_url TEXT;
      `);
      console.log('✅ Successfully added dashboard_url column to scheme_status table');
    }
    
    // Check if the water_scheme_data table has the dashboard_url column
    const villageColumnCheckResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'water_scheme_data' 
      AND column_name = 'dashboard_url';
    `);
    
    // Add the dashboard_url column if it doesn't exist
    if (villageColumnCheckResult.rows.length === 0) {
      console.log('🔄 Adding missing dashboard_url column to water_scheme_data table...');
      await pool.query(`
        ALTER TABLE water_scheme_data 
        ADD COLUMN dashboard_url TEXT;
      `);
      console.log('✅ Successfully added dashboard_url column to water_scheme_data table');
    }
    
    // Check if there's an admin user, create one if not
    const usersResult = await pool.query(`SELECT COUNT(*) FROM "users"`);
    const usersCount = parseInt(usersResult.rows[0].count, 10);
    
    if (usersCount === 0) {
      console.log('🔄 Creating default admin user...');
      await pool.query(`
        INSERT INTO "users" ("username", "password", "name", "role") 
        VALUES ('admin', 'admin123', 'Administrator', 'admin')
      `);
      console.log('✅ Default admin user created successfully');
    }
    
    console.log('✅ Database initialization completed successfully');
    
    // Create a file to mark that the initialization has been done
    const initMarkerPath = path.join(process.cwd(), '.db-initialized');
    fs.writeFileSync(initMarkerPath, new Date().toISOString());
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

/**
 * Ensure the scheme_progress_summary table exists. Runs on every startup
 * (including remixes) so a missing table is always created.
 */
async function ensureSchemeProgressSummaryTable() {
  const poolConfig = { connectionString: process.env.DATABASE_URL };
  const isLocalHost = process.env.DATABASE_URL?.includes('localhost') ||
                      process.env.DATABASE_URL?.includes('127.0.0.1');
  if (process.env.NODE_ENV === 'production' && !isLocalHost) {
    poolConfig.ssl = { require: true, rejectUnauthorized: false };
  }
  const pool = new Pool(poolConfig);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "scheme_progress_summary" (
        "scheme_id" BIGINT PRIMARY KEY,
        "scheme_name" TEXT,
        "number_of_villages" INT,
        "number_of_completed_villages" INT,
        "number_of_esr" INT,
        "number_of_completed_esr" INT,
        "number_of_gsr" INT,
        "number_of_completed_gsr" INT,
        "number_of_mbr" INT,
        "number_of_completed_mbr" INT,
        "total_flowmeter_scope" INT,
        "flowmeter_integrated" INT,
        "flowmeter_balance" INT,
        "total_rca_scope" INT,
        "rca_integrated" INT,
        "rca_balance" INT,
        "total_pt_scope" INT,
        "pt_integrated" INT,
        "pt_balance" INT,
        "completion_status" TEXT
      );
    `);
    console.log('✅ Verified scheme_progress_summary table exists');
  } catch (error) {
    console.error('❌ Error ensuring scheme_progress_summary table:', error);
  } finally {
    await pool.end();
  }
}

// Import auto-generate-dashboard-urls script
import './auto-generate-dashboard-urls.js';

// Always ensure scheme_progress_summary exists, regardless of init marker.
ensureSchemeProgressSummaryTable();

// Only run initialization if it hasn't been run before
const initMarkerPath = path.join(process.cwd(), '.db-initialized');
const shouldInitialize = !fs.existsSync(initMarkerPath);

if (shouldInitialize) {
  console.log('🚀 Running first-time database initialization...');
  initializeDatabase();
  // Auto-generate-dashboard-urls will run automatically when imported above
} else {
  console.log('✅ Database already initialized, skipping...');
  // Still run the dashboard URL generator to fix any missing URLs
  console.log('Generating any missing dashboard URLs...');
  // Note: auto-generate-dashboard-urls.js will run automatically when imported above
}

export default initializeDatabase;