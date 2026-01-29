/**
 * Migration script to remove the primary key constraint from scheme_status table
 * This will allow the same scheme to appear multiple times with different block values
 */
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require('pg');
const { sql } = require("drizzle-orm");
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get DB connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

async function migrateRemovePrimaryKey() {
  // Connect to the database
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });
  
  const db = drizzle(pool);
  
  try {
    console.log('Starting migration to remove primary key constraint from scheme_status table...');
    
    // Check if the table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scheme_status'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('scheme_status table does not exist. No migration needed.');
      return;
    }
    
    console.log('Checking for primary key on scheme_status table...');
    
    // Check if primary key constraint exists
    const constraintCheck = await db.execute(sql`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'scheme_status'::regclass
      AND contype = 'p';
    `);
    
    if (constraintCheck.rows.length === 0) {
      console.log('No primary key constraint found. Table is already configured correctly.');
    } else {
      // Get the constraint name
      const constraintName = constraintCheck.rows[0].conname;
      console.log(`Found primary key constraint: ${constraintName}`);
      
      // Drop the constraint
      await db.execute(sql`
        ALTER TABLE "scheme_status" DROP CONSTRAINT IF EXISTS ${sql.raw(constraintName)};
      `);
      
      console.log('Primary key constraint has been removed successfully!');
    }
    
    // Create a backup of the current data
    console.log('Creating a backup of scheme_status data...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scheme_status_backup" AS 
      SELECT * FROM "scheme_status";
    `);
    console.log('Backup created as scheme_status_backup table');
    
    console.log('Checking for duplicate records after migration...');
    const duplicateCheck = await db.execute(sql`
      SELECT scheme_id, block, COUNT(*) 
      FROM scheme_status 
      GROUP BY scheme_id, block 
      HAVING COUNT(*) > 1;
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log(`Found ${duplicateCheck.rows.length} duplicates that are now allowed with the new schema.`);
    } else {
      console.log('No duplicate records found.');
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the migration
migrateRemovePrimaryKey().catch(console.error);