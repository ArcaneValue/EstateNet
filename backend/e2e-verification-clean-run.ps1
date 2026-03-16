# EstateNet E2E Verification Script - Clean Run with Fresh Data
# Creates new property/unit/lease to avoid duplicate claim conflicts

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EstateNet E2E Verification - Clean Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

function Test-Step {
    param(
        [string]$StepNumber,
        [string]$Description,
        [scriptblock]$TestBlock
    )
    
    Write-Host ""
    Write-Host "[$StepNumber] $Description" -ForegroundColor Yellow
    try {
        $result = & $TestBlock
        if ($result.Success) {
            Write-Host "PASS" -ForegroundColor Green
            $script:results += @{
                Step        = $StepNumber
                Description = $Description
                Status      = "PASS"
                Details     = $result.Details
            }
        }
        else {
            Write-Host "FAIL: $($result.Error)" -ForegroundColor Red
            $script:results += @{
                Step        = $StepNumber
                Description = $Description
                Status      = "FAIL"
                Error       = $result.Error
                Details     = $result.Details
            }
        }
        return $result
    }
    catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $script:results += @{
            Step        = $StepNumber
            Description = $Description
            Status      = "FAIL"
            Error       = $_.Exception.Message
        }
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# ============================================================================
# AUTHENTICATION & SETUP
# ============================================================================

Write-Host "=== AUTHENTICATION ===" -ForegroundColor Cyan

# Owner Login
$ownerResult = Test-Step "AUTH-1" "Owner Sign In" {
    $body = @{ email = 'kazoora@gmail.com'; password = 'Ak47grave' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType 'application/json'
    
    if ($response.success -and $response.data.user.role -eq 'OWNER') {
        $script:ownerToken = $response.data.token
        $script:ownerId = $response.data.user.id
        return @{ Success = $true; Details = "Owner ID: $($script:ownerId)" }
    } else {
        return @{ Success = $false; Error = "Login failed or wrong role" }
    }
}

# Manager Login
$managerResult = Test-Step "AUTH-2" "Manager Sign In" {
    $body = @{ email = 'mark@gmail.com'; password = 'Ak47grave' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType 'application/json'
    
    if ($response.success -and $response.data.user.role -eq 'MANAGER') {
        $script:managerToken = $response.data.token
        $script:managerId = $response.data.user.id
        return @{ Success = $true; Details = "Manager ID: $($script:managerId)" }
    } else {
        return @{ Success = $false; Error = "Login failed or wrong role" }
    }
}

# Tenant Login
$tenantResult = Test-Step "AUTH-3" "Tenant Sign In" {
    $body = @{ email = 'innocent@gmail.com'; password = 'Ak47grave' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType 'application/json'
    
    if ($response.success -and $response.data.user.role -eq 'TENANT') {
        $script:tenantToken = $response.data.token
        $script:tenantId = $response.data.user.tenantId
        return @{ Success = $true; Details = "Tenant ID: $($script:tenantId)" }
    } else {
        return @{ Success = $false; Error = "Login failed or wrong role" }
    }
}

if (-not ($ownerResult.Success -and $managerResult.Success -and $tenantResult.Success)) {
    Write-Host ""
    Write-Host "CRITICAL: Authentication failed. Cannot continue." -ForegroundColor Red
    exit 1
}

# ============================================================================
# MANAGER: CREATE FRESH TEST DATA
# ============================================================================

Write-Host ""
Write-Host "=== MANAGER: CREATE TEST DATA ===" -ForegroundColor Cyan

# Create Property
$propertyResult = Test-Step "DATA-1" "Manager Creates Property" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $body = @{ 
        name = "E2E Clean Test Property $timestamp"
        location = 'Kampala, Uganda'
    } | ConvertTo-Json
    
    $property = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($property.success) {
        $script:propertyId = $property.data.id
        return @{ Success = $true; Details = "Property ID: $($script:propertyId)" }
    } else {
        return @{ Success = $false; Error = "Property creation failed" }
    }
}

# Create Unit
$unitResult = Test-Step "DATA-2" "Manager Creates Unit" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = @{ unitNumber = 'TEST-01'; rentAmount = 1000000 } | ConvertTo-Json
    
    $unit = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($script:propertyId)/units" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($unit.success) {
        $script:unitId = $unit.data.id
        return @{ Success = $true; Details = "Unit ID: $($script:unitId), Rent: 1000000" }
    } else {
        return @{ Success = $false; Error = "Unit creation failed" }
    }
}

# Create Lease
$leaseResult = Test-Step "DATA-3" "Manager Creates Lease" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = @{ 
        tenantId = $script:tenantId
        propertyId = $script:propertyId
        unitId = $script:unitId
        rentAmount = 1000000
        startDate = (Get-Date).ToString('yyyy-MM-dd')
        status = 'ACTIVE'
    } | ConvertTo-Json
    
    $lease = Invoke-RestMethod -Uri "$baseUrl/api/leases" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($lease.success) {
        $script:leaseId = $lease.data.id
        return @{ Success = $true; Details = "Lease ID: $($script:leaseId)" }
    } else {
        return @{ Success = $false; Error = "Lease creation failed: $($lease.message)" }
    }
}

