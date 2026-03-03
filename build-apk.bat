@echo off
echo Building EstateNet Android APK...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Expo CLI is installed
npx expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Expo CLI...
    call npm install -g @expo/cli
)

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Checking current IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4 Address.*10\." ^| findstr /v "Link-local"') do set CURRENT_IP=%%a
if not defined CURRENT_IP for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4 Address.*192\."') do set CURRENT_IP=%%a
if not defined CURRENT_IP for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4 Address.*172\."') do set CURRENT_IP=%%a
set CURRENT_IP=%CURRENT_IP: =%
echo Current IP: %CURRENT_IP%

echo.
echo Updating API configuration to use IP: %CURRENT_IP%
powershell -Command "(Get-Content src\config\api.ts) -replace '192\.168\.0\.\d+', '%CURRENT_IP%' | Set-Content src\config\api.ts"

echo.
echo Make sure your backend is running on http://%CURRENT_IP%:3001
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Starting EAS Build for Android...
echo This will upload your project to Expo's build service.
echo You'll need to sign in to your Expo account.
echo.

npx eas build --platform android
if %errorlevel% neq 0 (
    echo ERROR: Failed to build APK
    echo Make sure you have configured EAS Build first:
    echo 1. Run: npx eas build:configure
    echo 2. Create an account at https://expo.dev
    echo 3. Run: npx expo login
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo You can download the APK from the provided link.
echo.
pause
