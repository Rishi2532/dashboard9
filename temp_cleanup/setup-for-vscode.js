/**
 * VS Code Setup Script for Maharashtra Water Dashboard
 * 
 * This script prepares the project to run in VS Code by:
 * 1. Creating the necessary .env file with all database connection details
 * 2. Setting up the VS Code launch configuration
 * 3. Generating a README with clear setup instructions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function setupForVSCode() {
  try {
    console.log('🔧 Setting up Maharashtra Water Dashboard for VS Code...');
    
    // Create .env.vscode file with database configuration
    const envContent = `DATABASE_URL=${process.env.DATABASE_URL || ''}
PGDATABASE=${process.env.PGDATABASE || ''}
PGHOST=${process.env.PGHOST || ''}
PGPORT=${process.env.PGPORT || ''}
PGUSER=${process.env.PGUSER || ''}
PGPASSWORD=${process.env.PGPASSWORD || ''}
PERPLEXITY_API_KEY=${process.env.PERPLEXITY_API_KEY || ''}
`;

    fs.writeFileSync('.env.vscode', envContent);
    console.log('✅ Created .env.vscode file with database configuration');

    // Create VS Code launch configuration directory if it doesn't exist
    if (!fs.existsSync('.vscode')) {
      fs.mkdirSync('.vscode');
    }
    
    // Create VS Code launch.json
    const launchConfig = {
      "version": "0.2.0",
      "configurations": [
        {
          "type": "node",
          "request": "launch",
          "name": "Launch Water Dashboard",
          "skipFiles": ["<node_internals>/**"],
          "runtimeExecutable": "npm",
          "runtimeArgs": ["run", "dev"],
          "envFile": "${workspaceFolder}/.env.vscode",
          "console": "integratedTerminal"
        }
      ]
    };
    
    fs.writeFileSync('.vscode/launch.json', JSON.stringify(launchConfig, null, 2));
    console.log('✅ Created VS Code launch configuration');
    
    // Create VS Code README with instructions
    const readmeContent = `# Maharashtra Water Dashboard - VS Code Setup Guide

## Overview

The Maharashtra Water Dashboard provides a comprehensive view of water infrastructure across Maharashtra regions, including:

- Regional scheme summary visualization
- Detailed scheme status reporting
- Flow meter and chlorine analyzer tracking
- Interactive maps of water infrastructure
- AI-powered voice chatbot assistant
- Multi-language support

## Setup Instructions

1. **Install Node.js**: Make sure you have Node.js version 16 or higher installed

2. **Install Dependencies**: Open a terminal and run:
   \`\`\`
   npm install
   \`\`\`

3. **Start the Application**: 
   
   Either:
   - Press F5 in VS Code to start with the debugger
   - Or run \`npm run dev\` in the terminal
   
   The application will be accessible at http://localhost:5000

4. **Login Credentials**:
   - Username: admin
   - Password: admin123

## Database Configuration

Database configuration is already set up in the \`.env.vscode\` file.

## API Keys

The Perplexity API key is required for the chatbot functionality. If it's not already set in the \`.env.vscode\` file, you'll need to update it with your own key.

## Troubleshooting

If you encounter any issues:

1. **Database Connection**:
   - Verify that the database connection details in \`.env.vscode\` are correct
   - Run \`node test-local-db.js\` to test the database connection

2. **Missing Packages**:
   - Run \`npm install\` to ensure all dependencies are installed

3. **Port Conflicts**:
   - If port 5000 is already in use, update the port in \`server/index.ts\`
`;

    fs.writeFileSync('VS-CODE-README.md', readmeContent);
    console.log('✅ Created VS-CODE-README.md with usage instructions');

    // Create a .gitignore if it doesn't exist to avoid committing environment variables
    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', `node_modules/
.env
.env.*
!.env.example
dist/
`);
      console.log('✅ Created .gitignore file');
    } else {
      // Append .env files to .gitignore if they're not already there
      let gitignore = fs.readFileSync('.gitignore', 'utf8');
      if (!gitignore.includes('.env.*')) {
        gitignore += '\n.env.*\n';
        fs.writeFileSync('.gitignore', gitignore);
        console.log('✅ Updated .gitignore to exclude sensitive files');
      }
    }
    
    // Create a run-in-vscode.bat file for Windows users
    const batchFile = `@echo off
echo Starting Maharashtra Water Dashboard...
echo.
npm install
npm run dev
`;
    fs.writeFileSync('run-in-vscode.bat', batchFile);
    console.log('✅ Created run-in-vscode.bat for Windows users');

    console.log('\n✨ Setup for VS Code is complete! ✨');
    console.log('\nYou can now:');
    console.log('  1. Copy this entire project folder to your local machine');
    console.log('  2. Open it in VS Code');
    console.log('  3. Start the application by pressing F5 or running the batch file');
    console.log('  4. See VS-CODE-README.md for more detailed instructions');
    
  } catch (error) {
    console.error('❌ Error setting up for VS Code:', error);
  }
}

// Run the setup
setupForVSCode();