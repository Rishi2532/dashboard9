/**
 * VS Code Setup Script
 * 
 * This script sets up the application to work with VS Code and local PostgreSQL.
 * It exports the current environment variables to a format that can be used locally.
 * 
 * Run this once before starting your application in VS Code.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupVSCode() {
  console.log('Setting up VS Code environment...');
  
  try {
    // Create .env.local file with actual values from current environment
    const envContent = `# Database configuration
DATABASE_URL=${process.env.DATABASE_URL || ''}
PGPORT=${process.env.PGPORT || ''}
PGUSER=${process.env.PGUSER || ''}
PGPASSWORD=${process.env.PGPASSWORD || ''}
PGDATABASE=${process.env.PGDATABASE || ''}
PGHOST=${process.env.PGHOST || ''}

# OpenAI API Key for chatbot functionality
OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}

# Port settings
PORT=5000

# Node settings
NODE_ENV=development
`;

    fs.writeFileSync(path.join(__dirname, '.env.local'), envContent);
    console.log('✅ Created .env.local file with current environment variables');

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

    // Generate README.md with setup instructions
    const readmeContent = `# Maharashtra Water Dashboard

## Getting Started with VS Code

This project is configured to run easily in Visual Studio Code. Follow these steps:

1. **Open the project** in VS Code
2. Make sure the .env.local file contains the correct database and OpenAI API credentials
3. Install dependencies by running:
   \`\`\`
   npm install
   \`\`\`
4. Start the application using one of these methods:
   - Press F5 to launch the debuggable server
   - Use the "Terminal > Run Task..." menu and select "Start App"
   - Run \`npm run dev\` in the terminal

The application will be accessible at http://localhost:5000

## Features

- Interactive dashboard for Maharashtra water infrastructure
- Regional water scheme visualization
- Voice-enabled chatbot assistant (supports multiple Indian languages)
- Data filtering by region, scheme status, etc.

## Environment Variables

If you need to change any environment variables, edit the .env.local file.

## Chatbot Functionality

The chatbot requires an OpenAI API key to function properly. Make sure the OPENAI_API_KEY 
environment variable is set in your .env.local file.
`;

    fs.writeFileSync(path.join(__dirname, 'README.md'), readmeContent);
    console.log('✅ Created README.md with setup instructions');

    // Install dependencies required for VS Code
    console.log('Installing dotenv package for local environment support...');
    execSync('npm install dotenv --save', { stdio: 'inherit' });
    
    console.log('\n✅ VS Code setup complete! You can now open this project in VS Code.');
    console.log('To start the application, open VS Code and press F5 or run "npm run dev"');
  } catch (error) {
    console.error('Error setting up VS Code:', error);
  }
}

// Run the setup
setupVSCode();