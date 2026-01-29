#!/bin/bash

echo "==================================================="
echo "     Maharashtra Water Dashboard Startup Script"
echo "==================================================="
echo ""
echo "This script will start the Maharashtra Water Dashboard application."
echo ""
echo "Steps:"
echo "1. Installing dependencies (if needed)"
echo "2. Starting the application server"
echo ""
echo "The dashboard will be available at: http://localhost:5000"
echo "Login with: admin / admin123"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""
echo "==================================================="
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the application
echo ""
echo "Starting Maharashtra Water Dashboard..."
echo ""
npm run dev

# This part will only execute if the application crashes or is closed
echo ""
echo "Application stopped."