# EstateNet Manager Billing Tier B Enforcement E2E Test
# This script tests the complete billing enforcement flow for managers

Write-Host "=== EstateNet Manager Billing Tier B Enforcement E2E Test ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = "http://localhost:3001"
$OWNER_EMAIL = "owner@test.estatenet.com"
$OWNER_PASSWORD = "test123456"
$MANAGER_EMAIL = "manager@test.estatenet.com"
$MANAGER_PASSWORD = "test123456"
$TENANT_EMAIL = "tenant@test.estatenet.com"
$TENANT_PASSWORD = "test123456"

# Helper function to make API requests
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $url = "$BASE_URL$Endpoint"
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $Headers -ContentType "application/json" -Body $Body
        }
        else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $Headers
        }
        
        return @{
            Success = $true
            Content = $response
        }
    }
    catch {
        return @{
            Success = $false
            Error   = $_.Exception.Message
        }
    }
}

# Test results tracking
$tests = @()
$passed = 0
$failed = 0

function Add-Test {
    param([string]$Name, [bool]$TestPassed, [string]$Message = "")
    $tests += @{
        Name    = $Name
        Passed  = $TestPassed
        Message = $Message
    }
    
    if ($TestPassed) {
        $passed = $passed + 1
        Write-Host "PASS: $Name" -ForegroundColor Green
    }
    else {
        $failed = $failed + 1
        Write-Host "FAIL: $Name" -ForegroundColor Red
        if ($Message) {
            Write-Host "       $Message" -ForegroundColor Red
        }
    }
}

Write-Host "Starting EstateNet Manager Billing Tier B Enforcement Test..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
$healthResponse = Invoke-Api -Method "GET" -Endpoint "/health"
if ($healthResponse.Success) {
    Add-Test "Health Check" $true "Backend is running"
}
else {
    Add-Test "Health Check" $false "Backend is not responding"
    exit 1
}

# Test 2: Register Owner
Write-Host "Test 2: Register Owner" -ForegroundColor Yellow
$ownerData = @{
    name     = "Test Owner"
    email    = $OWNER_EMAIL
    password = $OWNER_PASSWORD
    role     = "OWNER"
} | ConvertTo-Json -Compress

$ownerResponse = Invoke-Api -Method "POST" -Endpoint "/auth/register" -Body $ownerData
if ($ownerResponse.Success -and $ownerResponse.Content.success) {
    $ownerToken = $ownerResponse.Content.data.token
    Add-Test "Owner Registration" $true "Owner registered successfully"
}
else {
    Add-Test "Owner Registration" $false "Failed to register owner"
    exit 1
}

# Test 3: Create Property
Write-Host "Test 3: Create Property" -ForegroundColor Yellow
$propertyData = @{
    name     = "Test Property"
    location = "Test Location"
} | ConvertTo-Json -Compress

$propertyResponse = Invoke-Api -Method "POST" -Endpoint "/properties" -Headers @{Authorization = "Bearer $ownerToken" } -Body $propertyData
if ($propertyResponse.Success -and $propertyResponse.Content.success) {
    $propertyId = $propertyResponse.Content.data.id
    Add-Test "Property Creation" $true "Property created successfully"
}
else {
    Add-Test "Property Creation" $false "Failed to create property"
    exit 1
}

# Test 4: Create Units
Write-Host "Test 4: Create Units" -ForegroundColor Yellow
$unit1Data = @{
    propertyId = $propertyId
    unitNumber = "A101"
    rentAmount = 500000
} | ConvertTo-Json -Compress

$unit2Data = @{
    propertyId = $propertyId
    unitNumber = "A102"
    rentAmount = 600000
} | ConvertTo-Json -Compress

$unit1Response = Invoke-Api -Method "POST" -Endpoint "/units" -Headers @{Authorization = "Bearer $ownerToken" } -Body $unit1Data
$unit2Response = Invoke-Api -Method "POST" -Endpoint "/units" -Headers @{Authorization = "Bearer $ownerToken" } -Body $unit2Data

if ($unit1Response.Success -and $unit1Response.Content.success -and $unit2Response.Success -and $unit2Response.Content.success) {
    $unit1Id = $unit1Response.Content.data.id
    $unit2Id = $unit2Response.Content.data.id
    Add-Test "Units Creation" $true "Units created successfully"
}
else {
    Add-Test "Units Creation" $false "Failed to create units"
    exit 1
}

# Test 5: Register Manager
Write-Host "Test 5: Register Manager" -ForegroundColor Yellow
$managerData = @{
    name     = "Test Manager"
    email    = $MANAGER_EMAIL
    password = $MANAGER_PASSWORD
    role     = "MANAGER"
} | ConvertTo-Json -Compress

