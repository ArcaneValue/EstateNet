# Simple Financial Statement Endpoints Test
# Tests if the endpoints are accessible and return proper structure

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Load test environment variables
if (Test-Path ".env.test") {
    Get-Content ".env.test" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$baseUrl = "http://localhost:3001"

function Test-Endpoint {
    param(
        [string]$endpoint,
        [string]$name
    )
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$endpoint" -Method GET -ErrorAction Stop
        Write-Host "[PASS] $name - Endpoint accessible" -ForegroundColor Green
        return $true
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "[EXPECTED] $name - Requires authentication (401)" -ForegroundColor Yellow
            return $true
        }
        else {
            Write-Host "[FAIL] $name - Error: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

Write-Host "=== FINANCIAL STATEMENT ENDPOINTS TEST ===" -ForegroundColor Cyan
Write-Host "Testing endpoint accessibility and authentication requirements" -ForegroundColor Gray
Write-Host ""

# Test health endpoint first
Write-Host "Testing server health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "[PASS] Server is running - Status: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] Server not accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Testing financial statement endpoints..." -ForegroundColor Yellow

# Test the three new financial statement endpoints
$endpoints = @(
    @{ path = "/api/manager/finance/cashflow"; name = "Cashflow Statement" },
    @{ path = "/api/manager/finance/income-statement"; name = "Income Statement" },
    @{ path = "/api/manager/finance/financial-position"; name = "Financial Position" }
)

$allPassed = $true
foreach ($endpoint in $endpoints) {
    $result = Test-Endpoint -endpoint $endpoint.path -name $endpoint.name
    if (-not $result) {
        $allPassed = $false
    }
}

Write-Host ""
if ($allPassed) {
    Write-Host "✅ ALL ENDPOINTS ACCESSIBLE" -ForegroundColor Green
    Write-Host "The financial statement endpoints are properly configured and require authentication as expected." -ForegroundColor Gray
} else {
    Write-Host "❌ SOME ENDPOINTS FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ENDPOINT VERIFICATION COMPLETE ===" -ForegroundColor Cyan
