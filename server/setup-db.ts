import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import {
  regions,
  schemeStatuses,
  users,
  waterSchemeData,
  chlorineData,
  pressureData,
  waterConsumption,
  reportFiles,
  villages,
  mqttTopicConfigurations,
} from "@shared/schema";

const { Pool } = pg;

// Detect if running in VS Code with pgAdmin configuration
function isVSCodePgAdmin() {
  try {
    const envVscodePath = path.join(process.cwd(), ".env.vscode");
    return fs.existsSync(envVscodePath);
  } catch (error) {
    return false;
  }
}

// Create a new pool instance using the DATABASE_URL
export function setupDatabase() {
  console.log("Setting up database connection...");

  // Check if running in VS Code with pgAdmin configuration
  const isVSCode = isVSCodePgAdmin();
  if (isVSCode) {
    console.log("VS Code pgAdmin configuration detected!");
  }

  // Check for Replit environment first
  const isReplit = process.env.REPL_ID || process.env.REPLIT;
  if (isReplit) {
    console.log("Replit environment detected!");
    
    // In Replit, try to construct DATABASE_URL from individual components if not available
    if (!process.env.DATABASE_URL && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
      console.log("Constructing DATABASE_URL from individual Replit environment variables...");
      process.env.DATABASE_URL = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}?sslmode=require`;
      console.log("Successfully constructed DATABASE_URL from individual components");
    }
  }

  // Ensure DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set!");

    // If in VS Code, suggest using the pgAdmin setup
    if (isVSCode) {
      console.log(
        "Try running the application with F5 in VS Code or use the .env.vscode file",
      );
    } else if (isReplit) {
      console.log(
        "In Replit, the DATABASE_URL should be automatically provided. Please check if PostgreSQL database is properly configured.",
      );
    }

    throw new Error("DATABASE_URL environment variable is not set!");
  }

  try {
    // Only log the database host for security reasons
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log(`Connecting to: ${dbUrl.host}`);

    // If connecting to localhost, it's likely pgAdmin
    if (dbUrl.host === "localhost") {
      console.log("Using local database (likely pgAdmin)");
    }
  } catch (e) {
    console.log("Connecting to database...");
  }

  // Create the pool with correct options
  const poolConfig: any = {
    connectionString: process.env.DATABASE_URL,
  };

  // Add SSL config for cloud databases (like Neon)
  const isLocalHost =
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1");

  if (!isLocalHost) {
    poolConfig.ssl = {
      require: true,
      rejectUnauthorized: false, // Important for Neon DB connections
    };
  }

  const pool = new Pool(poolConfig);

  // Log successful connection
  pool.on("connect", () => {
    console.log("Connected to PostgreSQL database");
  });

  // Log errors
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });

  // Create drizzle instance
  const db = drizzle(pool);
  return { db, pool };
}

// Initialize tables if they don't exist
export async function initializeTables(db: any) {
  try {
    console.log("Initializing database tables...");

    // Create regions table
    await db.execute(`
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

    // Create unique index on region_name for upsert operations
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_region_region_name" 
      ON "region" ("region_name");
    `);

    // Create scheme_status table - without primary key to allow duplicate entries
    await db.execute(`
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
        "mjp_commissioned" TEXT DEFAULT 'No',
        "mjp_fully_completed" TEXT DEFAULT 'In Progress',
        "dashboard_url" TEXT
      );
    `);

    // Create unique index on (scheme_id, block) for upsert operations
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_scheme_status_scheme_block" 
      ON "scheme_status" ("scheme_id", "block");
    `);

    // Create region_history table for storing historical snapshots of region data
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "region_history" (
        "id" SERIAL PRIMARY KEY,
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
        "pressure_transmitter_integrated" INTEGER,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create index on region_history for date-based queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_region_history_uploaded_at" 
      ON "region_history" ("uploaded_at");
    `);

    // Create scheme_status_history table for storing historical snapshots of scheme status data
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "scheme_status_history" (
        "id" SERIAL PRIMARY KEY,
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
        "mjp_commissioned" TEXT,
        "mjp_fully_completed" TEXT,
        "water_supply" TEXT,
        "agency_type" TEXT,
        "water_supply_status" TEXT,
        "dashboard_url" TEXT,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create indexes on scheme_status_history
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_scheme_status_history_uploaded_at" 
      ON "scheme_status_history" ("uploaded_at");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_scheme_status_history_lookup" 
      ON "scheme_status_history" ("scheme_id", "block", "uploaded_at");
    `);

    // Check if mjp_commissioned and mjp_fully_completed columns exist, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheme_status' AND column_name IN ('mjp_commissioned', 'mjp_fully_completed');
      `);

      const existingColumns = result.rows.map((row: any) => row.column_name);

      if (!existingColumns.includes("mjp_commissioned")) {
        console.log(
          "Adding missing mjp_commissioned column to scheme_status table...",
        );
        await db.execute(
          `ALTER TABLE "scheme_status" ADD COLUMN "mjp_commissioned" TEXT DEFAULT 'No';`,
        );
        console.log(
          "Successfully added mjp_commissioned column to scheme_status table",
        );
      }

      if (!existingColumns.includes("mjp_fully_completed")) {
        console.log(
          "Adding missing mjp_fully_completed column to scheme_status table...",
        );
        await db.execute(
          `ALTER TABLE "scheme_status" ADD COLUMN "mjp_fully_completed" TEXT DEFAULT 'In Progress';`,
        );
        console.log(
          "Successfully added mjp_fully_completed column to scheme_status table",
        );
      }
    } catch (error) {
      console.error("Error checking for MJP columns in scheme_status:", error);
    }

    // Add water_supply, agency_type, water_supply_status columns to scheme_status if missing
    try {
      const extraColsResult = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'scheme_status' AND column_name IN ('water_supply', 'agency_type', 'water_supply_status');
      `);
      const existingExtraCols = extraColsResult.rows.map((r: any) => r.column_name);

      if (!existingExtraCols.includes("water_supply")) {
        await db.execute(`ALTER TABLE "scheme_status" ADD COLUMN "water_supply" TEXT;`);
        console.log("Added water_supply column to scheme_status");
      }
      if (!existingExtraCols.includes("agency_type")) {
        await db.execute(`ALTER TABLE "scheme_status" ADD COLUMN "agency_type" TEXT;`);
        console.log("Added agency_type column to scheme_status");
      }
      if (!existingExtraCols.includes("water_supply_status")) {
        await db.execute(`ALTER TABLE "scheme_status" ADD COLUMN "water_supply_status" TEXT;`);
        console.log("Added water_supply_status column to scheme_status");
      }
    } catch (error) {
      console.error("Error adding extra columns to scheme_status:", error);
    }

    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user'
      );
    `);

    // Migration: Add email and phone columns to existing users table if they don't exist
    try {
      const emailColumnCheck = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email';
      `);
      
      if (emailColumnCheck.rows.length === 0) {
        console.log("Adding email column to existing users table...");
        await db.execute(`ALTER TABLE "users" ADD COLUMN "email" TEXT;`);
        console.log("Successfully added email column to users table");
      }

      const phoneColumnCheck = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone';
      `);
      
      if (phoneColumnCheck.rows.length === 0) {
        console.log("Adding phone column to existing users table...");
        await db.execute(`ALTER TABLE "users" ADD COLUMN "phone" TEXT;`);
        console.log("Successfully added phone column to users table");
      }
    } catch (error) {
      console.error("Error adding email/phone columns to users table:", error);
    }

    // Create app_state table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create water_scheme_data table
    await db.execute(`
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
        "water_value_day1" DECIMAL,
        "water_value_day2" DECIMAL,
        "water_value_day3" DECIMAL,
        "water_value_day4" DECIMAL,
        "water_value_day5" DECIMAL,
        "water_value_day6" DECIMAL,
        "water_value_day7" DECIMAL,
        "lpcd_value_day1" DECIMAL,
        "lpcd_value_day2" DECIMAL,
        "lpcd_value_day3" DECIMAL,
        "lpcd_value_day4" DECIMAL,
        "lpcd_value_day5" DECIMAL,
        "lpcd_value_day6" DECIMAL,
        "lpcd_value_day7" DECIMAL,
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
        PRIMARY KEY ("scheme_id", "village_name", "block")
      );
    `);

    // Check if dashboard_url column exists in water_scheme_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'water_scheme_data' AND column_name = 'dashboard_url';
      `);

      if (result.rows.length === 0) {
        console.log(
          "Adding missing dashboard_url column to water_scheme_data table...",
        );
        await db.execute(
          `ALTER TABLE "water_scheme_data" ADD COLUMN "dashboard_url" TEXT;`,
        );
        console.log(
          "Successfully added dashboard_url column to water_scheme_data table",
        );
      }
    } catch (error) {
      console.error("Error checking for dashboard_url column:", error);
    }

    // Check if Day 7 water columns exist in water_scheme_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'water_scheme_data' AND column_name IN ('water_value_day7', 'water_date_day7');
      `);

      const existingColumns = result.rows.map((row: any) => row.column_name);

      if (!existingColumns.includes("water_value_day7")) {
        console.log(
          "Adding missing water_value_day7 column to water_scheme_data table...",
        );
        await db.execute(
          `ALTER TABLE "water_scheme_data" ADD COLUMN "water_value_day7" DECIMAL;`,
        );
        console.log(
          "Successfully added water_value_day7 column to water_scheme_data table",
        );
      }

      if (!existingColumns.includes("water_date_day7")) {
        console.log(
          "Adding missing water_date_day7 column to water_scheme_data table...",
        );
        await db.execute(
          `ALTER TABLE "water_scheme_data" ADD COLUMN "water_date_day7" VARCHAR(20);`,
        );
        console.log(
          "Successfully added water_date_day7 column to water_scheme_data table",
        );
      }
    } catch (error) {
      console.error(
        "Error checking for Day 7 columns in water_scheme_data:",
        error,
      );
    }

    // Handle primary key migration from (scheme_id, village_name) to (scheme_id, village_name, block)
    try {
      // Check if the primary key needs to be migrated by checking the constraint name
      const pkResult = await db.execute(`
        SELECT constraint_name, column_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'water_scheme_data' 
        AND constraint_name LIKE '%pkey%'
        ORDER BY ordinal_position;
      `);

      const pkColumns = pkResult.rows.map((row: any) => row.column_name);

      // If the primary key doesn't include 'block', we need to migrate
      if (pkColumns.length === 2 && !pkColumns.includes("block")) {
        console.log(
          "Migrating water_scheme_data primary key to include block field...",
        );

        // Step 1: Drop the existing primary key constraint
        await db.execute(
          `ALTER TABLE "water_scheme_data" DROP CONSTRAINT IF EXISTS "water_scheme_data_pkey";`,
        );

        // Step 2: Add the new composite primary key with block
        await db.execute(
          `ALTER TABLE "water_scheme_data" ADD CONSTRAINT "water_scheme_data_pkey" PRIMARY KEY ("scheme_id", "village_name", "block");`,
        );

        console.log(
          "Successfully migrated water_scheme_data primary key to include block field",
        );
      }
    } catch (error) {
      console.error("Error migrating water_scheme_data primary key:", error);
    }

    // Remove precision constraints from decimal columns if they exist
    try {
      // Check if any decimal columns have precision constraints
      const decimalResult = await db.execute(`
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns 
        WHERE table_name = 'water_scheme_data' 
        AND data_type = 'numeric' 
        AND numeric_precision IS NOT NULL;
      `);

      if (decimalResult.rows.length > 0) {
        console.log("Removing precision constraints from decimal columns...");

        // Update each decimal column to remove precision constraints
        const decimalColumns = [
          "water_value_day1",
          "water_value_day2",
          "water_value_day3",
          "water_value_day4",
          "water_value_day5",
          "water_value_day6",
          "water_value_day7",
          "lpcd_value_day1",
          "lpcd_value_day2",
          "lpcd_value_day3",
          "lpcd_value_day4",
          "lpcd_value_day5",
          "lpcd_value_day6",
          "lpcd_value_day7",
        ];

        for (const column of decimalColumns) {
          try {
            await db.execute(
              `ALTER TABLE "water_scheme_data" ALTER COLUMN "${column}" TYPE DECIMAL USING "${column}"::DECIMAL;`,
            );
          } catch (colError) {
            console.error(`Error updating column ${column}:`, colError);
          }
        }

        console.log(
          "Successfully removed precision constraints from decimal columns",
        );
      }
    } catch (error) {
      console.error(
        "Error checking/updating decimal column constraints:",
        error,
      );
    }

    // Create chlorine_data table
    await db.execute(`
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
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);

    // Check if dashboard_url column exists in chlorine_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'chlorine_data' AND column_name = 'dashboard_url';
      `);

      if (result.rows.length === 0) {
        console.log(
          "Adding missing dashboard_url column to chlorine_data table...",
        );
        await db.execute(
          `ALTER TABLE "chlorine_data" ADD COLUMN "dashboard_url" TEXT;`,
        );
        console.log(
          "Successfully added dashboard_url column to chlorine_data table",
        );
      }
    } catch (error) {
      console.error(
        "Error checking for dashboard_url column in chlorine_data:",
        error,
      );
    }

    // Create chlorine_history table for permanent historical storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "chlorine_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "chlorine_date" VARCHAR(15) NOT NULL,
        "chlorine_value" NUMERIC,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "esr_name", "chlorine_date", "uploaded_at")
      );
    `);

    // Create index on chlorine_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_chlorine_history_date_range" 
      ON "chlorine_history" ("chlorine_date", "scheme_id", "village_name", "esr_name");
    `);

    // Create index on chlorine_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_chlorine_history_latest" 
      ON "chlorine_history" ("scheme_id", "village_name", "esr_name", "chlorine_date", "uploaded_at" DESC);
    `);

    // Create pressure_data table
    await db.execute(`
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
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);

    // Check if dashboard_url column exists in pressure_data, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pressure_data' AND column_name = 'dashboard_url';
      `);

      if (result.rows.length === 0) {
        console.log(
          "Adding missing dashboard_url column to pressure_data table...",
        );
        await db.execute(
          `ALTER TABLE "pressure_data" ADD COLUMN "dashboard_url" TEXT;`,
        );
        console.log(
          "Successfully added dashboard_url column to pressure_data table",
        );
      }
    } catch (error) {
      console.error(
        "Error checking for dashboard_url column in pressure_data:",
        error,
      );
    }

    // Create pressure_history table for permanent historical storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "pressure_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "pressure_date" VARCHAR(15) NOT NULL,
        "pressure_value" NUMERIC,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "esr_name", "pressure_date", "uploaded_at")
      );
    `);

    // Create index on pressure_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_pressure_history_date_range" 
      ON "pressure_history" ("pressure_date", "scheme_id", "village_name", "esr_name");
    `);

    // Create index on pressure_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_pressure_history_latest" 
      ON "pressure_history" ("scheme_id", "village_name", "esr_name", "pressure_date", "uploaded_at" DESC);
    `);

    // Create water_scheme_data_history table for permanent historical storage
    await db.execute(`
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
        "water_value" DECIMAL,
        "lpcd_value" DECIMAL,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "data_date", "uploaded_at")
      );
    `);

    // Create index on water_scheme_data_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_water_scheme_data_history_date_range" 
      ON "water_scheme_data_history" ("data_date", "scheme_id", "village_name");
    `);

    // Create index on water_scheme_data_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_water_scheme_data_history_latest" 
      ON "water_scheme_data_history" ("scheme_id", "village_name", "data_date", "uploaded_at" DESC);
    `);

    // Create scheme_lpcd_data_history table for scheme-level LPCD tracking
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "scheme_lpcd_data_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "total_population" INTEGER,
        "total_villages" INTEGER,
        "villages_below_55" INTEGER,
        "villages_above_55" INTEGER,
        "villages_zero_supply" INTEGER,
        "data_date" VARCHAR(15) NOT NULL,
        "water_value" DECIMAL,
        "lpcd_value" DECIMAL,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        "mjp_commissioned" TEXT,
        UNIQUE("scheme_id", "block", "data_date")
      );
    `);

    // Create index on scheme_lpcd_data_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_scheme_lpcd_data_history_date_range" 
      ON "scheme_lpcd_data_history" ("data_date", "scheme_id", "region");
    `);

    // Create index on scheme_lpcd_data_history for efficient latest record queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_scheme_lpcd_data_history_latest" 
      ON "scheme_lpcd_data_history" ("scheme_id", "block", "data_date", "uploaded_at" DESC);
    `);

    // Create water_consumption table with correct field types to avoid CSV import issues
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "water_consumption" (
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(50),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "flow_rate_m3" NUMERIC,
        "flow_meter_connected" VARCHAR(50),
        "online_status" VARCHAR(20),
        "time_duration" VARCHAR(50),
        "esr_capacity" NUMERIC,
        "water_value_day1" NUMERIC,
        "water_value_day2" NUMERIC,
        "water_value_day3" NUMERIC,
        "water_value_day4" NUMERIC,
        "water_value_day5" NUMERIC,
        "water_value_day6" NUMERIC,
        "water_value_day7" NUMERIC,
        "water_date_day1" VARCHAR(15),
        "water_date_day2" VARCHAR(15),
        "water_date_day3" VARCHAR(15),
        "water_date_day4" VARCHAR(15),
        "water_date_day5" VARCHAR(15),
        "water_date_day6" VARCHAR(15),
        "water_date_day7" VARCHAR(15),
        "consistent_zero_consumption" INTEGER,
        "percentage_consumption_previous_day" NUMERIC,
        "dashboard_url" TEXT,
        PRIMARY KEY ("scheme_id", "village_name", "esr_name")
      );
    `);

    // Check and fix water_consumption table schema to prevent CSV import issues
    try {
      console.log("Checking water_consumption table schema for compatibility...");
      
      // Check if flow_meter_connected is boolean (needs to be varchar)
      const booleanCheckResult = await db.execute(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'water_consumption' 
        AND column_name = 'flow_meter_connected'
        AND data_type = 'boolean';
      `);
      
      if (booleanCheckResult.rows.length > 0) {
        console.log("Converting flow_meter_connected from boolean to varchar...");
        await db.execute(
          `ALTER TABLE "water_consumption" ALTER COLUMN "flow_meter_connected" TYPE VARCHAR(50);`
        );
        console.log("Successfully converted flow_meter_connected to varchar");
      }

      // Check if date fields are DATE type (need to be varchar for CSV import compatibility)
      const dateFieldsResult = await db.execute(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'water_consumption' 
        AND column_name LIKE 'water_date_day%'
        AND data_type = 'date';
      `);
      
      if (dateFieldsResult.rows.length > 0) {
        console.log("Converting date fields from DATE to VARCHAR...");
        const dateColumns = ['water_date_day1', 'water_date_day2', 'water_date_day3', 
                            'water_date_day4', 'water_date_day5', 'water_date_day6', 'water_date_day7'];
        
        for (const column of dateColumns) {
          try {
            await db.execute(
              `ALTER TABLE "water_consumption" ALTER COLUMN "${column}" TYPE VARCHAR(15);`
            );
          } catch (colError) {
            console.error(`Error converting date column ${column}:`, colError);
          }
        }
        console.log("Successfully converted date fields to varchar");
      }

      // Check if numeric fields have precision constraints (need to be removed for large values)
      const numericFieldsResult = await db.execute(`
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns 
        WHERE table_name = 'water_consumption' 
        AND data_type = 'numeric' 
        AND numeric_precision IS NOT NULL;
      `);
      
      if (numericFieldsResult.rows.length > 0) {
        console.log("Removing precision constraints from numeric fields...");
        const numericColumns = ['flow_rate_m3', 'esr_capacity', 'water_value_day1', 'water_value_day2', 
                               'water_value_day3', 'water_value_day4', 'water_value_day5', 'water_value_day6', 
                               'water_value_day7', 'percentage_consumption_previous_day'];
        
        for (const column of numericColumns) {
          try {
            await db.execute(
              `ALTER TABLE "water_consumption" ALTER COLUMN "${column}" TYPE NUMERIC;`
            );
          } catch (colError) {
            console.error(`Error removing precision from column ${column}:`, colError);
          }
        }
        console.log("Successfully removed precision constraints from numeric fields");
      }

      console.log("Water consumption table schema check completed");

      // Check if time_duration column exists in water_consumption, add if missing
      const timeDurationResult = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'water_consumption' AND column_name = 'time_duration';
      `);

      if (timeDurationResult.rows.length === 0) {
        console.log(
          "Adding missing time_duration column to water_consumption table...",
        );
        await db.execute(
          `ALTER TABLE "water_consumption" ADD COLUMN "time_duration" VARCHAR(50);`,
        );
        console.log(
          "Successfully added time_duration column to water_consumption table",
        );
      }

      // Check if dashboard_url column exists in water_consumption, add if missing
      const dashboardResult = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'water_consumption' AND column_name = 'dashboard_url';
      `);

      if (dashboardResult.rows.length === 0) {
        console.log(
          "Adding missing dashboard_url column to water_consumption table...",
        );
        await db.execute(
          `ALTER TABLE "water_consumption" ADD COLUMN "dashboard_url" TEXT;`,
        );
        console.log(
          "Successfully added dashboard_url column to water_consumption table",
        );
      }
    } catch (error) {
      console.error(
        "Error checking/fixing water_consumption table schema:",
        error,
      );
    }

    // Create water_consumption_history table for permanent historical storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "water_consumption_history" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "data_date" VARCHAR(15) NOT NULL,
        "water_value" NUMERIC,
        "flow_rate_m3" NUMERIC,
        "esr_capacity" NUMERIC,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "upload_batch_id" VARCHAR(50),
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "esr_name", "data_date", "uploaded_at")
      );
    `);

    // Create indexes on water_consumption_history for efficient date range queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_water_consumption_history_date_range" 
      ON "water_consumption_history" ("data_date", "scheme_id", "village_name", "esr_name");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_water_consumption_history_latest" 
      ON "water_consumption_history" ("scheme_id", "village_name", "esr_name", "data_date", "uploaded_at" DESC);
    `);

    // Create trigger function to automatically populate water_consumption_history
    await db.execute(`
      CREATE OR REPLACE FUNCTION update_water_consumption_history()
      RETURNS TRIGGER AS $$
      DECLARE
        batch_id VARCHAR(50);
        day_num INTEGER;
        water_date VARCHAR(15);
        water_val NUMERIC;
      BEGIN
        -- Generate a unique batch ID for this update
        batch_id := 'batch_' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS') || '_' || 
                    substring(md5(random()::text) from 1 for 8);
        
        -- Loop through all 7 days of data
        FOR day_num IN 1..7 LOOP
          -- Get the date and value for this day using dynamic SQL
          EXECUTE format('SELECT $1.water_date_day%s, $1.water_value_day%s', day_num, day_num)
          INTO water_date, water_val
          USING NEW;
          
          -- Only insert if we have both a date and a value
          IF water_date IS NOT NULL AND water_date != '' AND water_val IS NOT NULL THEN
            INSERT INTO water_consumption_history (
              region,
              circle,
              division,
              sub_division,
              block,
              scheme_id,
              scheme_name,
              village_name,
              esr_name,
              data_date,
              water_value,
              flow_rate_m3,
              esr_capacity,
              upload_batch_id,
              dashboard_url
            ) VALUES (
              NEW.region,
              NEW.circle,
              NEW.division,
              NEW.sub_division,
              NEW.block,
              NEW.scheme_id,
              NEW.scheme_name,
              NEW.village_name,
              NEW.esr_name,
              water_date,
              water_val,
              NEW.flow_rate_m3,
              NEW.esr_capacity,
              batch_id,
              NEW.dashboard_url
            )
            ON CONFLICT (scheme_id, village_name, esr_name, data_date, uploaded_at) 
            DO NOTHING;
          END IF;
        END LOOP;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger on water_consumption table
    await db.execute(`
      DROP TRIGGER IF EXISTS trigger_update_water_consumption_history ON water_consumption;
      
      CREATE TRIGGER trigger_update_water_consumption_history
      AFTER INSERT OR UPDATE ON water_consumption
      FOR EACH ROW
      EXECUTE FUNCTION update_water_consumption_history();
    `);

    console.log("Water consumption history table and trigger created successfully");

    // Check if the users table has any records using raw SQL to avoid Drizzle ORM issues
    try {
      const usersResult = await db.execute(`SELECT COUNT(*) FROM "users"`);
      const usersCount = parseInt(usersResult.rows[0].count, 10);

      if (usersCount === 0) {
        console.log("Creating default admin user...");
        // Use raw SQL to insert admin user to avoid potential ORM issues
        await db.execute(`
          INSERT INTO "users" ("username", "password", "name", "role") 
          VALUES ('admin', 'admin123', 'Administrator', 'admin')
        `);
        console.log("Default admin user created successfully");
      }
    } catch (error) {
      console.error("Error checking/creating users:", error);
      // Continue despite error to allow other tables to be created
    }

    // Create report_files table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "report_files" (
        "id" SERIAL PRIMARY KEY,
        "file_name" TEXT NOT NULL,
        "original_name" TEXT NOT NULL,
        "file_path" TEXT NOT NULL,
        "report_type" TEXT NOT NULL,
        "upload_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "uploaded_by" INTEGER REFERENCES "users"("id"),
        "file_size" INTEGER,
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `);

    // Create user_activity_logs table for comprehensive activity tracking
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "user_activity_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "username" TEXT NOT NULL,
        "session_id" TEXT NOT NULL,
        "activity_type" TEXT NOT NULL,
        "activity_description" TEXT NOT NULL,
        "file_name" TEXT,
        "file_type" TEXT,
        "page_url" TEXT,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "metadata" JSONB
      );
    `);

    // Create population_tracking table for daily total population storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "population_tracking" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL UNIQUE,
        "total_population" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create region_population_tracking table for daily regional population storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "region_population_tracking" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "region" TEXT NOT NULL,
        "total_population" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("date", "region")
      );
    `);

    // Create communication_status table for ESR sensor connectivity monitoring
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "communication_status" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(100),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "esr_name" VARCHAR(255),
        "chlorine_connected" VARCHAR(10),
        "pressure_connected" VARCHAR(10),
        "flow_meter_connected" VARCHAR(10),
        "chlorine_status" VARCHAR(20),
        "pressure_status" VARCHAR(20),
        "flow_meter_status" VARCHAR(20),
        "overall_status" VARCHAR(20),
        "chlorine_0h_72h" VARCHAR(20),
        "chlorine_72h" VARCHAR(20),
        "pressure_0h_72h" VARCHAR(20),
        "pressure_72h" VARCHAR(20),
        "flow_meter_0h_72h" VARCHAR(20),
        "flow_meter_72h" VARCHAR(20),
        "last_seen" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "chlorine_last_seen" TIMESTAMP WITH TIME ZONE,
        "pressure_last_seen" TIMESTAMP WITH TIME ZONE,
        "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "dashboard_url" TEXT,
        UNIQUE("scheme_id", "village_name", "esr_name")
      );
    `);

    // Check if dashboard_url column exists in communication_status, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'communication_status' AND column_name = 'dashboard_url';
      `);

      if (result.rows.length === 0) {
        console.log(
          "Adding missing dashboard_url column to communication_status table...",
        );
        await db.execute(
          `ALTER TABLE "communication_status" ADD COLUMN "dashboard_url" TEXT;`,
        );
        console.log(
          "Successfully added dashboard_url column to communication_status table",
        );
      }
    } catch (error) {
      console.error(
        "Error checking for dashboard_url column in communication_status:",
        error,
      );
    }

    // Create index on communication_status for efficient queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_communication_status_region" 
      ON "communication_status" ("region");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_communication_status_scheme" 
      ON "communication_status" ("scheme_id");
    `);

    // Create village table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "village" (
        "region" VARCHAR(100),
        "circle" VARCHAR(100),
        "division" VARCHAR(100),
        "sub_division" VARCHAR(100),
        "block" VARCHAR(100),
        "scheme_id" VARCHAR(50),
        "scheme_name" VARCHAR(255),
        "village_name" VARCHAR(255),
        "number_of_esr" INTEGER,
        "connected_esr" INTEGER,
        "not_connected_esr" INTEGER,
        "village_functional_status" VARCHAR(50),
        "no_of_fully_completion_esr" INTEGER,
        "fully_completion_village_status" VARCHAR(50)
      );
    `);

    // Create index on village table for efficient queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_village_region" 
      ON "village" ("region");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_village_scheme" 
      ON "village" ("scheme_id");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_village_name" 
      ON "village" ("village_name");
    `);

    // Create helpdesk_tickets table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "helpdesk_tickets" (
        "id" SERIAL PRIMARY KEY,
        "ticket_id" VARCHAR(20) NOT NULL UNIQUE,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "specific_issue" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "level" TEXT NOT NULL,
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "subdivision" TEXT,
        "block" TEXT,
        "scheme_id" TEXT,
        "scheme_name" TEXT,
        "village_name" TEXT,
        "esr_name" TEXT,
        "priority" TEXT NOT NULL DEFAULT 'Medium',
        "status" TEXT NOT NULL DEFAULT 'Open',
        "contact_name" TEXT NOT NULL,
        "contact_phone" TEXT,
        "contact_email" TEXT NOT NULL,
        "dashboard_url" TEXT,
        "created_by" INTEGER NOT NULL REFERENCES "users"("id"),
        "attachment_path" TEXT,
        "attachment_filename" TEXT,
        "admin_comments" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Check if dashboard_url column exists in helpdesk_tickets, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'helpdesk_tickets' AND column_name = 'dashboard_url';
      `);

      if (result.rows.length === 0) {
        console.log(
          "Adding missing dashboard_url column to helpdesk_tickets table...",
        );
        await db.execute(
          `ALTER TABLE "helpdesk_tickets" ADD COLUMN "dashboard_url" TEXT;`,
        );
        console.log(
          "Successfully added dashboard_url column to helpdesk_tickets table",
        );
      }
    } catch (error) {
      console.error("Error checking for dashboard_url column in helpdesk_tickets:", error);
    }

    // Check if scheme_name column exists in helpdesk_tickets, add if missing
    try {
      const result = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'helpdesk_tickets' AND column_name = 'scheme_name';
      `);

      if (result.rows.length === 0) {
        console.log(
          "Adding missing scheme_name column to helpdesk_tickets table...",
        );
        await db.execute(
          `ALTER TABLE "helpdesk_tickets" ADD COLUMN "scheme_name" TEXT;`,
        );
        console.log(
          "Successfully added scheme_name column to helpdesk_tickets table",
        );
      }
    } catch (error) {
      console.error("Error checking for scheme_name column in helpdesk_tickets:", error);
    }

    // Create helpdesk_attachments table for multiple file uploads
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "helpdesk_attachments" (
        "id" SERIAL PRIMARY KEY,
        "ticket_id" INTEGER NOT NULL REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE,
        "original_filename" TEXT NOT NULL,
        "stored_filename" TEXT NOT NULL,
        "file_path" TEXT NOT NULL,
        "file_size" INTEGER NOT NULL,
        "mime_type" TEXT NOT NULL,
        "uploaded_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create indexes on helpdesk tables for efficient queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_helpdesk_tickets_status" 
      ON "helpdesk_tickets" ("status");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_helpdesk_tickets_category" 
      ON "helpdesk_tickets" ("category");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_helpdesk_tickets_region" 
      ON "helpdesk_tickets" ("region");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_helpdesk_tickets_created_by" 
      ON "helpdesk_tickets" ("created_by");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_helpdesk_attachments_ticket_id" 
      ON "helpdesk_attachments" ("ticket_id");
    `);

    // Create vendor table for managing vendor/agency contacts by region
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "vendor" (
        "id" SERIAL PRIMARY KEY,
        "region" TEXT NOT NULL,
        "agency" TEXT NOT NULL,
        "employee_name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" VARCHAR(15) NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "vendor_region_email_unique" UNIQUE ("region", "email")
      );
    `);

    // Create indexes on vendor table for efficient queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_vendor_region" 
      ON "vendor" ("region");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_vendor_email" 
      ON "vendor" ("email");
    `);

    // Create global_summary table for dashboard-wide metrics
    await db.execute(`
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

    // Create user_login_logs table for session tracking
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "user_login_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "username" TEXT NOT NULL,
        "user_name" TEXT,
        "login_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "logout_time" TIMESTAMP WITH TIME ZONE,
        "session_duration" INTEGER,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "session_id" TEXT,
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `);

    // Create issue_reports table for tracking reported problems
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "issue_reports" (
        "id" SERIAL PRIMARY KEY,
        "problem_level" TEXT NOT NULL,
        "region" TEXT NOT NULL,
        "scheme_id" TEXT NOT NULL,
        "scheme_name" TEXT NOT NULL,
        "village_name" TEXT,
        "esr_name" TEXT,
        "status_value" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "sensor_type" TEXT,
        "status" TEXT DEFAULT 'Active' NOT NULL,
        "resolution_remark" TEXT,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "created_by" INTEGER NOT NULL REFERENCES "users"("id"),
        "creator_name" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create MQTT topics last seen table with proper timezone handling
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "topics_last_seen" (
        "topic_id" TEXT PRIMARY KEY,
        "last_value" TEXT,
        "last_seen" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "broker_server" TEXT
      );
    `);

    // Add broker_server column to topics_last_seen if missing
    try {
      const brokerServerCheck = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'topics_last_seen' AND column_name = 'broker_server';
      `);
      if (brokerServerCheck.rows.length === 0) {
        await db.execute(`ALTER TABLE "topics_last_seen" ADD COLUMN "broker_server" TEXT;`);
        console.log("Added broker_server column to topics_last_seen");
      }
    } catch (error) {
      console.error("Error checking/adding broker_server column:", error);
    }

    // CRITICAL FIX: Normalize any IST-shifted timestamps to proper UTC
    // This migration handles existing data that may have been written with +5.5h offset
    console.log("🔧 Checking for IST-shifted timestamps in topics_last_seen table...");
    
    try {
      // Check if there are timestamps in the future (indicating IST-shifted data)
      const futureTimestampsResult = await db.execute(`
        SELECT COUNT(*) as future_count 
        FROM "topics_last_seen" 
        WHERE "last_seen" > NOW() + INTERVAL '1 hour'
      `);
      
      const futureCount = futureTimestampsResult.rows[0]?.future_count || 0;
      
      if (futureCount > 0) {
        console.log(`🔧 Found ${futureCount} IST-shifted timestamps, normalizing to UTC...`);
        
        // Normalize IST-shifted timestamps by subtracting 5.5 hours
        await db.execute(`
          UPDATE "topics_last_seen" 
          SET "last_seen" = "last_seen" - INTERVAL '5.5 hours'
          WHERE "last_seen" > NOW() + INTERVAL '1 hour'
        `);
        
        console.log("✅ Successfully normalized IST-shifted timestamps to UTC");
      } else {
        console.log("✅ No IST-shifted timestamps found, no migration needed");
      }
    } catch (error) {
      console.error("⚠️  Warning: Could not check/fix IST-shifted timestamps:", error);
      // Don't fail the entire setup if this migration fails
    }

    // Create MQTT topic configurations table with updated schema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "mqtt_topic_configurations" (
        "id" SERIAL PRIMARY KEY,
        "sr_no" INTEGER,
        "region" TEXT,
        "circle" TEXT,
        "division" TEXT,
        "sub_division" TEXT,
        "block" TEXT,
        "scheme_id_name" TEXT,
        "vendor" TEXT,
        "village" TEXT,
        "reservoir" TEXT,
        "message_type" TEXT,
        "topic_for_flow_meter" TEXT,
        "topic_for_cl" TEXT,
        "type_of_cl" TEXT,
        "topic_for_pressure" TEXT,
        "received_date" TEXT,
        "date_of_integration" TEXT
      );
    `);

    // Check if server column exists in mqtt_topic_configurations, add if missing
    try {
      const serverColumnCheck = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'mqtt_topic_configurations' AND column_name = 'server';
      `);

      if (serverColumnCheck.rows.length === 0) {
        console.log("Adding missing server column to mqtt_topic_configurations table...");
        await db.execute(`ALTER TABLE "mqtt_topic_configurations" ADD COLUMN "server" TEXT;`);
        console.log("Successfully added server column to mqtt_topic_configurations table");
      }
    } catch (error) {
      console.error("Error checking/adding server column in mqtt_topic_configurations:", error);
    }

    // Create index on mqtt_topic_configurations for efficient queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_mqtt_topic_configurations_region" 
      ON "mqtt_topic_configurations" ("region");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "idx_mqtt_topic_configurations_server" 
      ON "mqtt_topic_configurations" ("server");
    `);

    // Add unique constraints for region table and scheme_status table
    // Check for region_name uniqueness constraint
    try {
      console.log("Checking for unique constraints on region and scheme_status tables...");
      
      // First, check for duplicates in region table
      const regionDuplicatesResult = await db.execute(`
        SELECT region_name, COUNT(*) as count 
        FROM region 
        GROUP BY region_name 
        HAVING COUNT(*) > 1 
        LIMIT 1;
      `);

      if (regionDuplicatesResult.rows.length === 0) {
        // No duplicates found, check if constraint already exists
        const regionConstraintResult = await db.execute(`
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'region_region_name_unique';
        `);

        if (regionConstraintResult.rows.length === 0) {
          console.log("Adding unique constraint on region_name...");
          await db.execute(`
            ALTER TABLE region 
            ADD CONSTRAINT region_region_name_unique UNIQUE (region_name);
          `);
          console.log("✅ Successfully added unique constraint on region.region_name");
        } else {
          console.log("✅ Unique constraint on region.region_name already exists");
        }
      } else {
        const duplicateRegion = regionDuplicatesResult.rows[0];
        console.log(`⚠️  Cannot add unique constraint on region.region_name: duplicate found for '${duplicateRegion.region_name}' (${duplicateRegion.count} entries)`);
        console.log("Please resolve duplicate region names before the constraint can be applied");
      }
    } catch (error) {
      console.error("Error checking/adding unique constraint on region.region_name:", error);
    }

    // Check for scheme_id + block uniqueness constraint
    try {
      // First, check for duplicates in scheme_status table
      const schemeDuplicatesResult = await db.execute(`
        SELECT scheme_id, block, COUNT(*) as count 
        FROM scheme_status 
        WHERE scheme_id IS NOT NULL AND block IS NOT NULL
        GROUP BY scheme_id, block 
        HAVING COUNT(*) > 1 
        LIMIT 1;
      `);

      if (schemeDuplicatesResult.rows.length === 0) {
        // No duplicates found, check if constraint already exists
        const schemeConstraintResult = await db.execute(`
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'scheme_status_scheme_id_block_unique';
        `);

        if (schemeConstraintResult.rows.length === 0) {
          console.log("Adding unique constraint on (scheme_id, block)...");
          await db.execute(`
            ALTER TABLE scheme_status 
            ADD CONSTRAINT scheme_status_scheme_id_block_unique UNIQUE (scheme_id, block);
          `);
          console.log("✅ Successfully added unique constraint on scheme_status.(scheme_id, block)");
        } else {
          console.log("✅ Unique constraint on scheme_status.(scheme_id, block) already exists");
        }
      } else {
        const duplicateScheme = schemeDuplicatesResult.rows[0];
        console.log(`⚠️  Cannot add unique constraint on scheme_status.(scheme_id, block): duplicate found for scheme_id='${duplicateScheme.scheme_id}', block='${duplicateScheme.block}' (${duplicateScheme.count} entries)`);
        console.log("Please resolve duplicate (scheme_id, block) combinations before the constraint can be applied");
      }
    } catch (error) {
      console.error("Error checking/adding unique constraint on scheme_status.(scheme_id, block):", error);
    }

    // Add last_seen column to communication_status table for offline duration tracking
    try {
      console.log("Checking for last_seen column in communication_status table...");
      
      const columnCheck = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'communication_status' AND column_name = 'last_seen';
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log("Adding last_seen column to communication_status table...");
        await db.execute(`
          ALTER TABLE "communication_status" 
          ADD COLUMN "last_seen" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log("✅ Successfully added last_seen column to communication_status table");
        
        // Populate with sample data (7-30 days ago) for existing records
        console.log("Populating last_seen with sample dates for existing records...");
        // Use age() to check if last_seen was just set by the DEFAULT (within last minute)
        // This ensures we only backfill newly added columns, not future imports
        await db.execute(`
          UPDATE "communication_status"
          SET "last_seen" = CURRENT_TIMESTAMP - (
            INTERVAL '1 day' * (7 + (id % 24))
          )
          WHERE "last_seen" IS NOT NULL 
            AND AGE(CURRENT_TIMESTAMP, "last_seen") < INTERVAL '1 minute';
        `);
        console.log("✅ Successfully populated last_seen with sample dates (7-30 days ago)");
      } else {
        console.log("✅ last_seen column already exists in communication_status table");
      }
    } catch (error) {
      console.error("Error adding last_seen column to communication_status:", error);
    }

    // Add pressure_last_seen column to communication_status table for pressure sensor offline duration tracking
    try {
      console.log("Checking for pressure_last_seen column in communication_status table...");
      
      const pressureColumnCheck = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'communication_status' AND column_name = 'pressure_last_seen';
      `);
      
      if (pressureColumnCheck.rows.length === 0) {
        console.log("Adding pressure_last_seen column to communication_status table...");
        await db.execute(`
          ALTER TABLE "communication_status" 
          ADD COLUMN "pressure_last_seen" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log("✅ Successfully added pressure_last_seen column to communication_status table");
        
        // Populate with sample data (7-30 days ago) for existing records with offline pressure sensors
        console.log("Populating pressure_last_seen with sample dates for existing offline pressure records...");
        await db.execute(`
          UPDATE "communication_status"
          SET "pressure_last_seen" = CURRENT_TIMESTAMP - (
            INTERVAL '1 day' * (7 + (id % 24))
          )
          WHERE "pressure_last_seen" IS NOT NULL 
            AND AGE(CURRENT_TIMESTAMP, "pressure_last_seen") < INTERVAL '1 minute'
            AND "pressure_status" = 'Offline';
        `);
        console.log("✅ Successfully populated pressure_last_seen with sample dates (7-30 days ago) for offline pressure sensors");
      } else {
        console.log("✅ pressure_last_seen column already exists in communication_status table");
      }
    } catch (error) {
      console.error("Error adding pressure_last_seen column to communication_status:", error);
    }


    // PERMANENT FIX: Synchronize all sequences to prevent duplicate key errors (common after manual data imports/migrations)
    await synchronizeSequences(db);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error;
  }
}

/**
 * Synchronizes all PostgreSQL sequences in the 'public' schema with their current table data.
 * This prevents "duplicate key value violates unique constraint" errors that occur when
 * a sequence's next value is lower than the actual maximum ID in the table.
 */
export async function synchronizeSequences(db: any) {
  try {
    console.log("🔄 Synchronizing database sequences with actual data...");
    
    // This dynamic SQL block finds all columns with nextval() defaults and resets their sequences
    await db.execute(`
      DO $$ 
      DECLARE 
          r RECORD;
          seq_name TEXT;
          max_id BIGINT;
      BEGIN
          -- Loop through all columns that have a nextval() default in the public schema
          FOR r IN (
              SELECT table_name, column_name, column_default 
              FROM information_schema.columns 
              WHERE column_default LIKE 'nextval%' 
              AND table_schema = 'public'
          ) 
          LOOP
              -- Get the underlying sequence name
              seq_name := pg_get_serial_sequence(r.table_name, r.column_name);
              
              IF seq_name IS NOT NULL THEN
                  -- Find the maximum ID in the table
                  EXECUTE 'SELECT COALESCE(MAX(' || quote_ident(r.column_name) || '), 0) FROM ' || quote_ident(r.table_name) INTO max_id;
                  
                  -- Reset the sequence to max_id + 1
                  -- We use setval(seq, max_id + 1, false) to ensure the next nextval() returns max_id + 1
                  PERFORM setval(seq_name, max_id + 1, false);
                  
                  -- RAISE NOTICE 'Synchronized sequence % for table %.% to %', seq_name, 'public', r.table_name, max_id + 1;
              END IF;
          END LOOP;
      END $$;
    `);
    
    console.log("✅ All database sequences synchronized successfully");
  } catch (error) {
    console.error("❌ Error synchronizing database sequences:", error);
    // We don't throw here to allow the rest of the app to start even if maintenance fails
  }
}