# ============================================================================
# FINANCIAL BASELINE
# ============================================================================

Write-Host ""
Write-Host "=== FINANCIAL BASELINE ===" -ForegroundColor Cyan

Test-Step "FIN-1" "Manager Finance Baseline" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $period = (Get-Date).ToString('yyyy-MM')
    
    $rentCollection = Invoke-RestMethod -Uri "$baseUrl/api/manager/finance/rent-collection?period=$period" -Headers $headers
    $outstanding = Invoke-RestMethod -Uri "$baseUrl/api/manager/finance/outstanding-rent?period=$period" -Headers $headers
    
    $script:baselineCollected = $rentCollection.data.totalCollected
    $script:baselineOutstanding = $outstanding.data.totalOutstanding
    
    return @{
        Success = $true
        Details = "Baseline - Collected: $($script:baselineCollected), Outstanding: $($script:baselineOutstanding)"
    }
}

# ============================================================================
# TENANT: SUBMIT PAYMENT CLAIM
# ============================================================================

Write-Host ""
Write-Host "=== TENANT: PAYMENT CLAIM SUBMISSION ===" -ForegroundColor Cyan

$claimResult = Test-Step "CLAIM-1" "Tenant Submits Payment Claim" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    $body = @{ 
        leaseId = $script:leaseId
        amount = 1000000
        claimedPaidAt = '2026-03-15T08:00:00.000Z'
        method = 'BANK_TRANSFER'
        referenceText = "E2E-CLEAN-$timestamp"
    } | ConvertTo-Json
    
    $claim = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($claim.success) {
        $script:claimId = $claim.data.id
        return @{ Success = $true; Details = "Claim ID: $($script:claimId), Status: $($claim.data.status)" }
    } else {
        return @{ Success = $false; Error = "Claim submission failed: $($claim.message)" }
    }
}

Test-Step "CLAIM-2" "Tenant Views Claim in History" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    $claims = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Headers $headers
    
    $foundClaim = $claims.data | Where-Object { $_.id -eq $script:claimId }
    
    if ($foundClaim -and $foundClaim.status -eq 'PENDING') {
        return @{ Success = $true; Details = "Claim found with status PENDING" }
    } else {
        return @{ Success = $false; Error = "Claim not found or wrong status" }
    }
}

# ============================================================================
# MANAGER: VERIFY PAYMENT CLAIM
# ============================================================================

Write-Host ""
Write-Host "=== MANAGER: PAYMENT VERIFICATION ===" -ForegroundColor Cyan

Test-Step "VERIFY-1" "Manager Views Pending Claim" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $managerClaims = Invoke-RestMethod -Uri "$baseUrl/api/manager/payment-claims" -Headers $headers
    
    $foundClaim = $managerClaims.data | Where-Object { $_.id -eq $script:claimId }
    
    if ($foundClaim -and $foundClaim.status -eq 'PENDING') {
        return @{ Success = $true; Details = "Claim visible: Tenant $($foundClaim.tenantIdentity.name), Amount: $($foundClaim.amount)" }
    } else {
        return @{ Success = $false; Error = "Claim not found in manager view" }
    }
}

$verifyResult = Test-Step "VERIFY-2" "Manager Verifies Claim" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = '{"decision":"VERIFIED","note":"E2E test verification - payment confirmed"}'
    
    try {
        $verify = Invoke-RestMethod -Uri "$baseUrl/api/manager/payment-claims/$($script:claimId)/verify" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
        
        if ($verify.success) {
            return @{ Success = $true; Details = "Claim verified at $($verify.data.verifiedAt)" }
        } else {
            return @{ Success = $false; Error = $verify.message }
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $errorMsg = "$errorMsg - $errorBody"
        }
        return @{ Success = $false; Error = $errorMsg }
    }
}

# ============================================================================
# DATA CORRECTNESS VALIDATION
# ============================================================================

