import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from './config';

// Get PostgreSQL client
export async function getClient() {
  const { Pool } = pg;
  
  // Log status of DATABASE_URL
  console.log("DATABASE_URL is set:", !!config.database.url);
  
  // Create pool with Neon DB connection info
  const pool = new Pool({
    connectionString: config.database.url,
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    max: 5
  });
  
  // Log successful connection
  pool.on("connect", () => {
    console.log("Connected to PostgreSQL database");
  });
  
  // Log errors
  pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL error:", err);
  });
  
  return pool;
}

// Get Drizzle ORM instance
export async function getDB() {
  console.log("Setting up database connection from getDB()...");
  const client = await getClient();
  return drizzle(client);
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...");
    const client = await getClient();
    
    // Create the region table
    await client.query(`
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
    
    // Create the scheme_status table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "scheme_status" (
        "sr_no" INTEGER,
        "scheme_id" TEXT PRIMARY KEY,
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
        "fully_completion_scheme_status" TEXT
      );
    `);
    
    // Create the users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user'
      );
    `);
    
    // Create the app_state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create the global_summary table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "global_summary" (
        "id" SERIAL PRIMARY KEY,
        "total_schemes_integrated" INTEGER,
        "fully_completed_schemes" INTEGER,
        "total_villages_integrated" INTEGER,
        "fully_completed_villages" INTEGER,
        "total_esr_integrated" INTEGER,
        "fully_completed_esr" INTEGER,
        "flow_meter_integrated" INTEGER,
        "rca_integrated" INTEGER,
        "pressure_transmitter_integrated" INTEGER
      );
    `);
    
    // Check if users table has any records
    const usersResult = await client.query(`SELECT COUNT(*) FROM "users"`);
    const usersCount = parseInt(usersResult.rows[0].count, 10);
    
    // Create default admin user if needed
    if (usersCount === 0) {
      console.log("Creating default admin user...");
      await client.query(`
        INSERT INTO "users" ("username", "password", "name", "role") 
        VALUES ('admin', 'admin123', 'Administrator', 'admin')
      `);
      console.log("Default admin user created successfully");
    }
    
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}