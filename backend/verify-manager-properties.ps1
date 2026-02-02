# Verify Manager Property CRUD
# This script verifies that:
# 1. Manager A can create and view their properties
# 2. Manager B cannot see Manager A's properties
# 3. Manager B gets 403 when trying to access Manager A's property

param(
    [string]$BaseUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Manager Property CRUD Verification ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Helper function to login and get token
function Login-User($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $body
        if ($response.success) {
            return $response.data.token
        }
        return $null
    }
    catch {
        Write-Host "  Login failed: $_" -ForegroundColor Red
        return $null
    }
}

# Helper function to make authenticated request
function Invoke-ApiRequest($method, $endpoint, $token, $body = $null) {
    $headers = @{ Authorization = "Bearer $token" }
    try {
        if ($body) {
            $jsonBody = $body | ConvertTo-Json
            return Invoke-RestMethod -Uri "$BaseUrl$endpoint" -Method $method -Headers $headers -ContentType "application/json" -Body $jsonBody
        }
        else {
            return Invoke-RestMethod -Uri "$BaseUrl$endpoint" -Method $method -Headers $headers
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        return @{ success = $false; statusCode = $statusCode; error = $_.Exception.Message }
    }
}

# Test credentials
$managerAEmail = "manager_a@test.com"
$managerBEmail = "manager_b@test.com"
$password = "password123"

# Step 1: Login as Manager A
Write-Host "Step 1: Logging in as Manager A ($managerAEmail)..." -ForegroundColor Yellow
$tokenA = Login-User $managerAEmail $password
if (-not $tokenA) {
    Write-Host "  [FAIL] Could not login as Manager A" -ForegroundColor Red
    exit 1
}
Write-Host "  [PASS] Logged in as Manager A" -ForegroundColor Green

# Step 2: Create a property as Manager A
Write-Host ""
Write-Host "Step 2: Creating property as Manager A..." -ForegroundColor Yellow
$propertyData = @{
    name     = "Manager A Test Property"
    location = "Test Location A"
    units    = @(
        @{ unitNumber = "101"; rentAmount = 1000000 }
    )
}
$createResult = Invoke-ApiRequest "POST" "/api/properties" $tokenA $propertyData
if (-not $createResult.success) {
    Write-Host "  [FAIL] Could not create property: $($createResult.error)" -ForegroundColor Red
    exit 1
}
$propertyId = $createResult.data.id
Write-Host "  [PASS] Created property: $($createResult.data.name) (ID: $propertyId)" -ForegroundColor Green

# Step 3: List properties as Manager A
Write-Host ""
Write-Host "Step 3: Listing properties as Manager A..." -ForegroundColor Yellow
$listResultA = Invoke-ApiRequest "GET" "/api/properties" $tokenA
if (-not $listResultA.success) {
    Write-Host "  [FAIL] Could not list properties: $($listResultA.error)" -ForegroundColor Red
    exit 1
}
$managerAProperties = @($listResultA.data | Where-Object { $_.id -eq $propertyId })
if ($managerAProperties.Count -eq 1) {
    Write-Host "  [PASS] Manager A can see their property in the list" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] Manager A cannot see their property" -ForegroundColor Red
    exit 1
}

# Step 4: Login as Manager B
Write-Host ""
Write-Host "Step 4: Logging in as Manager B ($managerBEmail)..." -ForegroundColor Yellow
$tokenB = Login-User $managerBEmail $password
if (-not $tokenB) {
    Write-Host "  [FAIL] Could not login as Manager B" -ForegroundColor Red
    exit 1
}
Write-Host "  [PASS] Logged in as Manager B" -ForegroundColor Green

# Step 5: List properties as Manager B
Write-Host ""
Write-Host "Step 5: Listing properties as Manager B..." -ForegroundColor Yellow
$listResultB = Invoke-ApiRequest "GET" "/api/properties" $tokenB
if (-not $listResultB.success) {
    Write-Host "  [FAIL] Could not list properties: $($listResultB.error)" -ForegroundColor Red
    exit 1
}
$managerBProperties = @($listResultB.data | Where-Object { $_.id -eq $propertyId })
if ($managerBProperties.Count -eq 0) {
    Write-Host "  [PASS] Manager B cannot see Manager A's property (isolation working)" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] Manager B can see Manager A's property (isolation broken)" -ForegroundColor Red
    exit 1
}

# Step 6: Manager B tries to access Manager A's property (should get 403)
Write-Host ""
Write-Host "Step 6: Manager B attempting to access Manager A's property (expect 403)..." -ForegroundColor Yellow
$accessResult = Invoke-ApiRequest "GET" "/api/properties/$propertyId" $tokenB
if ($accessResult.statusCode -eq 403) {
    Write-Host "  [PASS] Manager B correctly received 403 (access denied)" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] Expected 403, got: $($accessResult.statusCode)" -ForegroundColor Red
    exit 1
}

# Step 7: Manager A can still access their property
Write-Host ""
Write-Host "Step 7: Manager A accessing their own property..." -ForegroundColor Yellow
$accessResultA = Invoke-ApiRequest "GET" "/api/properties/$propertyId" $tokenA
if ($accessResultA.success -and $accessResultA.data.id -eq $propertyId) {
    Write-Host "  [PASS] Manager A can access their own property" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] Manager A cannot access their own property" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[PASS] Manager Property CRUD: All tests passed" -ForegroundColor Green
Write-Host ""
Write-Host "Verified behaviors:" -ForegroundColor Gray
Write-Host "  - Manager A can create properties" -ForegroundColor Gray
Write-Host "  - Manager A can list their own properties" -ForegroundColor Gray
Write-Host "  - Manager B cannot see Manager A's properties" -ForegroundColor Gray
Write-Host "  - Manager B gets 403 when accessing Manager A's property" -ForegroundColor Gray
Write-Host "  - Manager A can access their own property" -ForegroundColor Gray

exit 0
