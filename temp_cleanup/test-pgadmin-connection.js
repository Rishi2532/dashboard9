/**
 * Test script for pgAdmin database connection
 * 
 * This script verifies that your pgAdmin database connection
 * is properly configured. It checks the water_scheme_dashboard database
 * and confirms if all required tables are present.
 */

// Load environment variables from .env.pgadmin
require('dotenv').config({ path: '.env.pgadmin' });

const { Pool } = require('pg');

async function testPgAdminConnection() {
  console.log('Testing pgAdmin database connection...');
  console.log('----------------------------------');
  console.log(`Database: ${process.env.PGDATABASE}`);
  console.log(`Host: ${process.env.PGHOST}`);
  console.log(`Port: ${process.env.PGPORT}`);
  console.log(`User: ${process.env.PGUSER}`);
  console.log('Password: [hidden]');
  console.log('----------------------------------');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL database!');

    // Test if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log(`\n📋 Found ${tables.rows.length} tables in your database:`);
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check for required tables
    const requiredTables = ['region', 'scheme_status', 'water_scheme_data'];
    console.log('\n🔍 Checking for required tables:');
    
    let allRequired = true;
    requiredTables.forEach(table => {
      const exists = tables.rows.some(row => row.table_name === table);
      console.log(`  - ${table}: ${exists ? '✅ Found' : '❌ Missing'}`);
      if (!exists) allRequired = false;
    });

    if (allRequired) {
      console.log('\n🎉 All required tables are present! Your pgAdmin database is configured correctly.');
      console.log('\nYou can now run the Maharashtra Water Dashboard with:');
      console.log('  - Windows: Double-click run-with-pgadmin.bat');
      console.log('  - Mac/Linux: ./run-with-pgadmin.sh');
    } else {
      console.log('\n⚠️ Some required tables are missing.');
      console.log('The application may not function correctly until all required tables are present.');
      console.log('Please refer to the documentation for importing the necessary data.');
    }

    client.release();
  } catch (err) {
    console.error('❌ Error connecting to PostgreSQL database:', err.message);
    console.error('\nPossible solutions:');
    console.error('1. Make sure pgAdmin is running');
    console.error('2. Verify the database "water_scheme_dashboard" exists');
    console.error('3. Check your password is correct (Salunke@123)');
    console.error('4. Ensure PostgreSQL service is running');
    console.error('\nFor help, refer to PGADMIN-SETUP.md');
  } finally {
    await pool.end();
  }
}

testPgAdminConnection();