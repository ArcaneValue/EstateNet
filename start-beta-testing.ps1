# EstateNet Beta Testing Startup Script
# This script starts everything you need for beta testing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EstateNet Beta Testing Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "ERROR: ngrok not found!" -ForegroundColor Red
    Write-Host "Please install ngrok:" -ForegroundColor Yellow
    Write-Host "1. Download from https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extract to C:\ngrok\" -ForegroundColor White
    Write-Host "3. Add to PATH or run: npm install -g ngrok" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ ngrok found" -ForegroundColor Green

# Check if backend exists
if (-not (Test-Path ".\backend")) {
    Write-Host "ERROR: backend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the EstateNet root folder" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Backend folder found" -ForegroundColor Green
Write-Host ""

# Start PostgreSQL Docker container
Write-Host "Starting PostgreSQL database..." -ForegroundColor Yellow
docker start estatenet-postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database started" -ForegroundColor Green
} else {
    Write-Host "⚠ Database may already be running or not found" -ForegroundColor Yellow
    Write-Host "  If you see connection errors, run: docker ps" -ForegroundColor White
}
Write-Host ""

# Start backend in new window
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Starting EstateNet Backend...' -ForegroundColor Cyan; npm run dev"
Write-Host "✓ Backend starting in new window" -ForegroundColor Green
Write-Host ""

# Wait for backend to start
Write-Host "Waiting for backend to initialize (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start ngrok tunnel
Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Copy the ngrok URL from the output below!" -ForegroundColor Yellow
Write-Host "It will look like: https://abc123.ngrok-free.app" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then update src/config/api.ts:" -ForegroundColor Yellow
Write-Host "1. Change NGROK_URL to your ngrok URL" -ForegroundColor White
Write-Host "2. Change CURRENT_ENV to 'beta'" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop ngrok when done testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start ngrok (this will block until Ctrl+C)
ngrok http 3001

# Cleanup message (only shows after Ctrl+C)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Beta testing session ended" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Remember to:" -ForegroundColor Yellow
Write-Host "1. Stop the backend server (close the PowerShell window)" -ForegroundColor White
Write-Host "2. Change CURRENT_ENV back to 'dev' in src/config/api.ts" -ForegroundColor White
Write-Host "3. Optionally stop database: docker stop estatenet-postgres" -ForegroundColor White
Write-Host ""
