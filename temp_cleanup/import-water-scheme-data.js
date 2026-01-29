/**
 * Script to import water scheme data sample into the database
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importWaterSchemeData() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Please set it in your environment variables.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Create water_scheme_data table if it doesn't exist
    console.log('Creating water_scheme_data table if it doesn\'t exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS water_scheme_data (
        id SERIAL PRIMARY KEY,
        region TEXT,
        circle TEXT,
        division TEXT,
        sub_division TEXT,
        block TEXT,
        scheme_id TEXT,
        scheme_name TEXT,
        village_name TEXT,
        population INTEGER,
        number_of_esr NUMERIC,
        water_value_day1 NUMERIC,
        water_value_day2 NUMERIC,
        water_value_day3 NUMERIC,
        water_value_day4 NUMERIC,
        water_value_day5 NUMERIC,
        water_value_day6 NUMERIC,
        lpcd_value_day1 NUMERIC,
        lpcd_value_day2 NUMERIC,
        lpcd_value_day3 NUMERIC,
        lpcd_value_day4 NUMERIC,
        lpcd_value_day5 NUMERIC,
        lpcd_value_day6 NUMERIC,
        lpcd_value_day7 NUMERIC,
        water_date_day1 TEXT,
        water_date_day2 TEXT,
        water_date_day3 TEXT,
        water_date_day4 TEXT,
        water_date_day5 TEXT,
        water_date_day6 TEXT,
        lpcd_date_day1 TEXT,
        lpcd_date_day2 TEXT,
        lpcd_date_day3 TEXT,
        lpcd_date_day4 TEXT,
        lpcd_date_day5 TEXT,
        lpcd_date_day6 TEXT,
        lpcd_date_day7 TEXT,
        consistent_zero_lpcd_for_a_week BOOLEAN,
        below_55_lpcd_count INTEGER,
        above_55_lpcd_count INTEGER
      );
    `);

    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, 'attached_assets', 'deepseek_sql_20250420_7b9ba1.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    console.log('Importing water scheme data from SQL file...');
    await pool.query(sqlContent);

    console.log('Water scheme data imported successfully!');

    // Display some sample data
    const sampleResult = await pool.query('SELECT * FROM water_scheme_data LIMIT 5');
    console.log('Sample data:', sampleResult.rows);

    console.log(`Total records imported: ${sampleResult.rowCount}`);
  } catch (error) {
    console.error('Error importing water scheme data:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the script
importWaterSchemeData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});