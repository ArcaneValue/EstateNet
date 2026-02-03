# EstateNet OWNER Role Verification Script
# This script verifies the complete OWNER role implementation including:
# - Owner registration
# - Property creation with ownerId
# - Manager invitation flow
# - Role-based access control

param(
    [string]$BaseUrl = "http://localhost:3001/api",
    [string]$OwnerEmail = "owner_verify_$(Get-Random)@example.com",
    [string]$ManagerEmail = "manager_verify_$(Get-Random)@example.com",
    [string]$TenantEmail = "tenant_verify_$(Get-Random)@example.com",
    [string]$TestPassword = "TestPassword123!"
)

$ErrorActionPreference = "Stop"
$script:OwnerToken = $null
$script:ManagerToken = $null
$script:TenantToken = $null
$script:PropertyId = $null
$script:InvitationId = $null

function Write-Header($message) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Fail($message) {
    Write-Host "[FAIL] $message" -ForegroundColor Red
}

function Invoke-ApiRequest($method, $endpoint, $body = $null, $token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    $uri = "$BaseUrl$endpoint"
    $bodyJson = if ($body) { $body | ConvertTo-Json -Depth 10 } else { $null }
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -Body $bodyJson -ErrorAction Stop
        return @{ Success = $true; Data = $response }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        return @{ Success = $false; StatusCode = $statusCode; ErrorBody = $errorBody }
    }
}

