# EstateNet E2E Verification Script
# Executes complete Owner->Manager->Tenant flow with API validation

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "EstateNet E2E Verification Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test results tracking
$results = @()

function Test-Step {
    param(
        [string]$StepNumber,
        [string]$Description,
        [scriptblock]$TestBlock
    )
    
    Write-Host "`n[$StepNumber] $Description" -ForegroundColor Yellow
    try {
        $result = & $TestBlock
        if ($result.Success) {
            Write-Host "✓ PASS" -ForegroundColor Green
            $script:results += @{
                Step        = $StepNumber
                Description = $Description
                Status      = "PASS"
                Details     = $result.Details
            }
        }
        else {
            Write-Host "✗ FAIL: $($result.Error)" -ForegroundColor Red
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
        Write-Host "✗ FAIL: $_" -ForegroundColor Red
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
# STORY 1: OWNER WORKFLOWS
# ============================================================================

Write-Host "`n=== STORY 1: OWNER WORKFLOWS ===" -ForegroundColor Cyan

# 1.1 Owner Sign In
$ownerResult = Test-Step "1.1" "Owner Sign In" {
    $body = @{ 
        email    = 'kazoora@gmail.com'
        password = 'Ak47grave'
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType 'application/json'
    
    if ($response.success -and $response.data.user.role -eq 'OWNER') {
        $script:ownerToken = $response.data.token
        $script:ownerId = $response.data.user.id
        return @{ 
            Success = $true
            Details = "Owner ID: $($script:ownerId)"
        }
    }
    else {
        return @{ Success = $false; Error = "Login failed or wrong role" }
    }
}

if (-not $ownerResult.Success) {
    Write-Host "`nCRITICAL: Owner login failed. Cannot continue." -ForegroundColor Red
    exit 1
}

# 1.2 Owner Dashboard - View Metrics
Test-Step "1.2" "Owner Dashboard - View Metrics" {
    $headers = @{ Authorization = "Bearer $script:ownerToken" }
    
    $properties = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Headers $headers
    $invitations = Invoke-RestMethod -Uri "$baseUrl/api/owner/invitations" -Headers $headers
    
    $propCount = $properties.data.Count
    $inviteCount = $invitations.data.Count
    
    return @{
        Success = $true
        Details = "Properties: $propCount, Invitations: $inviteCount"
    }
}

# 1.3 Owner Gets Property for Invitation
$propertyResult = Test-Step "1.3" "Owner Gets Property ID" {
    $headers = @{ Authorization = "Bearer $script:ownerToken" }
    $properties = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Headers $headers
    
    if ($properties.data.Count -gt 0) {
        $script:testPropertyId = $properties.data[0].id
        return @{
            Success = $true
            Details = "Property ID: $($script:testPropertyId), Name: $($properties.data[0].name)"
        }
    }
    else {
        return @{ Success = $false; Error = "No properties found" }
    }
}

# ============================================================================
# STORY 2: MANAGER WORKFLOWS
# ============================================================================

Write-Host "`n=== STORY 2: MANAGER WORKFLOWS ===" -ForegroundColor Cyan

# 2.1 Manager Sign In
$managerResult = Test-Step "2.1" "Manager Sign In" {
    $body = @{ 
        email    = 'mark@gmail.com'
        password = 'Ak47grave'
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType 'application/json'
    
    if ($response.success -and $response.data.user.role -eq 'MANAGER') {
        $script:managerToken = $response.data.token
        $script:managerId = $response.data.user.id
        return @{ 
            Success = $true
            Details = "Manager ID: $($script:managerId)"
        }
    }
    else {
        return @{ Success = $false; Error = "Login failed or wrong role" }
    }
}

if (-not $managerResult.Success) {
    Write-Host "`nCRITICAL: Manager login failed. Cannot continue." -ForegroundColor Red
    exit 1
}

# 2.2 Manager Views Dashboard
Test-Step "2.2" "Manager Dashboard" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/api/manager/dashboard" -Headers $headers
    
    return @{
        Success = $true
        Details = "Dashboard loaded successfully"
    }
}

# 2.3 Manager Creates Property
$newPropertyResult = Test-Step "2.3" "Manager Creates Property" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = @{ 
        name     = "E2E Test Property $(Get-Date -Format 'yyyyMMdd-HHmmss')"
        location = 'Kampala, Uganda'
    } | ConvertTo-Json
    
    $property = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($property.success) {
        $script:newPropertyId = $property.data.id
        return @{
            Success = $true
            Details = "Property ID: $($script:newPropertyId), Name: $($property.data.name)"
        }
    }
    else {
        return @{ Success = $false; Error = "Property creation failed" }
    }
}

# 2.4 Manager Creates Units
$unit1Result = Test-Step "2.4a" "Manager Creates Unit A1" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = @{ 
        unitNumber = 'A1'
        rentAmount = 950000
    } | ConvertTo-Json
    
    $unit = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($script:newPropertyId)/units" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($unit.success) {
        $script:unit1Id = $unit.data.id
        return @{
            Success = $true
            Details = "Unit ID: $($script:unit1Id), Number: A1, Rent: 950000"
        }
    }
    else {
        return @{ Success = $false; Error = "Unit creation failed" }
    }
}

$unit2Result = Test-Step "2.4b" "Manager Creates Unit A2" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = @{ 
        unitNumber = 'A2'
        rentAmount = 1200000
    } | ConvertTo-Json
    
    $unit = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($script:newPropertyId)/units" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($unit.success) {
        $script:unit2Id = $unit.data.id
        return @{
            Success = $true
            Details = "Unit ID: $($script:unit2Id), Number: A2, Rent: 1200000"
        }
    }
    else {
        return @{ Success = $false; Error = "Unit creation failed" }
    }
}