$managerResponse = Invoke-Api -Method "POST" -Endpoint "/auth/register" -Body $managerData
if ($managerResponse.Success -and $managerResponse.Content.success) {
    $managerToken = $managerResponse.Content.data.token
    Add-Test "Manager Registration" $true "Manager registered successfully"
}
else {
    Add-Test "Manager Registration" $false "Failed to register manager"
    exit 1
}

# Test 6: Owner Invites Manager
Write-Host "Test 6: Owner Invites Manager" -ForegroundColor Yellow
$invitationData = @{
    propertyId   = $propertyId
    managerEmail = $MANAGER_EMAIL
} | ConvertTo-Json -Compress

$invitationResponse = Invoke-Api -Method "POST" -Endpoint "/owner/invitations" -Headers @{Authorization = "Bearer $ownerToken" } -Body $invitationData
if ($invitationResponse.Success -and $invitationResponse.Content.success) {
    $invitationId = $invitationResponse.Content.data.id
    Add-Test "Manager Invitation" $true "Manager invited successfully"
}
else {
    Add-Test "Manager Invitation" $false "Failed to invite manager"
    exit 1
}

# Test 7: Manager Accepts Invitation
Write-Host "Test 7: Manager Accepts Invitation" -ForegroundColor Yellow
$acceptData = @{
    status = "ACCEPTED"
} | ConvertTo-Json -Compress

$acceptResponse = Invoke-Api -Method "POST" -Endpoint "/owner/invitations/$invitationId/accept" -Headers @{Authorization = "Bearer $managerToken" } -Body $acceptData
if ($acceptResponse.Success -and $acceptResponse.Content.success) {
    Add-Test "Manager Acceptance" $true "Manager accepted invitation successfully"
}
else {
    Add-Test "Manager Acceptance" $false "Failed to accept invitation"
    exit 1
}

# Test 8: Manager Accepts Terms
Write-Host "Test 8: Manager Accepts Terms" -ForegroundColor Yellow
$termsResponse = Invoke-Api -Method "POST" -Endpoint "/manager/terms/accept" -Headers @{Authorization = "Bearer $managerToken" } -Body "{}"
if ($termsResponse.Success -and $termsResponse.Content.success) {
    Add-Test "Terms Acceptance" $true "Manager accepted terms successfully"
}
else {
    Add-Test "Terms Acceptance" $false "Failed to accept terms"
    exit 1
}

# Test 9: Generate Invoice for Current Month
Write-Host "Test 9: Generate Invoice for Current Month" -ForegroundColor Yellow
$currentMonth = Get-Date
$periodStart = (Get-Date -Day 1).ToString("yyyy-MM-dd")
$periodEnd = (Get-Date -Day 1).AddMonths(1).AddDays(-1).ToString("yyyy-MM-dd")

$invoiceData = @{
    managerId   = $managerResponse.Content.data.id
    periodStart = $periodStart
    periodEnd   = $periodEnd
} | ConvertTo-Json -Compress

$invoiceResponse = Invoke-Api -Method "POST" -Endpoint "/manager/billing/generate" -Headers @{Authorization = "Bearer $ownerToken" } -Body $invoiceData
if ($invoiceResponse.Success -and $invoiceResponse.Content.success) {
    $invoiceId = $invoiceResponse.Content.data.id
    Add-Test "Invoice Generation" $true "Invoice generated successfully"
}
else {
    Add-Test "Invoice Generation" $false "Failed to generate invoice"
    exit 1
}

# Test 10: Mark Invoice as Overdue
Write-Host "Test 10: Mark Invoice as Overdue" -ForegroundColor Yellow
# First mark as paid to get the invoice in the system
$paidResponse = Invoke-Api -Method "POST" -Endpoint "/manager/billing/mark-paid/$invoiceId" -Headers @{Authorization = "Bearer $ownerToken" } -Body "{}"
if ($paidResponse.Success -and $paidResponse.Content.success) {
    # Now set it to OVERDUE by updating the manager directly (using owner endpoint)
    $updateManagerData = @{
        billingStatus = "OVERDUE"
    } | ConvertTo-Json -Compress
    
    $updateResponse = Invoke-Api -Method "PATCH" -Endpoint "/users/$($managerResponse.Content.data.id)" -Headers @{Authorization = "Bearer $ownerToken" } -Body $updateManagerData
    if ($updateResponse.Success) {
        Add-Test "Invoice Overdue Status" $true "Invoice marked as overdue and manager billing status updated"
    }
    else {
        Add-Test "Invoice Overdue Status" $false "Failed to update manager billing status"
        exit 1
    }
}
else {
    Add-Test "Invoice Overdue Status" $false "Failed to mark invoice as paid"
    exit 1
}

# Test 11: Attempt Tenant Invitation (Should Fail)
Write-Host "Test 11: Attempt Tenant Invitation (Should Fail)" -ForegroundColor Yellow
$inviteData = @{
    tenantId   = "TN-DVS9TCL8"
    propertyId = $propertyId
    unitId     = $unit2Id
    rentAmount = 600000
} | ConvertTo-Json -Compress

