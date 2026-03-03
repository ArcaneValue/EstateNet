@echo off
echo Building EstateNet Web Application...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building web version...
call npm run web
if %errorlevel% neq 0 (
    echo ERROR: Failed to build web version
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo The web application is ready at: http://localhost:8081
echo.
pause
