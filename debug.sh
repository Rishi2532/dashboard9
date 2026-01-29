#!/bin/bash
# Debug script for Water Scheme Dashboard

# Set environment variables
export DATABASE_URL=postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=Salunke@123
export PGDATABASE=water_scheme_dashboard
export NODE_ENV=development

echo "=== Water Scheme Dashboard Debug ==="
echo
echo "1. Testing database connection..."
node test-db.js
echo
echo "2. Checking for port conflicts..."
npx kill-port 5000
echo
echo "3. Starting test server..."
node test-server.js