@echo off
echo === EstateNet Server Management ===
echo.

echo Step 1: Killing all processes on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo Step 2: Checking for remaining processes...
netstat -aon | find ":3001"
if %errorlevel% neq 0 (
    echo ✅ No processes found on port 3001
) else (
    echo ⚠️  Some processes still exist, trying again...
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do (
        echo Force killing process %%a
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo Step 3: Waiting 2 seconds for cleanup...
timeout /t 2 /nobreak >nul

echo Step 4: Starting backend server...
cd /d "%~dp0backend"
echo Current directory: %CD%
echo.
echo Starting server with: npm run dev
npm run dev

pause
