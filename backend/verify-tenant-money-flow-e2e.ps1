# EstateNet Tenant Money Flow E2E Verification Script
# Tests billing period attribution for tenant rent tracking

param(
    [string]$BackendUrl = "http://localhost:3001",
    [switch]$Verbose
)

# Force UTF-8 encoding for PowerShell 5.1 compatibility
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"
$baseUrl = "$BackendUrl/api"

# GUID-based uniqueness helpers
function New-UniqueTag {
    return ([guid]::NewGuid().ToString("N") + "-" + (Get-Random -Minimum 100000 -Maximum 999999))
}

function New-UniqueEmail([string]$prefix) {
    $tag = New-UniqueTag
    return "$prefix-$tag@test.com"
}

function New-UniquePhoneUG {
    $suffix = Get-Random -Minimum 1000000 -Maximum 9999999
    return "070$suffix"
}

# Utility functions
function Write-TestResult {
    param([string]$message, [bool]$success)
    if ($success) {
        Write-Host "[PASS] $message" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $message" -ForegroundColor Red
        exit 1
    }
}

function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description
    )
    
    $uri = "$baseUrl$Endpoint"
    $params = @{
        Uri         = $uri
        Method      = $Method
        Headers     = $Headers
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    if ($Verbose) {
        Write-Host "[API] $Method $uri" -ForegroundColor Cyan
        if ($Body) {
            Write-Host "[BODY] $($params.Body)" -ForegroundColor Gray
        }
    }
    
    try {
        $response = Invoke-RestMethod @params
        if ($Verbose) {
            Write-Host "[RESPONSE] $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        }
        
        # Return structured response
        return @{
            StatusCode   = 200
            Ok           = $true
            Body         = $response
            RawBody      = ($response | ConvertTo-Json -Depth 10)
            ErrorMessage = $null
        }
    }
    catch {
        $statusCode = 0
        $rawBody = ""
        $errorMessage = $_.Exception.Message
        
        # Safely extract status code and response body with null checks
        if ($null -ne $_.Exception -and $null -ne $_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            catch { 
                $statusCode = 0
            }
            
            # Safely read response content
            try {
                if ($null -ne $_.Exception.Response.Content) {
                    $rawBody = $_.Exception.Response.Content.ReadAsStringAsync().Result
                }
                elseif ($null -ne $_.ErrorDetails -and $null -ne $_.ErrorDetails.Message) {
                    $rawBody = $_.ErrorDetails.Message
                }
                else {
                    $rawBody = "No response content available"
                }
            }
            catch { 
                $rawBody = "Could not read response content: $($_.Exception.Message)"
            }
        }
        elseif ($null -ne $_.ErrorDetails -and $null -ne $_.ErrorDetails.Message) {
            $rawBody = $_.ErrorDetails.Message
            # Try to extract status code from error details
            if ($rawBody -match '\((\d{3})\)') {
                $statusCode = [int]$matches[1]
            }
        }
        
        Write-Host "[ERROR] $Description failed with status $statusCode" -ForegroundColor Red
        Write-Host "[ERROR] Message: $errorMessage" -ForegroundColor Red
        if ($rawBody) {
            Write-Host "[ERROR] Response: $rawBody" -ForegroundColor Red
        }
        
        # Return structured error response
        $errorResponse = @{
            StatusCode   = $statusCode
            Ok           = $false
            Body         = $null
            RawBody      = $rawBody
            ErrorMessage = $errorMessage
        }
        
        return $errorResponse
    }
}

function Get-AuthHeaders {
    param([string]$token)
    return @{ "Authorization" = "Bearer $token" }
}

function Get-CurrentBillingPeriod {
    $now = Get-Date
    return $now.ToString("yyyy-MM")
}

# Retry wrapper for registration operations that may conflict
function Invoke-RegistrationWithRetry {
    param(
        [string]$Method,
        [string]$Endpoint,
        [scriptblock]$GenerateBody,
        [string]$Description,
        [int]$MaxAttempts = 5
    )
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $body = & $GenerateBody
        $result = Invoke-ApiCall -Method $Method -Endpoint $Endpoint -Body $body -Description "$Description (attempt $attempt)"
        
        if ($result.Ok) {
            return $result
        }
        
        # Check if it's a 409 conflict that we can retry
        if ($result.StatusCode -eq 409 -and $attempt -lt $MaxAttempts) {
            Write-Host "[RETRY] 409 conflict on attempt $attempt, regenerating credentials..." -ForegroundColor Yellow
            Start-Sleep -Milliseconds (500 * $attempt)  # Progressive backoff
            continue
        }
        
        # For non-409 errors or final attempt, fail immediately
        Write-Host "[CRITICAL] $Description failed after $attempt attempts. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Test data with GUID-based uniqueness
$uniqueTag = New-UniqueTag
$propertyName = "Test Property $uniqueTag"
$unitNumber = "Unit-$uniqueTag"
$rentAmount = 800000

# Get current billing period for testing
$testPeriod = Get-CurrentBillingPeriod
Write-Host "[INFO] Testing with billing period: $testPeriod" -ForegroundColor Yellow

Write-Host "[START] Tenant Money Flow E2E Test" -ForegroundColor Cyan

# Step 1: Create Owner
Write-Host "`n[STEP 1] Creating Owner" -ForegroundColor Yellow

$ownerResult = Invoke-RegistrationWithRetry -Method "POST" -Endpoint "/auth/register-owner" -Description "Owner registration" -GenerateBody {
    return @{
        name        = "Test Owner"
        email       = New-UniqueEmail "e2e-owner"
        password    = "TestPass123!"
        phoneNumber = New-UniquePhoneUG
    }
}

# Note: Owner token not used in current test flow since manager creates property
$ownerId = $ownerResult.Body.data.user.id
Write-TestResult "Owner created successfully" $true

# Step 2: Create Manager
Write-Host "`n[STEP 2] Creating Manager" -ForegroundColor Yellow

$managerResult = Invoke-RegistrationWithRetry -Method "POST" -Endpoint "/auth/register/manager" -Description "Manager registration" -GenerateBody {
    return @{
        name        = "Test Manager"
        email       = New-UniqueEmail "e2e-manager"
        password    = "TestPass123!"
        phoneNumber = New-UniquePhoneUG
    }
}

$managerToken = $managerResult.Body.data.token
$managerId = $managerResult.Body.data.user.id
Write-TestResult "Manager created successfully" $true

# Step 3: Manager accepts terms
Write-Host "`n[STEP 3] Manager accepting terms" -ForegroundColor Yellow
$termsResult = Invoke-ApiCall -Method "POST" -Endpoint "/manager/terms/accept" -Headers (Get-AuthHeaders $managerToken) -Description "Manager terms acceptance"
if (-not $termsResult.Ok) { 
    Write-Host "[CRITICAL] Manager terms acceptance is required for test continuation. Exiting." -ForegroundColor Red
    exit 1 
}
# Update token if terms acceptance returns a new one
if ($null -ne $termsResult.Body -and $null -ne $termsResult.Body.data -and $null -ne $termsResult.Body.data.token) {
    $managerToken = $termsResult.Body.data.token
}
Write-TestResult "Manager terms accepted" $true

# Step 4: Create Property
Write-Host "`n[STEP 4] Creating Property" -ForegroundColor Yellow
$propertyData = @{
    name      = $propertyName
    location  = "Test Location"
    managerId = $managerId
}

$propertyResult = Invoke-ApiCall -Method "POST" -Endpoint "/properties" -Headers (Get-AuthHeaders $managerToken) -Body $propertyData -Description "Property creation"
if (-not $propertyResult.Ok) { 
    Write-Host "[CRITICAL] Property creation is required for test continuation. Exiting." -ForegroundColor Red
    exit 1 
}
$propertyId = $propertyResult.Body.data.id
Write-TestResult "Property created: $propertyName" $true

# Step 5: Create Unit
Write-Host "`n[STEP 5] Creating Unit" -ForegroundColor Yellow
$unitData = @{
    unitNumber = $unitNumber
    rentAmount = $rentAmount
}

$unitResult = Invoke-ApiCall -Method "POST" -Endpoint "/properties/$propertyId/units" -Headers (Get-AuthHeaders $managerToken) -Body $unitData -Description "Unit creation"
if (-not $unitResult.Ok) { 
    Write-Host "[CRITICAL] Unit creation is required for test continuation. Exiting." -ForegroundColor Red
    exit 1 
}
$unitId = $unitResult.Body.data.id
Write-TestResult "Unit created: $unitNumber with rent UGX $rentAmount" $true

# Step 6: Create Tenant
Write-Host "`n[STEP 6] Creating Tenant" -ForegroundColor Yellow

$tenantResult = Invoke-RegistrationWithRetry -Method "POST" -Endpoint "/auth/register-tenant" -Description "Tenant registration" -GenerateBody {
    return @{
        name        = "Test Tenant"
        email       = New-UniqueEmail "e2e-tenant"
        password    = "TestPass123!"
        phoneNumber = New-UniquePhoneUG
    }
}

$tenantToken = $tenantResult.Body.data.token
$tenantId = $tenantResult.Body.data.user.tenantId
Write-TestResult "Tenant created successfully" $true

# Step 7: Create Lease
Write-Host "`n[STEP 7] Creating Lease" -ForegroundColor Yellow
$leaseData = @{
    tenantId   = $tenantId
    propertyId = $propertyId
    unitId     = $unitId
    rentAmount = $rentAmount
    startDate  = "2023-12-01T00:00:00.000Z"
}

$leaseResult = Invoke-ApiCall -Method "POST" -Endpoint "/leases" -Headers (Get-AuthHeaders $managerToken) -Body $leaseData -Description "Lease creation"
if (-not $leaseResult.Ok) { 
    Write-Host "[CRITICAL] Lease creation is required for test continuation. Exiting." -ForegroundColor Red
    exit 1 
}
Write-TestResult "Lease created for tenant" $true

# Step 8: Record Partial Payment for Current Period
Write-Host "`n[STEP 8] Recording partial payment for period $testPeriod" -ForegroundColor Yellow
$partialAmount = 300000
$partialPaymentData = @{
    amount        = $partialAmount
    paymentDate   = (Get-Date).ToString("yyyy-MM-dd")
    dueDate       = "$testPeriod-01"
    billingPeriod = $testPeriod
    paymentMethod = "MOBILE_MONEY"
}

$partialPaymentResult = Invoke-ApiCall -Method "POST" -Endpoint "/payments" -Headers (Get-AuthHeaders $tenantToken) -Body $partialPaymentData -Description "Partial payment creation"
if (-not $partialPaymentResult.Ok) { exit 1 }
Write-TestResult "Partial payment of UGX $partialAmount recorded for $testPeriod" $true

# Step 9: Verify Tenant Rent Status (PARTIAL)
Write-Host "`n[STEP 9] Verifying tenant rent status (should be PARTIAL)" -ForegroundColor Yellow
$rentStatusResult = Invoke-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$testPeriod" -Headers (Get-AuthHeaders $tenantToken) -Description "Tenant rent status check"
if (-not $rentStatusResult.Ok) { exit 1 }
$rentStatus = $rentStatusResult.Body

$expectedRent = $rentStatus.data.expectedRent
$paidForPeriod = $rentStatus.data.paidForPeriod
$outstandingForPeriod = $rentStatus.data.outstandingForPeriod
$status = $rentStatus.data.status

Write-TestResult "Expected rent: UGX $expectedRent" ($expectedRent -eq $rentAmount)
Write-TestResult "Paid for period: UGX $paidForPeriod" ($paidForPeriod -eq $partialAmount)
Write-TestResult "Outstanding for period: UGX $outstandingForPeriod" ($outstandingForPeriod -eq ($rentAmount - $partialAmount))
Write-TestResult "Status is PARTIAL" ($status -eq "PARTIAL")

# Step 10: Record Remaining Payment
Write-Host "`n[STEP 10] Recording remaining payment" -ForegroundColor Yellow
$remainingAmount = $rentAmount - $partialAmount
$remainingPaymentData = @{
    amount        = $remainingAmount
    paymentDate   = (Get-Date).ToString("yyyy-MM-dd")
    dueDate       = "$testPeriod-01"
    billingPeriod = $testPeriod
    paymentMethod = "MOBILE_MONEY"
}

$remainingPaymentResult = Invoke-ApiCall -Method "POST" -Endpoint "/payments" -Headers (Get-AuthHeaders $tenantToken) -Body $remainingPaymentData -Description "Remaining payment creation"
if (-not $remainingPaymentResult.Ok) { exit 1 }
Write-TestResult "Remaining payment of UGX $remainingAmount recorded" $true

# Step 11: Verify Tenant Rent Status (PAID)
Write-Host "`n[STEP 11] Verifying tenant rent status (should be PAID)" -ForegroundColor Yellow
$finalRentStatusResult = Invoke-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$testPeriod" -Headers (Get-AuthHeaders $tenantToken) -Description "Final tenant rent status check"
if (-not $finalRentStatusResult.Ok) { exit 1 }
$finalRentStatus = $finalRentStatusResult.Body

$finalPaid = $finalRentStatus.data.paidForPeriod
$finalOutstanding = $finalRentStatus.data.outstandingForPeriod
$finalStatus = $finalRentStatus.data.status

Write-TestResult "Final paid amount: UGX $finalPaid" ($finalPaid -eq $rentAmount)
Write-TestResult "Final outstanding: UGX $finalOutstanding" ($finalOutstanding -eq 0)
Write-TestResult "Final status is PAID" ($finalStatus -eq "PAID")

# Step 12: Verify Manager Finance Outstanding (should be 0)
Write-Host "`n[STEP 12] Verifying manager finance outstanding" -ForegroundColor Yellow
$managerOutstandingResult = Invoke-ApiCall -Method "GET" -Endpoint "/manager/finance/outstanding-rent?period=$testPeriod" -Headers (Get-AuthHeaders $managerToken) -Description "Manager outstanding rent check"
if (-not $managerOutstandingResult.Ok) { exit 1 }
$managerOutstanding = $managerOutstandingResult.Body

$managerTotalOutstanding = $managerOutstanding.data.totalOutstanding
Write-TestResult "Manager outstanding rent: UGX $managerTotalOutstanding" ($managerTotalOutstanding -eq 0)

# Step 13: Verify Manager Finance Rent Collection
Write-Host "`n[STEP 13] Verifying manager finance rent collection" -ForegroundColor Yellow
$managerCollectionResult = Invoke-ApiCall -Method "GET" -Endpoint "/manager/finance/rent-collection?period=$testPeriod" -Headers (Get-AuthHeaders $managerToken) -Description "Manager rent collection check"
if (-not $managerCollectionResult.Ok) { exit 1 }
$managerCollection = $managerCollectionResult.Body

$managerTotalCollected = $managerCollection.data.totalCollected
Write-TestResult "Manager total collected: UGX $managerTotalCollected" ($managerTotalCollected -eq $rentAmount)

# Step 14: Test Billing Period Attribution (Critical Test)
Write-Host "`n[STEP 14] Testing billing period attribution" -ForegroundColor Yellow

# Create a payment with billingPeriod different from paymentDate
$previousPeriod = "2024-01"
$attributionTestData = @{
    amount        = 100000
    paymentDate   = (Get-Date).ToString("yyyy-MM-dd")  # Current date
    dueDate       = "$previousPeriod-01"
    billingPeriod = $previousPeriod  # Different period
    paymentMethod = "MOBILE_MONEY"
}

$attributionPaymentResult = Invoke-ApiCall -Method "POST" -Endpoint "/payments" -Headers (Get-AuthHeaders $tenantToken) -Body $attributionTestData -Description "Attribution test payment"
if (-not $attributionPaymentResult.Ok) { exit 1 }
Write-TestResult "Attribution test payment created" $true

# Verify it appears in the correct billing period (2024-01), not current period
$previousPeriodStatusResult = Invoke-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$previousPeriod" -Headers (Get-AuthHeaders $tenantToken) -Description "Previous period status check"
if (-not $previousPeriodStatusResult.Ok) { exit 1 }
$previousPeriodStatus = $previousPeriodStatusResult.Body

$previousPeriodPaid = $previousPeriodStatus.data.paidForPeriod
Write-TestResult "Payment attributed to correct period ($previousPeriod): UGX $previousPeriodPaid" ($previousPeriodPaid -eq 100000)

# Verify it does NOT affect current period
$currentPeriodStatusAfterResult = Invoke-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$testPeriod" -Headers (Get-AuthHeaders $tenantToken) -Description "Current period status after attribution test"
if (-not $currentPeriodStatusAfterResult.Ok) { exit 1 }
$currentPeriodStatusAfter = $currentPeriodStatusAfterResult.Body

$currentPeriodPaidAfter = $currentPeriodStatusAfter.data.paidForPeriod
Write-TestResult "Current period unchanged after attribution test: UGX $currentPeriodPaidAfter" ($currentPeriodPaidAfter -eq $rentAmount)

# Final Summary
Write-Host "`n[SUCCESS] All tests passed!" -ForegroundColor Green
Write-Host "[SUMMARY] Test Results:" -ForegroundColor Cyan
Write-Host "  - Billing Period: $testPeriod" -ForegroundColor White
Write-Host "  - Expected Rent: UGX $rentAmount" -ForegroundColor White
Write-Host "  - Total Paid: UGX $finalPaid" -ForegroundColor White
Write-Host "  - Outstanding: UGX $finalOutstanding" -ForegroundColor White
Write-Host "  - Manager/Tenant Data Consistency: [PASS]" -ForegroundColor Green
Write-Host "  - Billing Period Attribution: [PASS]" -ForegroundColor Green

Write-Host "`n[COMPLETE] Tenant Money Flow E2E Test Completed Successfully!" -ForegroundColor Green
exit 0
