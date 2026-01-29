# Maharashtra Water Dashboard - VS Code Setup Guide

This README provides detailed instructions for setting up and running the Maharashtra Water Dashboard in Visual Studio Code.

## Quick Start Guide

1. Clone this repository to your local machine
2. Run the setup script:
   ```
   node setup-vscode.js
   ```
3. Open the project in VS Code
4. Start the application by pressing F5 or running:
   ```
   npm run dev
   ```
5. Access the application at http://localhost:5000

## What This Application Does

The Maharashtra Water Dashboard provides a comprehensive view of water infrastructure across Maharashtra regions, including:

- Regional scheme summary visualization
- Detailed scheme status reporting
- Flow meter and chlorine analyzer tracking
- Interactive maps of water infrastructure
- AI-powered voice chatbot assistant
- Multi-language support (including Tamil, Telugu, and other Indian languages)

## Files and Directories

The project is organized as follows:

- `/client` - Frontend React application
- `/server` - Backend Express API
- `/shared` - Shared types and utilities
- `/public` - Static assets 
- `/.vscode` - VS Code configuration (created by setup script)

## Voice Chatbot Features

The dashboard includes an AI-powered chatbot with the following capabilities:

- Voice recognition in multiple Indian languages
- Text-to-speech responses for accessibility
- Natural language query processing
- Intelligent filtering based on user requests
- Support for various phrasings of the same question

## Database Configuration

The application uses PostgreSQL. The connection details are stored in the `.env.local` file created by the setup script. If you need to connect to a different database:

1. Update the variables in `.env.local`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   PGHOST=localhost
   PGPORT=5432
   PGUSER=username
   PGPASSWORD=password
   PGDATABASE=database_name
   ```

2. Test the connection using:
   ```
   node test-local-db.js
   ```

## OpenAI API Configuration

The chatbot uses OpenAI for natural language processing. You need to provide an API key in the `.env.local` file:

```
OPENAI_API_KEY=your_api_key_here
```

## Troubleshooting

If you encounter issues:

1. **Application won't start**:
   - Check if Node.js is installed and up to date
   - Verify that all dependencies are installed (`npm install`)
   - Check the console for specific error messages

2. **Database connection errors**:
   - Run `node test-local-db.js` to verify database connectivity
   - Check that PostgreSQL is running
   - Verify the connection details in `.env.local`

3. **Chatbot not working**:
   - Verify your OpenAI API key is valid
   - Check browser console for errors
   - Make sure your browser supports Web Speech API (Chrome recommended)

## Additional Resources

- For more detailed setup instructions, see `VS-CODE-SETUP.md`
- For database troubleshooting, see `test-local-db.js`
- For environment variable configuration, see the `.env.local` file