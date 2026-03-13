# EstateNet Development Startup Script
# This script starts both backend and frontend servers

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 EstateNet Development Environment" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if backend is already running
Write-Host "🔍 Checking if backend is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend is already running on port 3001" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Backend is not running. Starting backend server..." -ForegroundColor Red
    Write-Host ""
    
    # Start backend in a new window
    Write-Host "📦 Starting backend server in new window..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"
    
    # Wait for backend to start
    Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    $backendReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $backendReady) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 1 -ErrorAction Stop
            $backendReady = $true
            Write-Host "✅ Backend is ready!" -ForegroundColor Green
        } catch {
            $attempt++
            Write-Host "." -NoNewline
        }
    }
    
    if (-not $backendReady) {
        Write-Host ""
        Write-Host "⚠️  Backend did not start within 30 seconds." -ForegroundColor Yellow
        Write-Host "   Check the backend window for errors." -ForegroundColor Yellow
        Write-Host ""
    }
    Write-Host ""
}

# Display connection info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📡 Connection Information" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Get machine IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

Write-Host "🌐 Web:     http://localhost:3001/api" -ForegroundColor White
Write-Host "📱 Android: http://${ip}:3001/api" -ForegroundColor White
Write-Host "🍎 iOS:     http://localhost:3001/api" -ForegroundColor White
Write-Host ""
Write-Host "💡 Update DEVELOPMENT_MACHINE_IP in src/config/api.ts if IP changed" -ForegroundColor Yellow
Write-Host "   Current IP: $ip" -ForegroundColor Yellow
Write-Host ""

# Start frontend
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎨 Starting Expo Frontend..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

npm start
