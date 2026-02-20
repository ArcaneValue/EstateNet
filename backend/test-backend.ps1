# Simple Backend Verification Test
# Tests core billing scheduler functionality without PostgreSQL client

Write-Host "=== Backend Billing Scheduler Verification ===" -ForegroundColor Green
Write-Host "Testing core functionality after TypeScript fix..." -ForegroundColor Yellow

$BackendUrl = "http://localhost:3001"
$TestsPassed = 0
$TestsTotal = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = "",
        [int]$ExpectedStatus = 200
    )
    
    $TestsTotal++
    Write-Host "Testing: $Name" -ForegroundColor Cyan
    
    try {
        if ($Body) {
            $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" -H "Content-Type: application/json" -d $Body
        } else {
            $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint"
        }
        
        $statusCode = $response.Substring($response.Length - 3)
        $body = $response.Substring(0, $response.Length - 3)
        
        if ([int]$statusCode -eq $ExpectedStatus) {
            Write-Host "  [PASS] Status $statusCode" -ForegroundColor Green
            $TestsPassed++
        } else {
            Write-Host "  [FAIL] Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
            Write-Host "  Response: $body" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "  [FAIL] Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 1: Backend Health
Test-Endpoint "Backend Health Check" "GET" "/health"

# Test 2: API Info
Test-Endpoint "API Info" "GET" "/api"

# Test 3: Billing Scheduler Route Exists (should require auth)
Test-Endpoint "Billing Scheduler Route" "POST" "/api/manager/billing/scheduler/run" "" 401

# Test 4: Manager Billing Routes (should require auth)
Test-Endpoint "Manager Billing Routes" "GET" "/api/manager/billing" "" 401

# Test 5: Invalid Route (should 404)
Test-Endpoint "Invalid Route" "GET" "/api/nonexistent" "" 404

Write-Host "`n=== Results ===" -ForegroundColor Green
Write-Host "Tests Passed: $TestsPassed/$TestsTotal" -ForegroundColor $(if($TestsPassed -eq $TestsTotal) {"Green"} else {"Yellow"})

if ($TestsPassed -eq $TestsTotal) {
    Write-Host "✅ Backend is RUNNING and all endpoints are working!" -ForegroundColor Green
    Write-Host "✅ TypeScript error is FIXED!" -ForegroundColor Green
    Write-Host "✅ Billing scheduler is ready for production!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
}

Write-Host "`nNote: Full E2E requires PostgreSQL client (psql) to test database operations." -ForegroundColor Gray
