/**
 * PgAdmin Setup Script for VS Code (CommonJS version)
 * 
 * This script configures the application to use a local PostgreSQL database
 * created in pgAdmin with the name "water_scheme_dashboard".
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Get current directory
const __dirname = path.resolve();

// Create the pgAdmin environment file if it doesn't exist
const pgAdminEnvPath = path.join(__dirname, '.env.pgadmin');
if (!fs.existsSync(pgAdminEnvPath)) {
  const envContent = `# Database configuration for local pgAdmin
DATABASE_URL=postgresql://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=Salunke@123
PGDATABASE=water_scheme_dashboard

# OpenAI API Key for chatbot functionality
OPENAI_API_KEY=

# Port settings
PORT=5000

# Node settings
NODE_ENV=development`;

  fs.writeFileSync(pgAdminEnvPath, envContent);
  console.log('✅ Created .env.pgadmin file');
}

// Load environment variables from .env.pgadmin
dotenv.config({ path: pgAdminEnvPath });

async function setupPgAdmin() {
  console.log('Setting up for pgAdmin database: water_scheme_dashboard');
  
  try {
    // Copy .env.pgadmin to .env.local
    fs.copyFileSync(
      path.join(__dirname, '.env.pgadmin'),
      path.join(__dirname, '.env.local')
    );
    console.log('✅ Created .env.local with pgAdmin database configuration');
    
    // Test database connection
    console.log('Testing connection to pgAdmin database...');
    const pool = new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: false
    });
    
    try {
      const client = await pool.connect();
      console.log('✅ Successfully connected to pgAdmin database');
      
      // Check if necessary tables exist
      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('regions', 'scheme_status', 'daily_updates')
      `);
      
      const existingTables = tablesResult.rows.map(row => row.table_name);
      console.log('Existing tables:', existingTables.join(', ') || 'None');
      
      // If tables don't exist, create them
      if (existingTables.length < 3) {
        console.log('Some tables are missing. Setting up database schema...');
        
        // Run database initialization script
        console.log('Creating database tables...');
        
        // Create regions table if needed
        if (!existingTables.includes('regions')) {
          await client.query(`
            CREATE TABLE regions (
              region_id SERIAL PRIMARY KEY,
              region_name TEXT NOT NULL,
              total_schemes INTEGER DEFAULT 0,
              total_schemes_integrated INTEGER DEFAULT 0,
              fully_completed_schemes INTEGER DEFAULT 0,
              total_villages INTEGER DEFAULT 0,
              total_villages_integrated INTEGER DEFAULT 0,
              fully_completed_villages INTEGER DEFAULT 0,
              total_esr INTEGER DEFAULT 0,
              total_esr_integrated INTEGER DEFAULT 0,
              fully_completed_esr INTEGER DEFAULT 0,
              agency TEXT DEFAULT 'MSEDCL',
              latitude DECIMAL(10, 8) DEFAULT NULL,
              longitude DECIMAL(11, 8) DEFAULT NULL,
              flow_meter_integrated INTEGER DEFAULT 0,
              rca_integrated INTEGER DEFAULT 0,
              pressure_transmitter_integrated INTEGER DEFAULT 0
            )
          `);
          console.log('✅ Created regions table');
          
          // Insert sample regions
          const regionNames = ['Amravati', 'Aurangabad', 'Chhatrapati Sambhajinagar', 'Konkan', 'Mumbai', 'Nagpur', 'Nashik', 'Pune', 'Thane'];
          
          for (const name of regionNames) {
            const agency = getAgencyByRegion(name);
            await client.query(`
              INSERT INTO regions (region_name, agency) VALUES ($1, $2)
            `, [name, agency]);
          }
          console.log('✅ Inserted sample regions');
        }
        
        // Create scheme_status table if needed
        if (!existingTables.includes('scheme_status')) {
          await client.query(`
            CREATE TABLE scheme_status (
              sr_no SERIAL PRIMARY KEY,
              scheme_id TEXT UNIQUE NOT NULL,
              region TEXT NOT NULL,
              district TEXT,
              taluka TEXT,
              name_of_scheme TEXT,
              scheme_type TEXT,
              source_of_water TEXT,
              total_villages INTEGER DEFAULT 0,
              villages_covered INTEGER DEFAULT 0,
              villages_integrated INTEGER DEFAULT 0,
              total_habitations INTEGER DEFAULT 0,
              habitations_integrated INTEGER DEFAULT 0,
              villages_iot_integrated INTEGER DEFAULT 0,
              total_esrs INTEGER DEFAULT 0,
              esrs_integrated INTEGER DEFAULT 0,
              villages_with_full_integration INTEGER DEFAULT 0,
              cumulative_status TEXT,
              scheme_status TEXT,
              integration_status TEXT,
              agency TEXT,
              entry_date DATE DEFAULT CURRENT_DATE,
              latitude DECIMAL(10, 8),
              longitude DECIMAL(11, 8),
              flow_meter_integrated INTEGER DEFAULT 0,
              rca_integrated INTEGER DEFAULT 0,
              pressure_transmitter_integrated INTEGER DEFAULT 0,
              total_villages_in_scheme INTEGER DEFAULT 0,
              scheme_functional_status TEXT DEFAULT 'Functional',
              circle TEXT,
              division TEXT
            )
          `);
          console.log('✅ Created scheme_status table');
          
          // Insert sample scheme for each region
          const regions = await client.query('SELECT region_id, region_name FROM regions');
          
          for (const region of regions.rows) {
            const schemeId = `${region.region_id}00001`;
            const agency = getAgencyByRegion(region.region_name);
            
            await client.query(`
              INSERT INTO scheme_status (
                scheme_id, region, district, name_of_scheme, scheme_type, 
                total_villages, villages_integrated, total_esrs, esrs_integrated,
                scheme_status, integration_status, agency, flow_meter_integrated,
                rca_integrated, pressure_transmitter_integrated
              ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, 
                $10, $11, $12, $13,
                $14, $15
              )
            `, [
              schemeId, 
              region.region_name, 
              region.region_name + ' District', 
              region.region_name + ' Water Supply Scheme',
              'Regional',
              10, // total_villages
              5,  // villages_integrated
              8,  // total_esrs
              4,  // esrs_integrated
              'Fully Completed',
              'Full Integration',
              agency,
              3, // flow_meter_integrated
              2, // rca_integrated
              2  // pressure_transmitter_integrated
            ]);
          }
          console.log('✅ Inserted sample schemes');
        }
        
        // Create daily_updates table if needed
        if (!existingTables.includes('daily_updates')) {
          await client.query(`
            CREATE TABLE daily_updates (
              id SERIAL PRIMARY KEY,
              type TEXT NOT NULL,
              count INTEGER NOT NULL,
              region TEXT NOT NULL,
              status TEXT,
              update_date DATE DEFAULT CURRENT_DATE
            )
          `);
          console.log('✅ Created daily_updates table');
          
          // Insert sample update
          await client.query(`
            INSERT INTO daily_updates (type, count, region, status, update_date)
            VALUES ('scheme', 5, 'Nagpur', 'Fully Completed', CURRENT_DATE)
          `);
          console.log('✅ Inserted sample daily update');
        }
        
        console.log('✅ Database schema setup completed successfully!');
      } else {
        console.log('✅ All necessary tables already exist in the database');
      }
      
      client.release();
      
    } catch (error) {
      console.error('❌ Error connecting to pgAdmin database:', error.message);
      console.log('\nPlease check:');
      console.log('1. pgAdmin and PostgreSQL are running');
      console.log('2. You have created a database named "water_scheme_dashboard"');
      console.log('3. The database user has the correct permissions');
      console.log('4. Your password is correct (Salunke@123)');
      throw error;
    } finally {
      await pool.end();
    }
    
    // Create VS Code launch configuration
    const vscodeDir = path.join(__dirname, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir);
    }
    
    const launchConfig = {
      "version": "0.2.0",
      "configurations": [
        {
          "type": "node",
          "request": "launch",
          "name": "Launch Server",
          "runtimeExecutable": "npm",
          "runtimeArgs": ["run", "dev"],
          "envFile": "${workspaceFolder}/.env.local",
          "console": "integratedTerminal"
        }
      ]
    };
    
    fs.writeFileSync(
      path.join(vscodeDir, 'launch.json'),
      JSON.stringify(launchConfig, null, 2)
    );
    console.log('✅ Created VS Code launch configuration');
    
    // Create VS Code tasks configuration
    const tasksConfig = {
      "version": "2.0.0",
      "tasks": [
        {
          "label": "Start App",
          "type": "npm",
          "script": "dev",
          "problemMatcher": [],
          "presentation": {
            "reveal": "always"
          },
          "group": {
            "kind": "build",
            "isDefault": true
          },
          "options": {
            "env": {
              "NODE_ENV": "development"
            }
          }
        }
      ]
    };
    
    fs.writeFileSync(
      path.join(vscodeDir, 'tasks.json'),
      JSON.stringify(tasksConfig, null, 2)
    );
    console.log('✅ Created VS Code tasks configuration');
    
    // Check if package.json exists, if not create a minimal one
    if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
      const packageJson = {
        "name": "maharashtra-water-dashboard",
        "version": "1.0.0",
        "description": "Dashboard for Maharashtra water infrastructure",
        "main": "server/index.js",
        "type": "commonjs",
        "scripts": {
          "dev": "node server/index.js",
          "start": "node server/index.js"
        },
        "dependencies": {
          "dotenv": "^16.3.1",
          "express": "^4.18.2",
          "pg": "^8.11.3"
        }
      };
      
      fs.writeFileSync(
        path.join(__dirname, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      console.log('✅ Created basic package.json file');
    }
    
    console.log('\n✅ Setup completed successfully! Your application is now configured to work with pgAdmin.');
    console.log('\nYou can now open this project in VS Code and start the application by:');
    console.log('1. Running "npm install" to install dependencies');
    console.log('2. Pressing F5, or Running "npm run dev" in the terminal');
    console.log('\nThe application will be available at http://localhost:5000');
    
  } catch (error) {
    console.error('❌ Error during pgAdmin setup:', error.message);
  }
}

function getAgencyByRegion(regionName) {
  // Business rule for determining agency based on region
  if (regionName.includes('Nagpur') || regionName.includes('Amravati') || 
      regionName.includes('Aurangabad') || regionName.includes('Chhatrapati Sambhajinagar')) {
    return 'MSEDCL';
  } else if (regionName.includes('Nashik')) {
    return 'MJP';
  } else if (regionName.includes('Konkan') || regionName.includes('Thane')) {
    return 'Co-Op';
  } else {
    return 'MSEDCL'; // Default agency
  }
}

// Run the setup
setupPgAdmin();