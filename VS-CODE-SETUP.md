# Setting Up and Running the Maharashtra Water Dashboard in VS Code

## Pre-requisites

- [Visual Studio Code](https://code.visualstudio.com/) installed
- [Node.js](https://nodejs.org/) (v14 or later) installed
- [PostgreSQL](https://www.postgresql.org/download/) installed locally (optional, see database options below)

## Setup Process

### Step 1: Clone the Repository

Clone this repository to your local machine.

### Step 2: Run the Setup Script

Before opening the project in VS Code, run the setup script to prepare the environment:

```bash
node setup-vscode.js
```

This script will:
- Create a `.env.local` file with all necessary environment variables
- Set up VS Code launch and task configurations
- Install required dependencies

### Step 3: Configure Database

You have two options for the database:

#### Option A: Use the Remote Database (Recommended)
- The `.env.local` file already contains the connection details for the remote PostgreSQL database
- No additional setup required

#### Option B: Set Up a Local PostgreSQL Database
1. Create a new database in your local PostgreSQL installation
2. Update the database connection details in the `.env.local` file
3. Import the database schema and data using:
   ```bash
   psql -U your_username -d your_database_name -f database_backup.sql
   ```

### Step 4: Configure OpenAI API Key

For the chatbot to function properly, you need to set up an OpenAI API key:

1. Get an API key from [OpenAI](https://platform.openai.com/account/api-keys)
2. Add your key to the `.env.local` file:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

### Step 5: Start the Application

1. Open the project in VS Code
2. Start the application using one of these methods:
   - Press F5 to launch with the debugger
   - Use the Terminal > Run Task... menu and select "Start App"
   - Run `npm run dev` in the terminal

The application will be available at http://localhost:5000 by default

### SSL Support

The application now supports SSL/HTTPS. To use SSL:

1. Place your SSL certificate files in the `ssl` directory:
   - `privatekey.pem` - Your private SSL key
   - `certificate.pem` - Your SSL certificate

2. For development, you can generate self-signed certificates using the provided script:
   ```bash
   cd ssl
   ./generate-dev-certificates.sh
   ```

3. Restart the application after adding certificate files
4. Access the application via https://localhost:5000

## Troubleshooting

### Database Connection Issues

If you encounter database connection problems:

1. Check that the database credentials in `.env.local` are correct
2. Ensure PostgreSQL is running
3. Test the connection using:
   ```
   node test-db.js
   ```

### ChatBot Issues

If the chatbot is not working properly:

1. Verify your OpenAI API key is valid and has sufficient credits
2. Check the browser console for errors
3. Ensure your browser supports the Web Speech API (Chrome recommended)

## Local Development Tips

- The application uses Vite for development, which provides hot module replacement
- Changes to most files should update immediately in the browser
- When modifying server-side code, the server will automatically restart

## Need Further Help?

Refer to the README.md file for additional information about the application's features and how to use them.