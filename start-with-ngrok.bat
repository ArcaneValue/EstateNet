@echo off
echo Starting EstateNet with ngrok tunnel...
echo.

REM Check if ngrok is installed
ngrok version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: ngrok is not installed
    echo Please install ngrok from https://ngrok.com/download
    pause
    exit /b 1
)

echo Starting ngrok tunnel for port 3001...
start /B ngrok http 3001

REM Wait for ngrok to start
timeout /t 3 >nul

REM Get ngrok URL
for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels ^| findstr "public_url" ^| findstr "https"') do set NGROK_URL=%%i
set NGROK_URL=%NGROK_URL:*https=https%
set NGROK_URL=%NGROK_URL:~0,-1%

echo Ngrok URL: %NGROK_URL%
echo.
echo Updating API configuration...
powershell -Command "(Get-Content src\config\api.ts) -replace 'http://192\.168\.0\.\d+:3001/api', '%NGROK_URL%/api' | Set-Content src\config\api.ts"

echo.
echo Starting Expo...
npx expo start

echo.
echo Stopping ngrok...
taskkill /f /im ngrok.exe >nul 2>&1
