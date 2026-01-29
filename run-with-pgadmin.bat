@echo off
echo ===================================================
echo   Maharashtra Water Dashboard - pgAdmin Edition
echo ===================================================
echo.
echo This script will start the Maharashtra Water Dashboard application
echo configured to use your pgAdmin database:
echo.
echo   Database Name: water_scheme_dashboard
echo   Username: postgres
echo   Password: Salunke@123
echo   Host: localhost
echo   Port: 5432
echo.
echo Steps:
echo 1. Installing dependencies (if needed)
echo 2. Configuring environment for pgAdmin
echo 3. Starting the application server
echo.
echo The dashboard will be available at: http://localhost:5000
echo Login with: admin / admin123
echo.
echo Press Ctrl+C to stop the server when done.
echo.
echo ===================================================
echo.

:: Copy pgAdmin configuration
echo Setting up pgAdmin configuration...
copy .env.pgadmin .env.vscode

:: Check for Perplexity API key
findstr /C:"PERPLEXITY_API_KEY=pplx" .env.pgadmin >nul
if %errorlevel% equ 0 (
  echo.
  echo IMPORTANT: Perplexity API Key not set
  echo.
  echo To use the AI chatbot feature, you need to set your Perplexity API key
  echo in the .env.pgadmin file. The dashboard will still work without it,
  echo but the chatbot feature won't be available.
  echo.
  set /p confirm=Press Enter to continue...
  echo.
)

:: Install dependencies
echo Installing dependencies...
call npm install

:: Start the application
echo.
echo Starting Maharashtra Water Dashboard with pgAdmin...
echo.
call npm run dev

:: This part will only execute if the application crashes or is closed
echo.
echo Application stopped.
echo Press any key to exit...
pause > nul