# 2.5 Manager Creates Lease
$leaseResult = Test-Step "2.5" "Manager Creates Lease for Innocent" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = @{ 
        tenantId   = 'TN-MW5IEZ2V'
        propertyId = $script:newPropertyId
        unitId     = $script:unit1Id
        rentAmount = 950000
        startDate  = (Get-Date).ToString('yyyy-MM-dd')
        status     = 'ACTIVE'
    } | ConvertTo-Json
    
    $lease = Invoke-RestMethod -Uri "$baseUrl/api/leases" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($lease.success) {
        $script:leaseId = $lease.data.id
        return @{
            Success = $true
            Details = "Lease ID: $($script:leaseId), Status: ACTIVE"
        }
    }
    else {
        return @{ Success = $false; Error = "Lease creation failed" }
    }
}

# 2.6 Manager Finance Baseline
$baselineResult = Test-Step "2.6" "Manager Finance Baseline" {
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
# STORY 3: TENANT WORKFLOWS
# ============================================================================

Write-Host "`n=== STORY 3: TENANT WORKFLOWS ===" -ForegroundColor Cyan

# 3.1 Tenant Sign In
$tenantResult = Test-Step "3.1" "Tenant Sign In" {
    $body = @{ 
        email    = 'innocent@gmail.com'
        password = 'Ak47grave'
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType 'application/json'
    
    if ($response.success -and $response.data.user.role -eq 'TENANT') {
        $script:tenantToken = $response.data.token
        $script:tenantId = $response.data.user.tenantId
        return @{ 
            Success = $true
            Details = "Tenant ID: $($script:tenantId)"
        }
    }
    else {
        return @{ Success = $false; Error = "Login failed or wrong role" }
    }
}

if (-not $tenantResult.Success) {
    Write-Host "`nCRITICAL: Tenant login failed. Cannot continue." -ForegroundColor Red
    exit 1
}

# 3.2 Tenant Views Active Lease
Test-Step "3.2" "Tenant Views Active Lease" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    
    $activeLease = Invoke-RestMethod -Uri "$baseUrl/api/tenant/me/active-lease" -Headers $headers
    $rentStatus = Invoke-RestMethod -Uri "$baseUrl/api/tenant/me/rent-status" -Headers $headers
    
    if ($activeLease.success) {
        return @{
            Success = $true
            Details = "Lease: $($activeLease.data.property.name) - Unit $($activeLease.data.unit.unitNumber), Rent: $($activeLease.data.rentAmount)"
        }
    }
    else {
        return @{ Success = $false; Error = "No active lease found" }
    }
}

# 3.3 Tenant Submits Payment Claim
$claimResult = Test-Step "3.3" "Tenant Submits Payment Claim" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    
    # Get active lease first
    $activeLease = Invoke-RestMethod -Uri "$baseUrl/api/tenant/me/active-lease" -Headers $headers
    $leaseId = $activeLease.data.id
    
    $body = @{ 
        leaseId       = $leaseId
        amount        = 950000
        claimedPaidAt = '2026-03-05T08:00:00.000Z'
        method        = 'BANK_TRANSFER'
        referenceText = "E2E-REF-$(Get-Date -Format 'yyyyMMddHHmmss')"
    } | ConvertTo-Json
    
    $claim = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    if ($claim.success) {
        $script:claimId = $claim.data.id
        return @{
            Success = $true
            Details = "Claim ID: $($script:claimId), Status: $($claim.data.status)"
        }
    }
    else {
        return @{ Success = $false; Error = "Claim submission failed" }
    }
}