if ($verifyResult.Success) {
    Write-Host ""
    Write-Host "=== DATA CORRECTNESS CHECKS ===" -ForegroundColor Cyan
    
    Start-Sleep -Seconds 1
    
    Test-Step "DATA-CHECK-1" "Rent Collection Increased" {
        $headers = @{ Authorization = "Bearer $script:managerToken" }
        $period = (Get-Date).ToString('yyyy-MM')
        
        $rentCollectionAfter = Invoke-RestMethod -Uri "$baseUrl/api/manager/finance/rent-collection?period=$period" -Headers $headers
        
        $collectedAfter = $rentCollectionAfter.data.totalCollected
        $increase = $collectedAfter - $script:baselineCollected
        
        if ($increase -eq 1000000) {
            return @{ Success = $true; Details = "Collected increased by 1000000 (baseline: $($script:baselineCollected) -> $collectedAfter)" }
        } else {
            return @{ Success = $false; Error = "Expected increase of 1000000, got $increase" }
        }
    }
    
    Test-Step "DATA-CHECK-2" "Income Statement Updated" {
        $headers = @{ Authorization = "Bearer $script:managerToken" }
        $period = (Get-Date).ToString('yyyy-MM')
        
        $incomeStatement = Invoke-RestMethod -Uri "$baseUrl/api/manager/finance/income-statement?period=$period" -Headers $headers
        
        $rentIncome = $incomeStatement.data.revenue.rentIncome
        
        if ($rentIncome -ge 1000000) {
            return @{ Success = $true; Details = "Income statement rent income: $rentIncome" }
        } else {
            return @{ Success = $false; Error = "Expected rent income >= 1000000, got $rentIncome" }
        }
    }
    
    Test-Step "DATA-CHECK-3" "Tenant Sees Verification" {
        $headers = @{ Authorization = "Bearer $script:tenantToken" }
        $claimsAfter = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Headers $headers
        
        $verifiedClaim = $claimsAfter.data | Where-Object { $_.id -eq $script:claimId }
        
        if ($verifiedClaim -and $verifiedClaim.status -eq 'VERIFIED') {
            return @{ Success = $true; Details = "Claim status VERIFIED in tenant view" }
        } else {
            return @{ Success = $false; Error = "Claim not verified. Status: $($verifiedClaim.status)" }
        }
    }
    
    Test-Step "DATA-CHECK-4" "Audit Timeline" {
        $headers = @{ Authorization = "Bearer $script:managerToken" }
        $history = Invoke-RestMethod -Uri "$baseUrl/api/manager/payment-claims/$($script:claimId)/history" -Headers $headers
        
        $timeline = $history.data.timeline
        $hasCreated = $timeline | Where-Object { $_.action -eq 'CREATED' }
        $hasVerified = $timeline | Where-Object { $_.action -eq 'VERIFIED' }
        
        if ($hasCreated -and $hasVerified) {
            return @{ Success = $true; Details = "Timeline has CREATED and VERIFIED events" }
        } else {
            return @{ Success = $false; Error = "Timeline incomplete" }
        }
    }
    
} else {
    Write-Host ""
    Write-Host "WARNING: Skipping data checks - verification failed" -ForegroundColor Yellow
}

# ============================================================================
# REJECTION FLOW
# ============================================================================

Write-Host ""
Write-Host "=== REJECTION FLOW ===" -ForegroundColor Cyan

