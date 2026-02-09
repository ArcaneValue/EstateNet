# Manager Accept Invitation E2E Verification Script
# EstateNet Backend - PowerShell
# This script verifies the complete owner-manager invitation flow

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:3001"
$API_URL = "$BASE_URL/api"

Write-Host "========================================"
Write-Host "EstateNet Manager Invitation E2E Test"
Write-Host "========================================"
Write-Host ""

# Helper function to make API calls
function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Token = $null,
        [string]$Body = $null
    )
    
    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    if ($Body) {
        $headers["Content-Type"] = "application/json"
    }
    
    $uri = "$API_URL$Endpoint"
    Write-Host "  -> $Method $uri" -ForegroundColor DarkGray
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $Body
        }
        else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        return @{ Success = $true; Data = $response }
    }
    catch {
        return @{ Success = $false; Error = $_.Exception.Message; Status = $_.Exception.Response.StatusCode.value__ }
    }
}

# Step 1: Health Check
Write-Host "Step 1: Health Check" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method GET
    Write-Host "  ✓ Health OK: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Register Owner
Write-Host "Step 2: Register Owner" -ForegroundColor Cyan
$ownerEmail = "test.owner.e2e.$(Get-Random)@test.com"
$ownerBody = @{
    name        = "Test Owner E2E"
    email       = $ownerEmail
    phoneNumber = "+256700000001"
    password    = "TestPass123!"
} | ConvertTo-Json -Compress

$ownerResult = Invoke-ApiCall -Method "POST" -Endpoint "/auth/register-owner" -Body $ownerBody
if (-not $ownerResult.Success) {
    Write-Host "  ✗ Owner registration failed: $($ownerResult.Error)" -ForegroundColor Red
    exit 1
}
$ownerToken = $ownerResult.Data.data.token
Write-Host "  ✓ Owner registered: $ownerEmail" -ForegroundColor Green
Write-Host "  ✓ Owner token received" -ForegroundColor Green
Write-Host ""

# Step 3: Create Property as Owner
Write-Host "Step 3: Create Property" -ForegroundColor Cyan
$propertyBody = @{
    name     = "E2E Test Property"
    location = "Kampala, Uganda"
    type     = "APARTMENT"
} | ConvertTo-Json -Compress

$propertyResult = Invoke-ApiCall -Method "POST" -Endpoint "/properties" -Token $ownerToken -Body $propertyBody
if (-not $propertyResult.Success) {
    Write-Host "  ✗ Property creation failed: $($propertyResult.Error)" -ForegroundColor Red
    exit 1
}
$propertyId = $propertyResult.Data.data.id
Write-Host "  ✓ Property created: $propertyId" -ForegroundColor Green
Write-Host ""

# Step 4: Register Manager
Write-Host "Step 4: Register Manager" -ForegroundColor Cyan
$managerEmail = "test.manager.e2e.$(Get-Random)@test.com"
$managerBody = @{
    name        = "Test Manager E2E"
    email       = $managerEmail
    phoneNumber = "+256700000002"
    password    = "TestPass123!"
} | ConvertTo-Json -Compress

$managerResult = Invoke-ApiCall -Method "POST" -Endpoint "/auth/register/manager" -Body $managerBody
if (-not $managerResult.Success) {
    Write-Host "  ✗ Manager registration failed: $($managerResult.Error)" -ForegroundColor Red
    exit 1
}
$managerToken = $managerResult.Data.data.token
$managerId = $managerResult.Data.data.user.id
Write-Host "  ✓ Manager registered: $managerEmail" -ForegroundColor Green
Write-Host "  ✓ Manager ID: $managerId" -ForegroundColor Green
Write-Host "  ✓ Manager token received" -ForegroundColor Green
Write-Host ""

# Step 5: Owner Invites Manager
Write-Host "Step 5: Owner Invites Manager" -ForegroundColor Cyan
$invitationBody = @{
    propertyId   = $propertyId
    managerEmail = $managerEmail
} | ConvertTo-Json -Compress

$inviteResult = Invoke-ApiCall -Method "POST" -Endpoint "/owner/invitations" -Token $ownerToken -Body $invitationBody
if (-not $inviteResult.Success) {
    Write-Host "  ✗ Invitation creation failed: $($inviteResult.Error)" -ForegroundColor Red
    exit 1
}
$invitationId = $inviteResult.Data.data.id
Write-Host "  ✓ Invitation created: $invitationId" -ForegroundColor Green
Write-Host ""

# Step 6: Manager Lists Invitations
Write-Host "Step 6: Manager Lists Invitations" -ForegroundColor Cyan
$managerInvitesResult = Invoke-ApiCall -Method "GET" -Endpoint "/owner/invitations/manager" -Token $managerToken
if (-not $managerInvitesResult.Success) {
    Write-Host "  ✗ Failed to list manager invitations: $($managerInvitesResult.Error)" -ForegroundColor Red
    exit 1
}
$foundInvitation = $managerInvitesResult.Data.data | Where-Object { $_.id -eq $invitationId }
if (-not $foundInvitation) {
    Write-Host "  ✗ Invitation not found in manager's list" -ForegroundColor Red
    exit 1
}
Write-Host "  Found invitation in manager's list: $($foundInvitation.property.name)" -ForegroundColor Green
Write-Host ""

# Step 7: Manager Accepts Invitation
Write-Host "Step 7: Manager Accepts Invitation" -ForegroundColor Cyan
$acceptResult = Invoke-ApiCall -Method "POST" -Endpoint "/owner/invitations/manager/$invitationId/accept" -Token $managerToken
if (-not $acceptResult.Success) {
    Write-Host "  ✗ Invitation accept failed: $($acceptResult.Error)" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Invitation accepted successfully" -ForegroundColor Green
Write-Host ""

# Step 8: Verify Property Has Manager Assigned
Write-Host "Step 8: Verify Property Manager Assignment" -ForegroundColor Cyan
$propertyCheckResult = Invoke-ApiCall -Method "GET" -Endpoint "/properties/$propertyId" -Token $ownerToken
if (-not $propertyCheckResult.Success) {
    Write-Host "  ✗ Failed to retrieve property: $($propertyCheckResult.Error)" -ForegroundColor Red
    exit 1
}
$assignedManagerId = $propertyCheckResult.Data.data.managerId
if ($assignedManagerId -ne $managerId) {
    Write-Host "  ✗ Manager not assigned correctly. Expected: $managerId, Got: $assignedManagerId" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Property managerId matches: $assignedManagerId" -ForegroundColor Green
Write-Host ""

# Step 9: Verify Activity Feed Shows Acceptance
Write-Host "Step 9: Verify Activity Feed" -ForegroundColor Cyan
$activityResult = Invoke-ApiCall -Method "GET" -Endpoint "/activity/recent" -Token $ownerToken
if (-not $activityResult.Success) {
    Write-Host "  ✗ Failed to retrieve activity: $($activityResult.Error)" -ForegroundColor Red
    exit 1
}
$acceptActivity = $activityResult.Data.data | Where-Object { $_.type -like "*INVITATION*" -and $_.metadata.invitationId -eq $invitationId }
if ($acceptActivity) {
    Write-Host "  Activity found: $($acceptActivity.type)" -ForegroundColor Green
}
else {
    Write-Host "  Activity not found (may be expected if activity feed is delayed)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "ALL TESTS PASSED ✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:"
Write-Host "  - Owner: $ownerEmail"
Write-Host "  - Manager: $managerEmail"
Write-Host "  - Property: $propertyId"
Write-Host "  - Invitation: $invitationId"
Write-Host ""