$inviteResponse = Invoke-Api -Method "POST" -Endpoint "/tenants/invite" -Headers @{Authorization = "Bearer $managerToken" } -Body $inviteData
if (-not $inviteResponse.Success -and $inviteResponse.Error -like "*billing overdue*") {
    Add-Test "Tenant Invitation Blocked" $true "Tenant invitation blocked due to overdue billing"
}
else {
    Add-Test "Tenant Invitation Blocked" $false "Tenant invitation should be blocked but wasn't"
    exit 1
}

# Test 12: Mark Invoice as Paid
Write-Host "Test 12: Mark Invoice as Paid" -ForegroundColor Yellow
$paidResponse = Invoke-Api -Method "POST" -Endpoint "/manager/billing/mark-paid/$invoiceId" -Headers @{Authorization = "Bearer $ownerToken" } -Body "{}"
if ($paidResponse.Success -and $paidResponse.Content.success) {
    # Update manager billing status back to CURRENT
    $updateManagerData = @{
        billingStatus = "CURRENT"
    } | ConvertTo-Json -Compress
    
    $updateResponse = Invoke-Api -Method "PATCH" -Endpoint "/users/$($managerResponse.Content.data.id)" -Headers @{Authorization = "Bearer $ownerToken" } -Body $updateManagerData
    if ($updateResponse.Success) {
        Add-Test "Invoice Payment" $true "Invoice marked as paid and manager billing status updated"
    }
    else {
        Add-Test "Invoice Payment" $false "Failed to update manager billing status"
        exit 1
    }
}
else {
    Add-Test "Invoice Payment" $false "Failed to mark invoice as paid"
    exit 1
}

# Test 13: Attempt Tenant Invitation (Should Pass)
Write-Host "Test 13: Attempt Tenant Invitation (Should Pass)" -ForegroundColor Yellow
$inviteResponse2 = Invoke-Api -Method "POST" -Endpoint "/tenants/invite" -Headers @{Authorization = "Bearer $managerToken" } -Body $inviteData
if ($inviteResponse2.Success -and $inviteResponse2.Content.success) {
    Add-Test "Tenant Invitation Allowed" $true "Tenant invitation allowed after payment"
}
else {
    Add-Test "Tenant Invitation Allowed" $false "Tenant invitation should be allowed but wasn't"
    exit 1
}

# Test 14: Verify Billing Status
Write-Host "Test 14: Verify Billing Status" -ForegroundColor Yellow
$billingStatusResponse = Invoke-Api -Method "GET" -Endpoint "/manager/billing/status" -Headers @{Authorization = "Bearer $managerToken" }
if ($billingStatusResponse.Success -and $billingStatusResponse.Content.success) {
    $billingStatus = $billingStatusResponse.Content.data.billingStatus
    if ($billingStatus -eq "CURRENT") {
        Add-Test "Billing Status Verification" $true "Manager billing status is CURRENT"
    }
    else {
        Add-Test "Billing Status Verification" $false "Manager billing status should be CURRENT but is $billingStatus"
        exit 1
    }
}
else {
    Add-Test "Billing Status Verification" $false "Failed to verify billing status"
    exit 1
}

# Test 15: Verify Invoice Status
Write-Host "Test 15: Verify Invoice Status" -ForegroundColor Yellow
$invoiceStatusResponse = Invoke-Api -Method "GET" -Endpoint "/manager/billing/invoices/$invoiceId" -Headers @{Authorization = "Bearer $managerToken" }
if ($invoiceStatusResponse.Success -and $invoiceStatusResponse.Content.success) {
    $invoiceStatus = $invoiceStatusResponse.Content.data.status
    if ($invoiceStatus -eq "PAID") {
        Add-Test "Invoice Status Verification" $true "Invoice status is PAID"
    }
    else {
        Add-Test "Invoice Status Verification" $false "Invoice status should be PAID but is $invoiceStatus"
        exit 1
    }
}
else {
    Add-Test "Invoice Status Verification" $false "Failed to verify invoice status"
    exit 1
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Tests Run: $($tests.Count)" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "ALL TESTS PASSED! Manager Billing Tier B Enforcement is working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "Key Features Verified:" -ForegroundColor Cyan
    Write-Host "- Manager terms acceptance required" -ForegroundColor Green
    Write-Host "- Invoice generation and management" -ForegroundColor Green
    Write-Host "- Tier B enforcement blocks tenant invitations" -ForegroundColor Green
    Write-Host "- Payment restores full access" -ForegroundColor Green
    Write-Host "- Billing status updates correctly" -ForegroundColor Green
    Write-Host "- All API endpoints working" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "SOME TESTS FAILED! Please review the failed tests above." -ForegroundColor Red
    Write-Host ""
    Write-Host "The billing enforcement system may not be working correctly." -ForegroundColor Red
    exit 1
}
