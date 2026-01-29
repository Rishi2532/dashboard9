// test-db.js - CommonJS module for testing database connection
const { Pool } = require('pg');
require('dotenv').config();

console.log('====== DATABASE CONNECTION TEST ======');

// Log environment variables (without showing full password)
console.log('Connection parameters:');
const password = process.env.PGPASSWORD || '';
const maskedPassword = password ? '****' + password.slice(-2) : 'NOT SET';

console.log({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || '5432',
  password: maskedPassword,
  connectionString: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
});

// Try both connection methods
async function testConnection() {
  try {
    console.log('\nTEST 1: Connecting with explicit parameters');
    const pool1 = new Pool({
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: parseInt(process.env.PGPORT || '5432'),
    });

    // Test connection
    const client1 = await pool1.connect();
    console.log('✅ TEST 1 SUCCESS: Connected to PostgreSQL with explicit parameters');
    
    const result1 = await client1.query('SELECT NOW() as time');
    console.log('Database time:', result1.rows[0].time);
    
    client1.release();
    await pool1.end();
    
    console.log('\nTEST 2: Connecting with connection string');
    // Create pool with connectionString
    const pool2 = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const client2 = await pool2.connect();
    console.log('✅ TEST 2 SUCCESS: Connected to PostgreSQL with connection string');
    
    const result2 = await client2.query('SELECT NOW() as time');
    console.log('Database time:', result2.rows[0].time);
    
    client2.release();
    await pool2.end();
    
    console.log('\n✅ ALL TESTS PASSED: Database connection is working correctly');
  } catch (err) {
    console.error('\n❌ ERROR connecting to PostgreSQL:', err.message);
    if (err.message.includes('password')) {
      console.error('🔑 HINT: Check your PostgreSQL password in the .env file');
      console.error('Make sure PGPASSWORD is set correctly and that your password does not contain special characters');
    }
    if (err.message.includes('connect ECONNREFUSED')) {
      console.error('🔌 HINT: Check if PostgreSQL server is running');
      console.error('Make sure the host and port are correct in your .env file');
    }
  }
}

testConnection();