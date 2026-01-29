# Maharashtra Water Dashboard: pgAdmin Setup Guide

This guide will help you set up and run the Maharashtra Water Dashboard using your pgAdmin database.

## Prerequisites

- pgAdmin 4 installed and configured
- Your database named `water_scheme_dashboard` already created
- Node.js and npm installed on your computer
- PostgreSQL 12 or higher installed

## Step 1: Download and Extract the Dashboard

1. Download the ZIP file containing the Maharashtra Water Dashboard
2. Extract the ZIP file to a location on your computer (e.g., Desktop)
3. Open a terminal or command prompt and navigate to the extracted folder

## Step 2: Configure pgAdmin Connection

The application is pre-configured to connect to your pgAdmin database with these settings:

- **Database Name**: water_scheme_dashboard
- **Username**: postgres  
- **Password**: Salunke@123
- **Host**: localhost
- **Port**: 5432

If your pgAdmin setup is different, you can edit the `.env.pgadmin` file to match your configuration.

### Perplexity API Key Setup

For the AI chatbot functionality, you'll need to add your Perplexity API key to the `.env.pgadmin` file:

1. Open the `.env.pgadmin` file in a text editor
2. Add or update the following line with your API key:
   ```
   PERPLEXITY_API_KEY=your_actual_api_key_here
   ```
3. Save the file

If you don't have a Perplexity API key, you can still use the dashboard, but the chatbot feature won't work.

## Step 3: Run the Dashboard

### For Windows:

Simply double-click the `run-with-pgadmin.bat` file.

### For macOS/Linux:

1. Open Terminal
2. Navigate to the dashboard folder
3. Run: `./run-with-pgadmin.sh`

You may need to make the script executable first:
```
chmod +x run-with-pgadmin.sh
```

## Step 4: Access the Dashboard

1. Once the application is running, open your web browser
2. Navigate to: [http://localhost:5000](http://localhost:5000)
3. Login with the default credentials:
   - Username: admin
   - Password: admin123

## Stopping the Dashboard

To stop the dashboard, return to the terminal window and press `Ctrl+C`.

## Troubleshooting

### Database Connection Issues

If you encounter issues connecting to your pgAdmin database:

1. Verify pgAdmin is running
2. Check if the water_scheme_dashboard database exists
3. Confirm your password is correct (Salunke@123)
4. Ensure PostgreSQL service is running

### Missing Dependencies

If you see errors about missing dependencies:

1. Make sure you have Node.js installed
2. Run `npm install` in the dashboard folder

### Port Conflicts

If port 5000 is already in use:

1. Edit the `server/index.ts` file
2. Change the port number (e.g., from 5000 to 5001)
3. Restart the application

## Additional Setup

If you need to import your own data or connect to a different database, please refer to the full documentation for advanced configuration options.