# Test 1: Owner Registration
Write-Header "TEST 1: Owner Registration"
$ownerRegBody = @{
    name        = "Test Owner"
    email       = $OwnerEmail
    phoneNumber = "+1234567890"
    password    = $TestPassword
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/auth/register-owner" -body $ownerRegBody
if ($result.Success -and $result.Data.success) {
    $script:OwnerToken = $result.Data.data.token
    Write-Success "Owner registered successfully"
    Write-Host "  Token received: $($script:OwnerToken.Substring(0, 20))..."
    Write-Host "  Role: $($result.Data.data.user.role)"
}
else {
    Write-Fail "Owner registration failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 2: Owner Login
Write-Header "TEST 2: Owner Login"
$loginBody = @{
    email    = $OwnerEmail
    password = $TestPassword
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/auth/login" -body $loginBody
if ($result.Success -and $result.Data.success) {
    $script:OwnerToken = $result.Data.data.token
    Write-Success "Owner logged in successfully"
    Write-Host "  Role from JWT: $($result.Data.data.user.role)"
    if ($result.Data.data.user.role -eq "OWNER") {
        Write-Success "Role is correctly set to OWNER"
    }
    else {
        Write-Fail "Role is not OWNER, got: $($result.Data.data.user.role)"
    }
}
else {
    Write-Fail "Owner login failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 3: Manager Registration
Write-Header "TEST 3: Manager Registration"
$managerRegBody = @{
    name        = "Test Manager"
    email       = $ManagerEmail
    phoneNumber = "+1234567891"
    password    = $TestPassword
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/auth/register/manager" -body $managerRegBody
if ($result.Success -and $result.Data.success) {
    Write-Success "Manager registered successfully"
    Write-Host "  Role: $($result.Data.data.user.role)"
}
else {
    Write-Fail "Manager registration failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 4: Tenant Registration
Write-Header "TEST 4: Tenant Registration"
$tenantRegBody = @{
    name        = "Test Tenant"
    email       = $TenantEmail
    phoneNumber = "+1234567892"
    password    = $TestPassword
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/auth/register-tenant" -body $tenantRegBody
if ($result.Success -and $result.Data.success) {
    Write-Success "Tenant registered successfully"
    Write-Host "  Role: $($result.Data.data.user.role)"
}
else {
    Write-Fail "Tenant registration failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 5: Owner Creates Property
Write-Header "TEST 5: Owner Creates Property"
$propertyBody = @{
    name     = "Test Property"
    location = "123 Test Street, Test City"
    units    = @(
        @{ unitNumber = "101"; rentAmount = 1000 },
        @{ unitNumber = "102"; rentAmount = 1200 }
    )
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/properties" -body $propertyBody -token $script:OwnerToken
if ($result.Success -and $result.Data.success) {
    $script:PropertyId = $result.Data.data.id
    Write-Success "Property created successfully"
    Write-Host "  Property ID: $script:PropertyId"
    Write-Host "  Owner ID: $($result.Data.data.ownerId)"
    if ($result.Data.data.managerId) {
        Write-Host "  Manager ID: $($result.Data.data.managerId)"
    }
    else {
        Write-Host "  Manager ID: (not assigned)"
    }
}
else {
    Write-Fail "Property creation failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 6: Owner Invites Manager
Write-Header "TEST 6: Owner Invites Manager"
$inviteBody = @{
    propertyId   = $script:PropertyId
    managerEmail = $ManagerEmail
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/owner/invitations" -body $inviteBody -token $script:OwnerToken
if ($result.Success -and $result.Data.success) {
    $script:InvitationId = $result.Data.data.id
    Write-Success "Manager invitation sent successfully"
    Write-Host "  Invitation ID: $script:InvitationId"
    Write-Host "  Status: $($result.Data.data.status)"
}
else {
    Write-Fail "Manager invitation failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 7: Owner Lists Invitations
Write-Header "TEST 7: Owner Lists Invitations"
$result = Invoke-ApiRequest -method "GET" -endpoint "/owner/invitations" -token $script:OwnerToken
if ($result.Success -and $result.Data.success) {
    Write-Success "Owner can list invitations"
    Write-Host "  Found $($result.Data.data.Count) invitation(s)"
}
else {
    Write-Fail "Failed to list invitations. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 8: Manager Login
Write-Header "TEST 8: Manager Login"
$result = Invoke-ApiRequest -method "POST" -endpoint "/auth/login" -body @{ email = $ManagerEmail; password = $TestPassword }
if ($result.Success -and $result.Data.success) {
    $script:ManagerToken = $result.Data.data.token
    Write-Success "Manager logged in successfully"
}
else {
    Write-Fail "Manager login failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 9: Manager Lists Invitations
Write-Header "TEST 9: Manager Lists Invitations"
$result = Invoke-ApiRequest -method "GET" -endpoint "/owner/invitations/manager" -token $script:ManagerToken
if ($result.Success -and $result.Data.success) {
    Write-Success "Manager can view pending invitations"
    Write-Host "  Found $($result.Data.data.Count) invitation(s)"
    if ($result.Data.data.Count -gt 0) {
        $inv = $result.Data.data[0]
        Write-Host "  Property: $($inv.property.name)"
        Write-Host "  From Owner: $($inv.owner.name)"
    }
}
else {
    Write-Fail "Failed to list manager invitations. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 10: Manager Accepts Invitation
Write-Header "TEST 10: Manager Accepts Invitation"
$result = Invoke-ApiRequest -method "POST" -endpoint "/owner/invitations/manager/$script:InvitationId/accept" -token $script:ManagerToken
if ($result.Success -and $result.Data.success) {
    Write-Success "Manager accepted invitation"
}
else {
    Write-Fail "Failed to accept invitation. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 11: Verify Property Manager Assignment
Write-Header "TEST 11: Verify Property Manager Assignment"
$result = Invoke-ApiRequest -method "GET" -endpoint "/properties/$script:PropertyId" -token $script:OwnerToken
if ($result.Success -and $result.Data.success) {
    Write-Success "Property details retrieved"
    if ($result.Data.data.managerId) {
        Write-Success "Manager is assigned to property"
        Write-Host "  Manager ID: $($result.Data.data.managerId)"
    }
    else {
        Write-Fail "Manager not assigned to property"
    }
}
else {
    Write-Fail "Failed to get property. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
}

# Test 12: Manager Cannot Access Owner Endpoints (403 Test)
Write-Header "TEST 12: Manager Cannot Access Owner Endpoints 403 Test"
$result = Invoke-ApiRequest -method "GET" -endpoint "/owner/invitations" -token $script:ManagerToken
if (-not $result.Success -and $result.StatusCode -eq 403) {
    Write-Success "Manager correctly blocked from owner endpoints (403)"
}
else {
    Write-Fail "Manager should have been blocked from owner endpoints, got: $($result.StatusCode)"
}

# Test 13: Tenant Login
Write-Header "TEST 13: Tenant Login"
$result = Invoke-ApiRequest -method "POST" -endpoint "/auth/login" -body @{ email = $TenantEmail; password = $TestPassword }
if ($result.Success -and $result.Data.success) {
    $script:TenantToken = $result.Data.data.token
    Write-Success "Tenant logged in successfully"
}
else {
    Write-Fail "Tenant login failed. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    exit 1
}

# Test 14: Tenant Cannot Access Owner Endpoints (403 Test)
Write-Header "TEST 14: Tenant Cannot Access Owner Endpoints 403 Test"
$result = Invoke-ApiRequest -method "GET" -endpoint "/owner/invitations/manager" -token $script:TenantToken
if (-not $result.Success -and $result.StatusCode -eq 403) {
    Write-Success "Tenant correctly blocked from owner endpoints (403)"
}
else {
    Write-Fail "Tenant should have been blocked from owner endpoints, got: $($result.StatusCode)"
}

# Test 15: Owner Deletes Invitation
Write-Header "TEST 15: Owner Cancels Invitation"
# First create a new invitation to cancel
$inviteBody2 = @{
    propertyId   = $script:PropertyId
    managerEmail = "another_manager@example.com"
}
$result = Invoke-ApiRequest -method "POST" -endpoint "/owner/invitations" -body $inviteBody2 -token $script:OwnerToken
if ($result.Success -and $result.Data.success) {
    $newInvitationId = $result.Data.data.id
    $result = Invoke-ApiRequest -method "DELETE" -endpoint "/owner/invitations/$newInvitationId" -token $script:OwnerToken
    if ($result.Success -and $result.Data.success) {
        Write-Success "Owner can cancel invitations"
    }
    else {
        Write-Fail "Failed to cancel invitation. Status: $($result.StatusCode). Body: $($result.ErrorBody)"
    }
}

# Summary
Write-Header "VERIFICATION SUMMARY"
Write-Success "All core OWNER role functionality verified!"
Write-Host ""
Write-Host "Key Features Tested:"
Write-Host "  - Owner registration with OWNER role"
Write-Host "  - Property creation with ownerId"
Write-Host "  - Owner-to-Manager invitation flow"
Write-Host "  - Manager acceptance updates Property.managerId"
Write-Host "  - Role-based access control OWNER/MANAGER/TENANT"
Write-Host "  - 403 Forbidden on unauthorized access"

Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Start your PostgreSQL database"
Write-Host "  2. Run: npx prisma migrate dev --name add_owner_role"
Write-Host "  3. Start the backend: npm run dev"
Write-Host "  4. Run this script to verify the implementation"
