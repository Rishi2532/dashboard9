/**
 * Simple Express server for testing the database connection
 */
const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Get current directory
const __dirname = path.resolve();

// Load environment variables from .env.local if it exists, otherwise from .env
const envPath = fs.existsSync(path.join(__dirname, '.env.local')) 
  ? path.join(__dirname, '.env.local') 
  : path.join(__dirname, '.env');

dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json());

// Routes
app.get('/api/test', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    client.release();
    
    res.json({
      message: 'Database connection successful',
      time: result.rows[0].time,
      database: process.env.PGDATABASE,
      host: process.env.PGHOST
    });
  } catch (error) {
    console.error('Database error:', error.message);
    res.status(500).json({ 
      error: 'Database connection failed', 
      message: error.message 
    });
  }
});

app.get('/api/regions', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM regions');
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching regions:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve static content
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Maharashtra Water Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .status { padding: 15px; border-radius: 5px; margin: 20px 0; }
          .success { background-color: #d4edda; color: #155724; }
          .error { background-color: #f8d7da; color: #721c24; }
          pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow: auto; }
          button { padding: 8px 16px; background: #0275d8; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>Maharashtra Water Dashboard - Server Test</h1>
        <p>This is a simple test page to confirm that the server is running and can connect to the database.</p>
        
        <h2>Database Connection Test</h2>
        <div id="dbStatus" class="status">Testing database connection...</div>
        <button onclick="testDatabase()">Test Database Connection</button>
        
        <h2>Region Data Test</h2>
        <div id="regionsStatus" class="status">Click to test fetching regions...</div>
        <button onclick="fetchRegions()">Fetch Regions</button>
        <pre id="regionsData"></pre>

        <script>
          // Test database connection
          function testDatabase() {
            document.getElementById('dbStatus').textContent = 'Testing...';
            document.getElementById('dbStatus').className = 'status';
            
            fetch('/api/test')
              .then(response => response.json())
              .then(data => {
                if (data.message) {
                  document.getElementById('dbStatus').textContent = 
                    'Success: ' + data.message + ' at ' + data.time + 
                    ' (Database: ' + data.database + ')';
                  document.getElementById('dbStatus').className = 'status success';
                } else {
                  document.getElementById('dbStatus').textContent = 'Error: ' + data.error;
                  document.getElementById('dbStatus').className = 'status error';
                }
              })
              .catch(error => {
                document.getElementById('dbStatus').textContent = 'Error: ' + error.message;
                document.getElementById('dbStatus').className = 'status error';
              });
          }
          
          // Fetch regions
          function fetchRegions() {
            document.getElementById('regionsStatus').textContent = 'Fetching...';
            document.getElementById('regionsStatus').className = 'status';
            document.getElementById('regionsData').textContent = '';
            
            fetch('/api/regions')
              .then(response => response.json())
              .then(data => {
                if (data.error) {
                  document.getElementById('regionsStatus').textContent = 'Error: ' + data.error;
                  document.getElementById('regionsStatus').className = 'status error';
                } else {
                  document.getElementById('regionsStatus').textContent = 
                    'Success: Found ' + data.length + ' regions';
                  document.getElementById('regionsStatus').className = 'status success';
                  document.getElementById('regionsData').textContent = JSON.stringify(data, null, 2);
                }
              })
              .catch(error => {
                document.getElementById('regionsStatus').textContent = 'Error: ' + error.message;
                document.getElementById('regionsStatus').className = 'status error';
              });
          }
          
          // Run database test on page load
          window.onload = testDatabase;
        </script>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using database: ${process.env.PGDATABASE} on host: ${process.env.PGHOST}`);
  console.log('Test the API at: http://localhost:' + PORT);
});