# Maharashtra Water Dashboard - VS Code Setup Guide

This guide provides step-by-step instructions for setting up and running the Maharashtra Water Dashboard application in VS Code with your pgAdmin database.

## Prerequisites

1. VS Code installed on your computer
2. Node.js and npm installed (Node.js version 16 or higher recommended)
3. pgAdmin installed and running
4. PostgreSQL database named "water_scheme_dashboard" already set up in pgAdmin
5. Database tables already populated with your data

## Setup Instructions

### 1. Extract the Project

Extract the ZIP file to a folder on your computer.

### 2. Open in VS Code

Open VS Code, then use **File > Open Folder** to open the extracted project folder.

### 3. Install Dependencies

Open a terminal in VS Code (Terminal > New Terminal) and run:

```bash
npm install
```

This will install all the required dependencies for the project.

### 4. Configure Database Connection (Already Done)

The project is already configured to connect to your pgAdmin database with the following settings:

- Database Name: water_scheme_dashboard
- Username: postgres
- Password: Salunke@123
- Host: localhost
- Port: 5432

These settings are already in the `.env.vscode` file. If your pgAdmin configuration is different, edit this file accordingly.

### 5. Run the Application

To run the application, press **F5** or click the **Run** button in VS Code. This will:

- Start the application server
- Connect to your pgAdmin database
- Serve the application on http://localhost:5000

### 6. Access the Dashboard

Open your web browser and navigate to:

```
http://localhost:5000
```

You should see the Maharashtra Water Dashboard with all your data from pgAdmin displayed.

## Logging In

The default admin credentials are:

- Username: admin
- Password: admin123

## Troubleshooting

If you encounter any issues:

1. **Database Connection Errors**
   - Ensure PostgreSQL is running in pgAdmin
   - Verify the database name is "water_scheme_dashboard"
   - Check that your username and password are correct

2. **Missing Data**
   - Ensure all required tables exist in your database:
     - region
     - scheme_status
     - users
     - app_state
     - water_scheme_data

3. **Application Not Starting**
   - Check the terminal in VS Code for error messages
   - Ensure all dependencies are installed correctly with `npm install`

4. **Port Already in Use**
   - If port 5000 is already in use, edit the `.env.vscode` file and change the PORT value

## Structure of the Application

The application follows a modern web architecture:

- **Frontend**: React.js with Tailwind CSS for styling
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Features**: 
  - Regional water infrastructure dashboard
  - LPCD (Liters Per Capita per Day) data visualization
  - Scheme status tracking
  - Data import/export capabilities

## Working with Your Data

The application will automatically display all data from your pgAdmin database, including:

- Region data from the "region" table
- Scheme data from the "scheme_status" table
- LPCD data from the "water_scheme_data" table

No additional configuration is needed as long as your tables follow the expected schema.

## Need Additional Help?

If you need further assistance, please check the other documentation files or contact support.