# 3.4 Tenant Views Payment History
Test-Step "3.4" "Tenant Views Payment History" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    $claims = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Headers $headers
    
    $foundClaim = $claims.data | Where-Object { $_.id -eq $script:claimId }
    
    if ($foundClaim -and $foundClaim.status -eq 'PENDING') {
        return @{
            Success = $true
            Details = "Claim found in history with status PENDING"
        }
    }
    else {
        return @{ Success = $false; Error = "Claim not found or wrong status" }
    }
}

# ============================================================================
# STORY 4: CROSS-ROLE CONSISTENCY (PAYMENT VERIFICATION)
# ============================================================================

Write-Host "`n=== STORY 4: PAYMENT VERIFICATION ===" -ForegroundColor Cyan

# 4.1 Manager Views Pending Claim
Test-Step "4.1" "Manager Views Pending Claim" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $managerClaims = Invoke-RestMethod -Uri "$baseUrl/api/manager/payment-claims" -Headers $headers
    
    $foundClaim = $managerClaims.data | Where-Object { $_.id -eq $script:claimId }
    
    if ($foundClaim -and $foundClaim.status -eq 'PENDING') {
        return @{
            Success = $true
            Details = "Claim visible to manager: Tenant $($foundClaim.tenantIdentity.name), Amount: $($foundClaim.amount)"
        }
    }
    else {
        return @{ Success = $false; Error = "Claim not found in manager view" }
    }
}

# 4.2 Manager Verifies Claim
$verifyResult = Test-Step "4.2" "Manager Verifies Claim" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    $body = '{"decision":"VERIFIED","note":"Rent received via bank transfer"}'
    
    try {
        $verify = Invoke-RestMethod -Uri "$baseUrl/api/manager/payment-claims/$($script:claimId)/verify" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
        
        if ($verify.success) {
            return @{
                Success = $true
                Details = "Claim verified successfully"
            }
        }
        else {
            return @{ Success = $false; Error = $verify.message }
        }
    }
    catch {
        # Try to extract error details
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $errorMsg = "$errorMsg - Response: $errorBody"
        }
        return @{ Success = $false; Error = $errorMsg }
    }
}

