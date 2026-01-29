@echo off
echo Setting up VS Code environment for pgAdmin connection...

REM Create .env.vscode file with pgAdmin connection details
echo # Database configuration for VS Code (pgAdmin) > .env.vscode
echo DATABASE_URL=postgres://postgres:Salunke@123@localhost:5432/water_scheme_dashboard >> .env.vscode
echo PGPORT=5432 >> .env.vscode
echo PGUSER=postgres >> .env.vscode
echo PGPASSWORD=Salunke@123 >> .env.vscode
echo PGDATABASE=water_scheme_dashboard >> .env.vscode
echo PGHOST=localhost >> .env.vscode
echo. >> .env.vscode
echo # Port settings >> .env.vscode
echo PORT=5000 >> .env.vscode
echo. >> .env.vscode
echo # Node settings >> .env.vscode
echo NODE_ENV=development >> .env.vscode

echo ✅ Created .env.vscode file with pgAdmin connection details

REM Create the .vscode directory if it doesn't exist
if not exist .vscode mkdir .vscode

REM Create VS Code launch configuration
echo { > .vscode\launch.json
echo   "version": "0.2.0", >> .vscode\launch.json
echo   "configurations": [ >> .vscode\launch.json
echo     { >> .vscode\launch.json
echo       "type": "node", >> .vscode\launch.json
echo       "request": "launch", >> .vscode\launch.json
echo       "name": "Launch Server", >> .vscode\launch.json
echo       "runtimeExecutable": "npm", >> .vscode\launch.json
echo       "runtimeArgs": ["run", "dev"], >> .vscode\launch.json
echo       "envFile": "${workspaceFolder}/.env.vscode", >> .vscode\launch.json
echo       "console": "integratedTerminal" >> .vscode\launch.json
echo     } >> .vscode\launch.json
echo   ] >> .vscode\launch.json
echo } >> .vscode\launch.json

echo ✅ Created VS Code launch configuration

echo.
echo ✅ VS Code setup complete!
echo To start the application, open VS Code and press F5 or run "npm run dev"
echo.
echo Press any key to exit...
pause > nul