-- Database Schema for Maharashtra Water Infrastructure Management Platform
-- Created: April 2025

-- Drop tables if they exist
DROP TABLE IF EXISTS updates;
DROP TABLE IF EXISTS scheme_status;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE
);

-- Create regions table
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

-- Create scheme_status table
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

-- Create updates table
CREATE TABLE updates (
  id SERIAL PRIMARY KEY,
  date DATE,
  type TEXT,
  count INTEGER,
  region TEXT,
  affected_ids TEXT[]
);

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO users (username, password, is_admin) 
VALUES ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MUZWRVnj0MSKqgq9tHKkEzJqDBK5pG', TRUE);

-- Insert sample data for regions
INSERT INTO regions (region_name, total_schemes_integrated, fully_completed_schemes, total_villages_integrated, fully_completed_villages, total_esr_integrated, fully_completed_esr, flow_meter_integrated, rca_integrated, pressure_transmitter_integrated) VALUES
('Amravati', 11, 3, 103, 34, 123, 42, 157, 114, 116),
('Chhatrapati Sambhajinagar', 11, 4, 87, 21, 143, 57, 136, 143, 96),
('Konkan', 4, 0, 47, 8, 51, 14, 11, 10, 3),
('Nagpur', 16, 8, 136, 59, 164, 87, 120, 121, 66),
('Nashik', 15, 0, 130, 54, 181, 87, 113, 114, 47),
('Pune', 13, 0, 95, 0, 119, 0, 160, 126, 74);

-- INSERT statements for scheme_status will be generated based on your actual database
-- Run the following script in Node.js to generate these statements:

/*
const { Pool } = require('pg');
const fs = require('fs');

async function exportSchemesData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const result = await pool.query('SELECT * FROM scheme_status');
    let sqlInserts = '';
    
    for (const row of result.rows) {
      // Build the column names
      const columns = Object.keys(row).filter(key => row[key] !== null);
      
      // Build the values, properly escaping strings
      const values = columns.map(col => {
        const val = row[col];
        if (typeof val === 'string') {
          return `'${val.replace(/'/g, "''")}'`;
        } else {
          return val;
        }
      });
      
      sqlInserts += `INSERT INTO scheme_status (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    fs.writeFileSync('scheme_inserts.sql', sqlInserts);
    console.log('Export complete!');
  } catch (err) {
    console.error('Error exporting data:', err);
  } finally {
    pool.end();
  }
}

exportSchemesData();
*/

-- Sample scheme_status data (placeholder - you need to replace with real data)
INSERT INTO scheme_status (scheme_id, region_name, district, taluka, scheme_name, agency, villages, villages_integrated, fully_completed_villages, total_esr, esr_integrated, fully_completed_esr, project_cost, scheme_status, scheme_functional_status) 
VALUES 
('7890975', 'Nagpur', 'Nagpur', 'Hingna', 'Hingna Regional Water Supply Scheme', 'M/s Rite Water', 5, 5, 5, 7, 7, 7, 2540.00, 'Fully-Completed', 'Functional'),
('20050368', 'Nagpur', 'Nagpur', 'Kamptee', 'Kamptee WSS', 'M/s Rite Water', 12, 12, 6, 15, 15, 8, 3254.75, 'In Progress', 'Partial'),
('20003791', 'Amravati', 'Amravati', 'Chandur Bazar', 'Chandur Bazar Regional Water Supply Scheme', 'JISL', 8, 8, 3, 10, 10, 4, 2150.50, 'In Progress', 'Partial'),
('20050345', 'Chhatrapati Sambhajinagar', 'Jalna', 'Ambad', 'Ambad Regional Water Supply Scheme', 'L&T', 7, 7, 2, 12, 12, 5, 1980.25, 'In Progress', 'Partial'),
('20027396', 'Pune', 'Pune', 'Haveli', 'Haveli Regional Water Supply Scheme', 'L&T', 8, 8, 0, 10, 10, 0, 2340.80, 'In Progress', 'Partial'),
('20046372', 'Nashik', 'Nashik', 'Dindori', 'Dindori Regional Water Supply Scheme', 'JISL', 9, 9, 4, 14, 14, 7, 2780.60, 'In Progress', 'Partial'),
('20037165', 'Konkan', 'Ratnagiri', 'Ratnagiri', 'Ratnagiri Regional Water Supply Scheme', 'L&T', 5, 5, 1, 6, 6, 2, 1875.40, 'In Progress', 'Partial');

-- Sample updates data (today's date)
INSERT INTO updates (date, type, count, region, affected_ids)
VALUES 
(CURRENT_DATE, 'scheme', 3, 'Amravati', '{20003791}'),
(CURRENT_DATE, 'village', 5, 'Nagpur', '{village001,village002,village003,village004,village005}');