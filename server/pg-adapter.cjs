// This is a CommonJS module that will be used by ESM modules
const pg = require('pg');
const { Pool } = pg;
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables with explicit path
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment from: ${envPath} (exists: ${fs.existsSync(envPath)})`);
dotenv.config({ path: envPath });

// Log environment variables for debugging (without showing complete password)
console.log('PostgreSQL Connection Configuration:');
console.log(`Host: ${process.env.PGHOST || 'localhost'}`);
console.log(`Database: ${process.env.PGDATABASE || 'not set'}`);
console.log(`User: ${process.env.PGUSER || 'postgres'}`);
console.log(`Password is set: ${process.env.PGPASSWORD ? 'Yes' : 'No'}`);

// Make sure password is a string
let password = process.env.PGPASSWORD;
if (!password || typeof password !== 'string') {
  console.warn('Password is not a string or is undefined, converting explicitly');
  // If password is completely undefined, use a default value for local development
  password = String(password || 'Salunke@123');
  // Make sure we have a valid string password
  if (!password) {
    console.error('ERROR: No password provided in environment variables!');
    process.exit(1);
  }
}

// Create pool using DATABASE_URL or fallback to explicit parameters
let pool;
// Check for Replit's DATABASE_URL environment variable
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for PostgreSQL connection');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    // Enable SSL for Neon DB connections
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });
} else {
  console.log('Using explicit parameters for PostgreSQL connection');
  pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    password: password, // Use the string version
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || '5432'),
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  });
}

// Log connection attempts
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Export the pool
module.exports = pool;