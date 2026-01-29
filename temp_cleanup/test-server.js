const express = require('express');
const app = express();
const port = 5000;

// Basic route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Server</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #0066cc; }
      </style>
    </head>
    <body>
      <h1>Test Server Running</h1>
      <p>If you can see this page, the basic Express server is working correctly.</p>
    </body>
    </html>
  `);
});

// API test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://localhost:${port}`);
});