#!/bin/bash

# Setup environment script for local development
# This script helps set up environment variables needed for local development

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Ensure dotenv is installed
npm list -g dotenv || npm install -g dotenv

# Run the vscode setup script
echo "🔧 Setting up VS Code environment..."
node setup-vscode.js

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ Environment file .env.local created successfully."
else
    echo "❌ Failed to create .env.local file."
    exit 1
fi

# Check if OpenAI API key is set
if grep -q "OPENAI_API_KEY=" .env.local && ! grep -q "OPENAI_API_KEY=$" .env.local; then
    echo "✅ OpenAI API key found in .env.local"
else
    echo "⚠️ OpenAI API key not found in .env.local"
    echo "  The chatbot functionality requires an OpenAI API key."
    echo "  Please edit .env.local and add your OpenAI API key."
fi

# Check database connection
echo "🔍 Testing database connection..."
node test-local-db.js

echo ""
echo "✅ Setup completed! You can now open this project in VS Code."
echo "To start the application, run: npm run dev"