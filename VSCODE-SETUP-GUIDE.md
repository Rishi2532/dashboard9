# Maharashtra Water Dashboard - VS Code Setup Guide

## Overview

The Maharashtra Water Dashboard is a comprehensive water infrastructure management platform designed to provide intelligent, user-friendly exploration of regional water projects through advanced geospatial and AI technologies.

This guide will help you set up and run the project in Visual Studio Code without any configuration changes.

## Project Features

- **Regional Dashboard**: View and filter water infrastructure data by region
- **Scheme Management**: Track the status of various water schemes across Maharashtra
- **LPCD Tracking**: Monitor Liters Per Capita per Day (LPCD) for villages
- **Analytics**: View water consumption trends and statistics
- **AI Chatbot**: Utilize the Perplexity-powered AI assistant for quick insights
- **Administrative Tools**: Import and manage water scheme data

## Prerequisites

Before setting up the project, ensure you have:

1. **Visual Studio Code** installed ([Download here](https://code.visualstudio.com/))
2. **Node.js** (version 16 or higher) installed ([Download here](https://nodejs.org/))
3. **Git** installed (for cloning the repository)

## Setup Instructions

### Step 1: Clone or Download the Repository

Clone this repository to your local machine:

```bash
git clone <repository-url>
```

Or download and extract the ZIP file of this repository.

### Step 2: Prepare Environment

1. Open the project folder in VS Code
2. Run the setup script to prepare the environment:

```bash
node setup-for-vscode.js
```

This script will:
- Create the necessary `.env.vscode` file with database connection details
- Set up VS Code launch configuration
- Create a batch file for easy startup on Windows

### Step 3: Install Dependencies

Open a terminal in VS Code and run:

```bash
npm install
```

This will install all required packages and dependencies.

### Step 4: Start the Application

There are three ways to start the application:

1. **Using VS Code Debugger**:
   - Press `F5` to start the application with debugging
   
2. **Using Terminal**:
   - Run `npm run dev` in the terminal
   
3. **Using Batch File** (Windows):
   - Double-click the `run-in-vscode.bat` file

The application will be accessible at http://localhost:5000

### Step 5: Login to the Application

Use the following credentials to log in:
- Username: `admin`
- Password: `admin123`

## Configuration

### Database Configuration

The database connection details are automatically set up in the `.env.vscode` file. If you need to modify these settings, edit this file directly.

### API Keys

The Perplexity API key is required for the AI chatbot functionality. If it's not already set in the `.env.vscode` file, you'll need to:

1. Obtain an API key from [Perplexity AI](https://www.perplexity.ai/)
2. Add it to the `.env.vscode` file:
   ```
   PERPLEXITY_API_KEY=your_api_key_here
   ```

## Troubleshooting

### Database Connection Issues

If you encounter database connection problems:

1. Verify that the database connection details in `.env.vscode` are correct
2. Run `node test-local-db.js` to test the database connection

### Missing Packages

If you encounter errors about missing packages:

1. Run `npm install` to ensure all dependencies are installed
2. Check the console for specific error messages about missing packages

### Port Conflicts

If port 5000 is already in use:

1. Edit `server/index.ts` to change the port number
2. Or stop the process using port 5000 before starting the application

## Project Structure

- `/client`: Frontend React application
- `/server`: Backend Express API
- `/shared`: Shared types and schemas
- `/uploads`: Temporary storage for uploaded files

## Development Tips

- Use the VS Code debugger (F5) for easy debugging
- Changes to the code will automatically refresh the application
- The console in VS Code will show server logs and errors
- API routes are defined in `server/routes.ts`
- Database models are defined in `shared/schema.ts`

## Support

If you encounter any issues or have questions, please refer to:
- The commented code sections for specific implementation details
- The various utility scripts in the project root for database and setup functions