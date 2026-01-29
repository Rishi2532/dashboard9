/**
 * VS Code Setup Script for PgAdmin Connection
 * 
 * This script helps set up your application to work with VS Code and pgAdmin.
 * Run this script once before starting the application in VS Code.
 */

// Fix for CommonJS module import
import pkg from 'pg';
const { Pool } = pkg;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupVSCode() {
  console.log('Setting up VS Code environment for pgAdmin connection...');
  
  try {
    // Create .env.vscode file with pgAdmin connection details
    const envContent = `# Database configuration for VS Code (pgAdmin)
DATABASE_URL=postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
PGPORT=5432
PGUSER=postgres
PGPASSWORD=Salunke@123
PGDATABASE=water_scheme_dashboard
PGHOST=localhost

# Port settings
PORT=5000

# Node settings
NODE_ENV=development
`;

    fs.writeFileSync(path.join(__dirname, '.env.vscode'), envContent);
    console.log('✅ Created .env.vscode file with pgAdmin connection details');

    // Create VS Code launch configuration if it doesn't exist
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
          "envFile": "${workspaceFolder}/.env.vscode",
          "console": "integratedTerminal"
        }
      ]
    };

    fs.writeFileSync(
      path.join(vscodeDir, 'launch.json'),
      JSON.stringify(launchConfig, null, 2)
    );
    console.log('✅ Created VS Code launch configuration');

    // Create a README-VSCODE.md file with instructions
    const readmeContent = `# Maharashtra Water Dashboard - VS Code Setup

## Overview

This project is configured to work with VS Code and pgAdmin. It uses your local PostgreSQL database with the following configuration:

- Database Name: water_scheme_dashboard
- Username: postgres
- Password: Salunke@123
- Host: localhost
- Port: 5432

## Running the Application

1. Open this project in VS Code
2. Press F5 or click the Run button to start the application
3. The application will be available at http://localhost:5000

## Important Notes

- The application is configured to use your pgAdmin database
- All data from your pgAdmin database will be displayed in the dashboard
- No changes to the configuration are needed

## Troubleshooting

If you encounter any issues:

1. Make sure your pgAdmin PostgreSQL server is running
2. Verify the database name is "water_scheme_dashboard"
3. Check that all tables are present in the database
4. If needed, edit .env.vscode to update database credentials
`;

    fs.writeFileSync(path.join(__dirname, 'README-VSCODE.md'), readmeContent);
    console.log('✅ Created README-VSCODE.md with setup instructions');

    // Test the database connection
    console.log('\nTesting connection to pgAdmin database...');
    const pool = new Pool({
      connectionString: 'postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard'
    });

    try {
      const client = await pool.connect();
      console.log('✅ Successfully connected to pgAdmin database!');
      
      // Check if tables exist
      console.log('\nChecking for required tables:');
      const requiredTables = ['region', 'scheme_status', 'users', 'app_state', 'water_scheme_data'];
      
      for (const table of requiredTables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        const exists = result.rows[0].exists;
        console.log(`- Table "${table}": ${exists ? '✅ Found' : '❌ Not found'}`);
      }
      
      client.release();
    } catch (error) {
      console.error('❌ Error connecting to pgAdmin database:', error.message);
      console.log('\nPlease ensure:');
      console.log('1. PostgreSQL is running in pgAdmin');
      console.log('2. The database "water_scheme_dashboard" exists');
      console.log('3. The username and password are correct');
    } finally {
      await pool.end();
    }
    
    console.log('\n✅ VS Code setup complete!');
    console.log('To start the application, open VS Code and press F5 or run "npm run dev" with the correct environment');
  } catch (error) {
    console.error('Error setting up VS Code:', error);
  }
}

// Run the setup
setupVSCode();