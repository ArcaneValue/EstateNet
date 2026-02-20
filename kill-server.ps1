# EstateNet Server Management Script
# Kills all processes on port 3001 and starts the server

Write-Host "=== EstateNet Server Management ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Find and kill all processes on port 3001
Write-Host "Step 1: Finding processes on port 3001..." -ForegroundColor Yellow

$processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($process in $processes) {
        $processId = $process.OwningProcess
        if ($processId -ne 0) {
            try {
                $processName = Get-Process -Id $processId -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessName
                Write-Host "Killing process $processId ($processName)" -ForegroundColor Red
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
            catch {
                Write-Host "Failed to kill process $processId" -ForegroundColor Yellow
            }
        }
    }
}
else {
    Write-Host "No processes found on port 3001" -ForegroundColor Green
}

# Step 2: Double-check
Write-Host ""
Write-Host "Step 2: Checking for remaining processes..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$remaining = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "⚠️  Some processes still exist, force killing..." -ForegroundColor Yellow
    foreach ($process in $remaining) {
        $processId = $process.OwningProcess
        if ($processId -ne 0) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "Force killed process $processId" -ForegroundColor Red
            }
            catch {
                Write-Host "Failed to force kill process $processId" -ForegroundColor Red
            }
        }
    }
}
else {
    Write-Host "✅ No processes found on port 3001" -ForegroundColor Green
}

# Step 3: Wait for cleanup
Write-Host ""
Write-Host "Step 3: Waiting for cleanup..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Step 4: Start the server
Write-Host ""
Write-Host "Step 4: Starting backend server..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "backend"
Write-Host "Backend path: $backendPath" -ForegroundColor Gray

if (Test-Path $backendPath) {
    Set-Location $backendPath
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Starting server with: npm run dev" -ForegroundColor Cyan
    Write-Host ""
    
    # Start the server
    npm run dev
}
else {
    Write-Host "❌ Backend directory not found: $backendPath" -ForegroundColor Red
    Write-Host "Please make sure you're running this script from the EstateNet root directory" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Script Complete ===" -ForegroundColor Cyan
Read-Host "Press Enter to exit"
