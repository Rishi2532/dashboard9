/**
 * Test script for local database connection and data verification
 * CommonJS version to ensure compatibility
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Get current directory
const __dirname = path.resolve();

// Load environment variables from .env.local if it exists, otherwise from .env
const envPath = fs.existsSync(path.join(__dirname, '.env.local')) 
  ? path.join(__dirname, '.env.local') 
  : path.join(__dirname, '.env');

dotenv.config({ path: envPath });

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Using environment file:', envPath);
  
  // Log which database we're connecting to (without exposing credentials)
  const dbHost = process.env.PGHOST || 'default host';
  const dbName = process.env.PGDATABASE || 'default database';
  console.log(`Attempting to connect to database: ${dbName} on host: ${dbHost}`);

  const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL database!');
    
    // Check tables structure
    await checkTableStructure(client, 'regions');
    await checkTableStructure(client, 'scheme_status');
    await checkTableStructure(client, 'daily_updates');
    
    // Check data counts
    await checkDataCounts(client);
    
    client.release();
    
    console.log('✅ Database connection test completed successfully!');
    console.log('\nThe application should now be able to connect to the database.');
    console.log('Run "npm run dev" to start the application.');
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that PostgreSQL is running');
    console.log('2. Verify the connection details in your .env.local file');
    console.log('3. Make sure your IP address is allowed in PostgreSQL\'s pg_hba.conf');
    console.log('4. Check if the database exists and is accessible');
  } finally {
    await pool.end();
  }
}

async function checkTableStructure(client, tableName) {
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [tableName]);
    
    console.log(`✅ Table '${tableName}' exists with ${result.rows.length} columns`);
    
    // Don't log all columns to avoid cluttering the output, just count them
    if (result.rows.length > 0) {
      const keyColumns = result.rows.slice(0, 3).map(row => row.column_name).join(', ');
      console.log(`   Sample columns: ${keyColumns}${result.rows.length > 3 ? ', ...' : ''}`);
    }
    
  } catch (error) {
    console.error(`❌ Error checking table '${tableName}':`, error.message);
  }
}

async function checkDataCounts(client) {
  try {
    // Check regions count
    const regionsResult = await client.query('SELECT COUNT(*) FROM regions');
    console.log(`✅ Found ${regionsResult.rows[0].count} regions in the database`);
    
    // Check schemes count
    const schemesResult = await client.query('SELECT COUNT(*) FROM scheme_status');
    console.log(`✅ Found ${schemesResult.rows[0].count} schemes in the database`);
    
    // Sample data from regions
    const regionSample = await client.query('SELECT region_name FROM regions LIMIT 3');
    const regionNames = regionSample.rows.map(row => row.region_name).join(', ');
    console.log(`✅ Sample regions: ${regionNames}${regionsResult.rows[0].count > 3 ? ', ...' : ''}`);
    
  } catch (error) {
    console.error('❌ Error checking data counts:', error.message);
  }
}

// Run the test
testConnection();