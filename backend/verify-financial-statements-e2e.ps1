# Financial Statements E2E Verification Script
# Tests the three new financial statement endpoints with real data

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Load test environment variables
if (Test-Path ".env.test") {
    Get-Content ".env.test" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    Write-Host "Loaded test environment configuration" -ForegroundColor Green
}
else {
    # Set default test environment variables if .env.test doesn't exist
    $env:JWT_SECRET = "test-secret-key-for-financial-statements-testing"
    $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/estatenet_test"
    $env:NODE_ENV = "test"
    Write-Host "Using default test environment variables" -ForegroundColor Yellow
}

$baseUrl = "http://localhost:3001"
$testResults = @()

function Write-TestResult {
    param(
        [string]$step,
        [string]$status,
        [string]$message = "",
        [object]$data = $null
    )
    
    $result = @{
        Step      = $step
        Status    = $status
        Message   = $message
        Data      = $data
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    
    $script:testResults += $result
    
    $statusSymbol = if ($status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host "$statusSymbol $step" -ForegroundColor $(if ($status -eq "PASS") { "Green" } else { "Red" })
    if ($message) {
        Write-Host "  $message" -ForegroundColor Gray
    }
}

function Invoke-ApiCall {
    param(
        [string]$method,
        [string]$endpoint,
        [object]$body = $null,
        [hashtable]$headers = @{}
    )
    
    try {
        $uri = "$baseUrl$endpoint"
        $params = @{
            Uri         = $uri
            Method      = $method
            Headers     = $headers
            ContentType = "application/json"
        }
        
        if ($body) {
            $params.Body = ($body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{
            Success    = $true
            Data       = $response
            StatusCode = 200
        }
    }
    catch {
        $errorResponse = $null
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errorBody = $reader.ReadToEnd()
                $errorResponse = $errorBody | ConvertFrom-Json
            }
            catch {
                $errorResponse = @{ message = $_.Exception.Message }
            }
        }
        
        return @{
            Success    = $false
            Error      = $_.Exception.Message
            StatusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
            Data       = $errorResponse
        }
    }
}

function Test-FinancialEndpoint {
    param(
        [string]$endpointName,
        [string]$endpoint,
        [string]$token,
        [string]$period = $null,
        [hashtable]$expectedFields
    )
    
    $queryString = ""
    if ($period) {
        $queryString = "?period=$period"
    }
    
    $result = Invoke-ApiCall -method "GET" -endpoint "$endpoint$queryString" -headers @{ Authorization = "Bearer $token" }
    
    if (-not $result.Success) {
        Write-TestResult -step "Test $endpointName endpoint" -status "FAIL" -message "API call failed: $($result.Error)"
        return $false
    }
    
    if (-not $result.Data.success) {
        Write-TestResult -step "Test $endpointName endpoint" -status "FAIL" -message "API returned success=false: $($result.Data.message)"
        return $false
    }
    
    # Check required fields
    $data = $result.Data.data
    foreach ($field in $expectedFields.Keys) {
        if (-not $data.PSObject.Properties[$field]) {
            Write-TestResult -step "Test $endpointName endpoint" -status "FAIL" -message "Missing required field: $field"
            return $false
        }
        
        $expectedType = $expectedFields[$field]
        $actualValue = $data.$field
        
        if ($expectedType -eq "object" -and $actualValue -isnot [PSCustomObject]) {
            Write-TestResult -step "Test $endpointName endpoint" -status "FAIL" -message "Field $field should be object but is $($actualValue.GetType().Name)"
            return $false
        }
        elseif ($expectedType -eq "number" -and $actualValue -isnot [int] -and $actualValue -isnot [double]) {
            Write-TestResult -step "Test $endpointName endpoint" -status "FAIL" -message "Field $field should be number but is $($actualValue.GetType().Name)"
            return $false
        }
        elseif ($expectedType -eq "string" -and $actualValue -isnot [string]) {
            Write-TestResult -step "Test $endpointName endpoint" -status "FAIL" -message "Field $field should be string but is $($actualValue.GetType().Name)"
            return $false
        }
    }
    
    Write-TestResult -step "Test $endpointName endpoint" -status "PASS" -message "All required fields present and valid"
    return $true
}

# Main test execution
Write-Host "=== FINANCIAL STATEMENTS E2E VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Testing financial statement endpoints with real data" -ForegroundColor Gray
Write-Host ""

# Step 1: Register Manager
Write-Host "Step 1: Register Manager" -ForegroundColor Yellow
# Generate truly unique credentials to avoid conflicts
$uniqueId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString() + "-" + (Get-Random -Minimum 10000 -Maximum 99999)
$managerEmail = "e2e-manager-$uniqueId@test.com"
$managerPhone = "+25670" + (Get-Random -Minimum 1000000 -Maximum 9999999)

$managerData = @{
    name        = "Test Manager"
    email       = $managerEmail
    password    = "Password123"
    phoneNumber = $managerPhone
}

$managerResult = Invoke-ApiCall -method "POST" -endpoint "/api/auth/register/manager" -body $managerData

if (-not $managerResult.Success) {
    Write-TestResult -step "Register Manager" -status "FAIL" -message "Failed to register manager: $($managerResult.Error)"
    Write-Host "Manager registration details:" -ForegroundColor Red
    Write-Host "Email: $($managerData.email)" -ForegroundColor Red
    Write-Host "Full result: $($managerResult | ConvertTo-Json -Depth 3)" -ForegroundColor Red
    exit 1
}

if (-not $managerResult.Data.success) {
    Write-TestResult -step "Register Manager" -status "FAIL" -message "Manager registration failed: $($managerResult.Data.message)"
    exit 1
}

$managerToken = $managerResult.Data.data.token
if (-not $managerToken) {
    Write-TestResult -step "Register Manager" -status "FAIL" -message "No token returned from manager registration"
    Write-Host "Full manager result: $($managerResult | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
Write-TestResult -step "Register Manager" -status "PASS" -message "Manager registered successfully"

# Step 2: Accept Manager Terms
Write-Host "Step 2: Accept Manager Terms" -ForegroundColor Yellow
$termsResult = Invoke-ApiCall -method "POST" -endpoint "/api/manager/terms/accept" -headers @{ Authorization = "Bearer $managerToken" }

if (-not $termsResult.Success -or -not $termsResult.Data.success) {
    $errorMsg = if ($termsResult.Data.message) { $termsResult.Data.message } else { $termsResult.Error }
    Write-TestResult -step "Accept Manager Terms" -status "FAIL" -message "Failed to accept terms: $errorMsg"
    Write-Host "Full terms result: $($termsResult | ConvertTo-Json -Depth 3)" -ForegroundColor Red
    exit 1
}

# Update token with the new one returned after terms acceptance
if ($termsResult.Data.data.token) {
    $managerToken = $termsResult.Data.data.token
}

Write-TestResult -step "Accept Manager Terms" -status "PASS"

# Step 3: Create Property
Write-Host "Step 3: Create Property" -ForegroundColor Yellow
$propertyData = @{
    name     = "Test Property for Financial Statements"
    location = "Kampala, Uganda"
}

$propertyResult = Invoke-ApiCall -method "POST" -endpoint "/api/properties" -body $propertyData -headers @{ Authorization = "Bearer $managerToken" }

if (-not $propertyResult.Success -or -not $propertyResult.Data.success) {
    Write-TestResult -step "Create Property" -status "FAIL" -message "Failed to create property"
    exit 1
}

$propertyId = $propertyResult.Data.data.id
Write-TestResult -step "Create Property" -status "PASS" -message "Property ID: $propertyId"

# Step 4: Create Unit
Write-Host "Step 4: Create Unit" -ForegroundColor Yellow
$unitData = @{
    unitNumber = "A101"
    rentAmount = 800000
}

$unitResult = Invoke-ApiCall -method "POST" -endpoint "/api/properties/$propertyId/units" -body $unitData -headers @{ Authorization = "Bearer $managerToken" }

if (-not $unitResult.Success -or -not $unitResult.Data.success) {
    Write-TestResult -step "Create Unit" -status "FAIL" -message "Failed to create unit"
    exit 1
}

$unitId = $unitResult.Data.data.id
Write-TestResult -step "Create Unit" -status "PASS" -message "Unit ID: $unitId"

# Step 5: Register Tenant
Write-Host "Step 5: Register Tenant" -ForegroundColor Yellow
# Generate unique tenant credentials
$tenantEmail = "e2e-tenant-$uniqueId@test.com"
$tenantPhone = "+25670" + (Get-Random -Minimum 1000000 -Maximum 9999999)

$tenantData = @{
    name        = "Test Tenant"
    email       = $tenantEmail
    password    = "Password123"
    phoneNumber = $tenantPhone
}

$tenantResult = Invoke-ApiCall -method "POST" -endpoint "/api/auth/register-tenant" -body $tenantData

if (-not $tenantResult.Success -or -not $tenantResult.Data.success) {
    Write-TestResult -step "Register Tenant" -status "FAIL" -message "Failed to register tenant"
    exit 1
}

$tenantToken = $tenantResult.Data.data.token
$tenantId = $tenantResult.Data.data.user.tenantId
if (-not $tenantToken -or -not $tenantId) {
    Write-TestResult -step "Register Tenant" -status "FAIL" -message "Tenant registration response missing token or tenantId"
    Write-Host "Full tenant result: $($tenantResult | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
Write-TestResult -step "Register Tenant" -status "PASS" -message "Tenant ID: $tenantId"

# Step 6: Create Lease
Write-Host "Step 6: Create Lease" -ForegroundColor Yellow
$leaseData = @{
    tenantId   = $tenantId
    propertyId = $propertyId
    unitId     = $unitId
    rentAmount = 800000
    startDate  = "2023-12-01T00:00:00.000Z"
}

$leaseResult = Invoke-ApiCall -method "POST" -endpoint "/api/leases" -body $leaseData -headers @{ Authorization = "Bearer $managerToken" }

if (-not $leaseResult.Success -or -not $leaseResult.Data.success) {
    Write-TestResult -step "Create Lease" -status "FAIL" -message "Failed to create lease"
    exit 1
}

$leaseId = $leaseResult.Data.data.id
Write-TestResult -step "Create Lease" -status "PASS" -message "Lease ID: $leaseId"

# Step 7: Record Test Payments
Write-Host "Step 7: Record Test Payments" -ForegroundColor Yellow

# Payment 1: January 2024 - Full payment
$payment1Data = @{
    tenantId      = $tenantId
    propertyId    = $propertyId
    unitId        = $unitId
    amount        = 800000
    billingPeriod = "2024-01"
    paymentDate   = "2024-01-15T10:00:00.000Z"
    dueDate       = "2024-01-01"
    status        = "PAID"
}

$payment1Result = Invoke-ApiCall -method "POST" -endpoint "/api/payments" -body $payment1Data -headers @{ Authorization = "Bearer $tenantToken" }

if (-not $payment1Result.Success -or -not $payment1Result.Data.success) {
    Write-TestResult -step "Record Payment 1" -status "FAIL" -message "Failed to record payment 1"
    exit 1
}

# Payment 2: February 2024 - Partial payment
$payment2Data = @{
    tenantId      = $tenantId
    propertyId    = $propertyId
    unitId        = $unitId
    amount        = 400000
    billingPeriod = "2024-02"
    paymentDate   = "2024-02-10T10:00:00.000Z"
    dueDate       = "2024-02-01"
    status        = "PAID"
}

$payment2Result = Invoke-ApiCall -method "POST" -endpoint "/api/payments" -body $payment2Data -headers @{ Authorization = "Bearer $tenantToken" }

if (-not $payment2Result.Success -or -not $payment2Result.Data.success) {
    Write-TestResult -step "Record Payment 2" -status "FAIL" -message "Failed to record payment 2"
    exit 1
}

# Payment 3: February 2024 - Completing payment
$payment3Data = @{
    tenantId      = $tenantId
    propertyId    = $propertyId
    unitId        = $unitId
    amount        = 400000
    billingPeriod = "2024-02"
    paymentDate   = "2024-02-20T10:00:00.000Z"
    dueDate       = "2024-02-01"
    status        = "PAID"
}

$payment3Result = Invoke-ApiCall -method "POST" -endpoint "/api/payments" -body $payment3Data -headers @{ Authorization = "Bearer $tenantToken" }

if (-not $payment3Result.Success -or -not $payment3Result.Data.success) {
    Write-TestResult -step "Record Payment 3" -status "FAIL" -message "Failed to record payment 3"
    exit 1
}

Write-TestResult -step "Record Test Payments" -status "PASS" -message "3 test payments recorded successfully"

# Step 8: Test Cashflow Statement Endpoint
Write-Host "Step 8: Test Cashflow Statement Endpoint" -ForegroundColor Yellow

$cashflowFields = @{
    "period"              = "string"
    "operatingActivities" = "object"
    "investingActivities" = "object"
    "financingActivities" = "object"
    "netCashflow"         = "number"
    "disclaimer"          = "string"
}

$cashflowSuccess = Test-FinancialEndpoint -endpointName "Cashflow Statement" -endpoint "/api/manager/finance/cashflow" -token $managerToken -expectedFields $cashflowFields

if (-not $cashflowSuccess) {
    exit 1
}

# Test with specific period
$cashflowPeriodSuccess = Test-FinancialEndpoint -endpointName "Cashflow Statement (2024-02)" -endpoint "/api/manager/finance/cashflow" -token $managerToken -period "2024-02" -expectedFields $cashflowFields

if (-not $cashflowPeriodSuccess) {
    exit 1
}

# Step 9: Test Income Statement Endpoint
Write-Host "Step 9: Test Income Statement Endpoint" -ForegroundColor Yellow

$incomeFields = @{
    "period"     = "string"
    "revenue"    = "object"
    "expenses"   = "object"
    "netIncome"  = "number"
    "disclaimer" = "string"
}

$incomeSuccess = Test-FinancialEndpoint -endpointName "Income Statement" -endpoint "/api/manager/finance/income-statement" -token $managerToken -expectedFields $incomeFields

if (-not $incomeSuccess) {
    exit 1
}

# Test with specific period
$incomePeriodSuccess = Test-FinancialEndpoint -endpointName "Income Statement (2024-01)" -endpoint "/api/manager/finance/income-statement" -token $managerToken -period "2024-01" -expectedFields $incomeFields

if (-not $incomePeriodSuccess) {
    exit 1
}

# Step 10: Test Financial Position Endpoint
Write-Host "Step 10: Test Financial Position Endpoint" -ForegroundColor Yellow

$positionFields = @{
    "period"      = "string"
    "assets"      = "object"
    "liabilities" = "object"
    "equity"      = "object"
    "disclaimer"  = "string"
}

$positionSuccess = Test-FinancialEndpoint -endpointName "Financial Position" -endpoint "/api/manager/finance/financial-position" -token $managerToken -expectedFields $positionFields

if (-not $positionSuccess) {
    exit 1
}

# Test with specific period
$positionPeriodSuccess = Test-FinancialEndpoint -endpointName "Financial Position (2024-02)" -endpoint "/api/manager/finance/financial-position" -token $managerToken -period "2024-02" -expectedFields $positionFields

if (-not $positionPeriodSuccess) {
    exit 1
}

# Step 11: Test Data Consistency
Write-Host "Step 11: Test Data Consistency" -ForegroundColor Yellow

$period = "2024-02"

# Get all three statements for the same period
$cashflowResult = Invoke-ApiCall -method "GET" -endpoint "/api/manager/finance/cashflow?period=$period" -headers @{ Authorization = "Bearer $managerToken" }
$incomeResult = Invoke-ApiCall -method "GET" -endpoint "/api/manager/finance/income-statement?period=$period" -headers @{ Authorization = "Bearer $managerToken" }
$positionResult = Invoke-ApiCall -method "GET" -endpoint "/api/manager/finance/financial-position?period=$period" -headers @{ Authorization = "Bearer $managerToken" }

if (-not $cashflowResult.Success -or -not $incomeResult.Success -or -not $positionResult.Success) {
    Write-TestResult -step "Data Consistency Check" -status "FAIL" -message "Failed to fetch all financial statements"
    exit 1
}

$cashflowData = $cashflowResult.Data.data
$incomeData = $incomeResult.Data.data
$positionData = $positionResult.Data.data

# Check consistency: Rent collected should equal rent income
$rentCollected = $cashflowData.operatingActivities.inflows.rentCollected
$rentIncome = $incomeData.revenue.rentIncome

if ($rentCollected -ne $rentIncome) {
    Write-TestResult -step "Data Consistency Check" -status "FAIL" -message "Rent collected ($rentCollected) != Rent income ($rentIncome)"
    exit 1
}

# Check: Cash received should equal rent collected
$cashReceived = $positionData.assets.current.cashReceivedInPeriod

if ($cashReceived -ne $rentCollected) {
    Write-TestResult -step "Data Consistency Check" -status "FAIL" -message "Cash received ($cashReceived) != Rent collected ($rentCollected)"
    exit 1
}

# Check: Net income should equal net cashflow (no expenses tracked)
$netIncome = $incomeData.netIncome
$netCashflow = $cashflowData.netCashflow

if ($netIncome -ne $netCashflow) {
    Write-TestResult -step "Data Consistency Check" -status "FAIL" -message "Net income ($netIncome) != Net cashflow ($netCashflow)"
    exit 1
}

# Check: Balance sheet should balance
$totalAssets = $positionData.assets.totalAssets
$totalLiabilities = $positionData.liabilities.totalLiabilities
$totalEquity = $positionData.equity.totalEquity

if ($totalAssets -ne ($totalLiabilities + $totalEquity)) {
    Write-TestResult -step "Data Consistency Check" -status "FAIL" -message "Balance sheet doesn't balance: Assets ($totalAssets) != Liabilities + Equity ($($totalLiabilities + $totalEquity))"
    exit 1
}

Write-TestResult -step "Data Consistency Check" -status "PASS" -message "All financial statements are consistent"

# Step 12: Verify Expected Values
Write-Host "Step 12: Verify Expected Values" -ForegroundColor Yellow

# For period 2024-02, we should have 800K total payments (400K + 400K)
if ($rentCollected -ne 800000) {
    Write-TestResult -step "Expected Values Check" -status "FAIL" -message "Expected 800K rent collected for 2024-02, got $rentCollected"
    exit 1
}

# Outstanding rent for 2024-02 should be 0 (fully paid)
$outstandingResult = Invoke-ApiCall -method "GET" -endpoint "/api/manager/finance/outstanding-rent?period=$period" -headers @{ Authorization = "Bearer $managerToken" }

if ($outstandingResult.Success -and $outstandingResult.Data.success) {
    $totalOutstanding = $outstandingResult.Data.data.totalOutstanding
    if ($totalOutstanding -ne 0) {
        Write-TestResult -step "Expected Values Check" -status "FAIL" -message "Expected 0 outstanding for 2024-02, got $totalOutstanding"
        exit 1
    }
}

Write-TestResult -step "Expected Values Check" -status "PASS" -message "All expected values are correct"

# Final Summary
Write-Host ""
Write-Host "=== TEST SUMMARY ===" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "ALL FINANCIAL STATEMENT TESTS PASSED!" -ForegroundColor Green
    Write-Host "The three financial statement endpoints are working correctly with consistent data." -ForegroundColor Gray
    
    # Cleanup: Show which test accounts were created
    Write-Host "`n[CLEANUP] Test accounts created with unique emails:" -ForegroundColor Yellow
    Write-Host "  Manager: $managerEmail" -ForegroundColor Gray
    Write-Host "  Tenant: $tenantEmail" -ForegroundColor Gray
    Write-Host "  (These won't conflict with future test runs)" -ForegroundColor Gray
    
    exit 0
}
else {
    Write-Host ""
    Write-Host "SOME TESTS FAILED!" -ForegroundColor Red
    Write-Host "Please review the failed tests above." -ForegroundColor Gray
    exit 1
}