# Only continue with data checks if verification succeeded
if ($verifyResult.Success) {
    
    # 4.3 Data Check: Rent Collection Updated
    Test-Step "4.3" "Data Check: Rent Collection Updated" {
        $headers = @{ Authorization = "Bearer $script:managerToken" }
        $period = (Get-Date).ToString('yyyy-MM')
        
        Start-Sleep -Seconds 1  # Allow transaction to complete
        
        $rentCollectionAfter = Invoke-RestMethod -Uri "$baseUrl/api/manager/finance/rent-collection?period=$period" -Headers $headers
        
        $collectedAfter = $rentCollectionAfter.data.totalCollected
        $increase = $collectedAfter - $script:baselineCollected
        
        if ($increase -eq 950000) {
            return @{
                Success = $true
                Details = "Collected rent increased by 950000 (baseline: $($script:baselineCollected), after: $collectedAfter)"
            }
        }
        else {
            return @{ 
                Success = $false
                Error   = "Expected increase of 950000, got $increase"
            }
        }
    }
    
    # 4.4 Data Check: Income Statement
    Test-Step "4.4" "Data Check: Income Statement" {
        $headers = @{ Authorization = "Bearer $script:managerToken" }
        $period = (Get-Date).ToString('yyyy-MM')
        
        $incomeStatement = Invoke-RestMethod -Uri "$baseUrl/api/manager/finance/income-statement?period=$period" -Headers $headers
        
        $rentIncome = $incomeStatement.data.revenue.rentIncome
        
        if ($rentIncome -ge 950000) {
            return @{
                Success = $true
                Details = "Income statement shows rent income: $rentIncome"
            }
        }
        else {
            return @{ 
                Success = $false
                Error   = "Expected rent income >= 950000, got $rentIncome"
            }
        }
    }
    
    # 4.5 Tenant Sees Verification
    Test-Step "4.5" "Tenant Sees Verification" {
        $headers = @{ Authorization = "Bearer $script:tenantToken" }
        $claimsAfter = Invoke-RestMethod -Uri "$baseUrl/api/tenant/payment-claims" -Headers $headers
        
        $verifiedClaim = $claimsAfter.data | Where-Object { $_.id -eq $script:claimId }
        
        if ($verifiedClaim -and $verifiedClaim.status -eq 'VERIFIED') {
            return @{
                Success = $true
                Details = "Claim status updated to VERIFIED in tenant view"
            }
        }
        else {
            return @{ 
                Success = $false
                Error   = "Claim not verified in tenant view. Status: $($verifiedClaim.status)"
            }
        }
    }
    
}
else {
    Write-Host "`nWARNING: Skipping data checks due to verification failure" -ForegroundColor Yellow
}

# ============================================================================
# STORY 5: RBAC VALIDATION
# ============================================================================

Write-Host "`n=== STORY 5: RBAC VALIDATION ===" -ForegroundColor Cyan

# 5.1 Tenant Cannot Access Manager Endpoints
Test-Step "5.1" "RBAC: Tenant to Manager Endpoint" {
    $headers = @{ Authorization = "Bearer $script:tenantToken" }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/manager/dashboard" -Headers $headers -ErrorAction Stop
        return @{ Success = $false; Error = "Tenant accessed manager endpoint (should be 403)" }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return @{
                Success = $true
                Details = "Correctly blocked with 403 Forbidden"
            }
        }
        else {
            return @{ Success = $false; Error = "Wrong status code: $($_.Exception.Response.StatusCode)" }
        }
    }
}

# 5.2 Manager Cannot Access Owner Endpoints
Test-Step "5.2" "RBAC: Manager to Owner Endpoint" {
    $headers = @{ Authorization = "Bearer $script:managerToken" }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/owner/invitations" -Headers $headers -ErrorAction Stop
        return @{ Success = $false; Error = "Manager accessed owner endpoint (should be 403)" }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return @{
                Success = $true
                Details = "Correctly blocked with 403 Forbidden"
            }
        }
        else {
            return @{ Success = $false; Error = "Wrong status code: $($_.Exception.Response.StatusCode)" }
        }
    }
}

# 5.3 Owner Cannot Access Tenant Endpoints
Test-Step "5.3" "RBAC: Owner to Tenant Endpoint" {
    $headers = @{ Authorization = "Bearer $script:ownerToken" }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/tenant/me" -Headers $headers -ErrorAction Stop
        return @{ Success = $false; Error = "Owner accessed tenant endpoint (should be 403)" }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return @{
                Success = $true
                Details = "Correctly blocked with 403 Forbidden"
            }
        }
        else {
            return @{ Success = $false; Error = "Wrong status code: $($_.Exception.Response.StatusCode)" }
        }
    }
}

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

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
}

$completionTime = Get-Date
Write-Host ""
Write-Host "Test execution completed at $completionTime" -ForegroundColor Cyan

# Export results to JSON
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultsFile = "e2e-verification-results-$timestamp.json"
$results | ConvertTo-Json -Depth 5 | Out-File $resultsFile
Write-Host ""
Write-Host "Results saved to: $resultsFile" -ForegroundColor Green
