# Quick Billing System Test
# Tests the basic billing functionality

Write-Host "=== Quick Billing System Test ===" -ForegroundColor Cyan

# Test 1: Health Check
$health = curl.exe -s "http://localhost:3001/health" | ConvertFrom-Json
if ($health.status -eq "OK") {
    Write-Host "✅ Health Check: PASSED" -ForegroundColor Green
}
else {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    exit 1
}

# Test 2: Register Manager (using form-urlencoded to avoid JSON parsing issues)
$registerResponse = curl.exe -s -X POST "http://localhost:3001/api/auth/register/manager" -H "Content-Type: application/x-www-form-urlencoded" -d "name=Test Manager&email=billing.test.$(Get-Date -Format 'HHmmss')@test.com&phoneNumber=+256700000000&password=Test123456" | ConvertFrom-Json
if ($registerResponse.success) {
    $managerToken = $registerResponse.data.token
    Write-Host "✅ Manager Registration: PASSED" -ForegroundColor Green
}
else {
    Write-Host "❌ Manager Registration: FAILED" -ForegroundColor Red
    exit 1
}

# Test 3: Check Billing Status (should be CURRENT by default)
$billingStatus = curl.exe -s -H "Authorization: Bearer $managerToken" "http://localhost:3001/api/manager/billing/status" | ConvertFrom-Json
if ($billingStatus.success -and $billingStatus.data.billingStatus -eq "CURRENT") {
    Write-Host "✅ Billing Status Check: PASSED (CURRENT)" -ForegroundColor Green
}
else {
    Write-Host "❌ Billing Status Check: FAILED" -ForegroundColor Red
    Write-Host "   Status: $($billingStatus.data.billingStatus)" -ForegroundColor Red
    exit 1
}

# Test 4: Accept Terms (simplified approach)
$termsResponse = curl.exe -s -X POST -H "Authorization: Bearer $managerToken" "http://localhost:3001/api/manager/terms/accept" | ConvertFrom-Json
if ($termsResponse.success) {
    Write-Host "✅ Terms Acceptance: PASSED" -ForegroundColor Green
}
else {
    Write-Host "❌ Terms Acceptance: FAILED" -ForegroundColor Red
    exit 1
}

# Test 5: Check Invoices (should be empty initially)
$invoicesResponse = curl.exe -s -H "Authorization: Bearer $managerToken" "http://localhost:3001/api/manager/billing/invoices" | ConvertFrom-Json
if ($invoicesResponse.success -and $invoicesResponse.data.Count -eq 0) {
    Write-Host "✅ Invoice List: PASSED (empty initially)" -ForegroundColor Green
}
else {
    Write-Host "❌ Invoice List: FAILED" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 ALL BILLING TESTS PASSED!" -ForegroundColor Green
Write-Host "The billing system is working correctly." -ForegroundColor Cyan