$claim2Result = Test-Step "REJECT-1" "Tenant Submits Second Claim" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    $body = @{ 
        leaseId = $script:leaseId
        amount = 1000000
        claimedPaidAt = '2026-03-20T08:00:00.000Z'
        method = 'CASH'
        referenceText = "E2E-REJECT-$timestamp"
    } | ConvertTo-Json
    
    try {
        $claim = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
        
        if ($claim.success) {
            $script:claim2Id = $claim.data.id
            return @{ Success = $true; Details = "Second claim ID: $($script:claim2Id)" }
        } else {
            return @{ Success = $false; Error = "Claim submission failed: $($claim.message)" }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

if ($claim2Result.Success) {
    Test-Step "REJECT-2" "Manager Rejects Second Claim" {
        $headers = @{ Authorization = "Bearer $script:managerToken" }
        $body = '{"decision":"REJECTED","note":"Duplicate payment for same period"}'
        
        try {
            $reject = Invoke-RestMethod -Uri "$baseUrl/api/manager/payment-claims/$($script:claim2Id)/verify" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
            
            if ($reject.success) {
                return @{ Success = $true; Details = "Claim rejected successfully" }
            } else {
                return @{ Success = $false; Error = $reject.message }
            }
        } catch {
            return @{ Success = $false; Error = $_.Exception.Message }
        }
    }
    
    Test-Step "REJECT-3" "Tenant Sees Rejection" {
        $headers = @{ Authorization = "Bearer $script:tenantToken" }
        $claimsAfter = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Headers $headers
        
        $rejectedClaim = $claimsAfter.data | Where-Object { $_.id -eq $script:claim2Id }
        
        if ($rejectedClaim -and $rejectedClaim.status -eq 'REJECTED') {
            return @{ Success = $true; Details = "Claim status REJECTED in tenant view" }
        } else {
            return @{ Success = $false; Error = "Claim not rejected. Status: $($rejectedClaim.status)" }
        }
    }
}

# ============================================================================
# RBAC VALIDATION
# ============================================================================

Write-Host ""
Write-Host "=== RBAC VALIDATION ===" -ForegroundColor Cyan

Test-Step "RBAC-1" "Tenant Cannot Access Manager Dashboard" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/manager/dashboard" -Headers $headers -ErrorAction Stop
        return @{ Success = $false; Error = "Tenant accessed manager endpoint (should be 403)" }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return @{ Success = $true; Details = "Correctly blocked with 403 Forbidden" }
        } else {
            return @{ Success = $false; Error = "Wrong status code: $($_.Exception.Response.StatusCode)" }
        }
    }
}

Test-Step "RBAC-2" "Manager Cannot Access Owner Invitations" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/owner/invitations" -Headers $headers -ErrorAction Stop
        return @{ Success = $false; Error = "Manager accessed owner endpoint (should be 403)" }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return @{ Success = $true; Details = "Correctly blocked with 403 Forbidden" }
        } else {
            return @{ Success = $false; Error = "Wrong status code: $($_.Exception.Response.StatusCode)" }
        }
    }
}

Test-Step "RBAC-3" "Owner Cannot Access Tenant Endpoints" {
    $headers = @{ Authorization = "Bearer $script:ownerToken" }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/tenant/me" -Headers $headers -ErrorAction Stop
        return @{ Success = $false; Error = "Owner accessed tenant endpoint (should be 403)" }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return @{ Success = $true; Details = "Correctly blocked with 403 Forbidden" }
        } else {
            return @{ Success = $false; Error = "Wrong status code: $($_.Exception.Response.StatusCode)" }
        }
    }
}

# ============================================================================
# OWNER OVERSIGHT
# ============================================================================

Write-Host ""
Write-Host "=== OWNER OVERSIGHT ===" -ForegroundColor Cyan

Test-Step "OWNER-1" "Owner Views Properties" {
    $headers = @{ Authorization = "Bearer $script:ownerToken" }
    $properties = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Headers $headers
    
    $testProperty = $properties.data | Where-Object { $_.id -eq $script:propertyId }
    
    if ($testProperty) {
        return @{ Success = $true; Details = "Property visible to owner: $($testProperty.name)" }
    } else {
        return @{ Success = $false; Error = "Test property not visible to owner" }
    }
}

Test-Step "OWNER-2" "Owner Dashboard Metrics" {
    $headers = @{ Authorization = "Bearer $script:ownerToken" }
    $properties = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Headers $headers
    $invitations = Invoke-RestMethod -Uri "$baseUrl/api/owner/invitations" -Headers $headers
    
    return @{
        Success = $true
        Details = "Properties: $($properties.data.Count), Invitations: $($invitations.data.Count)"
    }
}

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $results.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "FAILED TESTS:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  [$($_.Step)] $($_.Description)" -ForegroundColor Red
        Write-Host "    Error: $($_.Error)" -ForegroundColor Yellow
    }
    Write-Host ""
}

$completionTime = Get-Date
Write-Host "Test execution completed at $completionTime" -ForegroundColor Cyan

# Export results
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultsFile = "e2e-clean-results-$timestamp.json"
$results | ConvertTo-Json -Depth 5 | Out-File $resultsFile
Write-Host ""
Write-Host "Results saved to: $resultsFile" -ForegroundColor Green
Write-Host ""

# Display test data for reference
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DATA REFERENCE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Property ID: $($script:propertyId)" -ForegroundColor White
Write-Host "Unit ID: $($script:unitId)" -ForegroundColor White
Write-Host "Lease ID: $($script:leaseId)" -ForegroundColor White
Write-Host "Claim ID: $($script:claimId)" -ForegroundColor White
if ($script:claim2Id) {
    Write-Host "Second Claim ID: $($script:claim2Id)" -ForegroundColor White
}
Write-Host ""
