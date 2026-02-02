# Verify Manager Units CRUD with Ownership Checks
# This script verifies that:
# 1. Manager A can create/update/delete units on their property
# 2. Manager B cannot update/delete Manager A's units (gets 403)

param(
    [string]$BaseUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Manager Units CRUD Verification ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Helper function to login and get token
function Get-AuthToken($email, $password) {
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

# Helper function for API calls
function Invoke-ApiCall($method, $endpoint, $token, $body = $null) {
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

$managerAEmail = "manager_a@test.com"
$managerBEmail = "manager_b@test.com"
$password = "password123"

# Step 1: Login as Manager A
Write-Host "Step 1: Logging in as Manager A..." -ForegroundColor Yellow
$tokenA = Get-AuthToken $managerAEmail $password
if (-not $tokenA) { Write-Host "[FAIL] Could not login as Manager A" -ForegroundColor Red; exit 1 }
Write-Host "[PASS] Logged in as Manager A" -ForegroundColor Green

# Step 2: Create property as Manager A
Write-Host ""
Write-Host "Step 2: Creating property as Manager A..." -ForegroundColor Yellow
$propertyData = @{ name = "Test Property for Units"; location = "Test Location"; units = @() }
$propertyResult = Invoke-ApiCall "POST" "/api/properties" $tokenA $propertyData
if (-not $propertyResult.success) { Write-Host "[FAIL] Could not create property" -ForegroundColor Red; exit 1 }
$propertyId = $propertyResult.data.id
Write-Host "[PASS] Created property: $($propertyResult.data.name) (ID: $propertyId)" -ForegroundColor Green

# Step 3: Create unit as Manager A
Write-Host ""
Write-Host "Step 3: Creating unit as Manager A..." -ForegroundColor Yellow
$unitData = @{ unitNumber = "101"; rentAmount = 1000000 }
$unitResult = Invoke-ApiCall "POST" "/api/properties/$propertyId/units" $tokenA $unitData
if (-not $unitResult.success) { Write-Host "[FAIL] Could not create unit: $($unitResult.error)" -ForegroundColor Red; exit 1 }
$unitId = $unitResult.data.id
Write-Host "[PASS] Created unit: $($unitResult.data.unitNumber) (ID: $unitId)" -ForegroundColor Green

# Step 4: Update unit as Manager A
Write-Host ""
Write-Host "Step 4: Updating unit as Manager A..." -ForegroundColor Yellow
$updateData = @{ rentAmount = 1200000 }
$updateResult = Invoke-ApiCall "PATCH" "/api/units/$unitId" $tokenA $updateData
if (-not $updateResult.success) { 
    Write-Host "[FAIL] Could not update unit. Response: $($updateResult | ConvertTo-Json)" -ForegroundColor Red
    exit 1 
}
Write-Host "[PASS] Updated unit rent to: $($updateResult.data.rentAmount)" -ForegroundColor Green

# Step 5: Login as Manager B
Write-Host ""
Write-Host "Step 5: Logging in as Manager B..." -ForegroundColor Yellow
$tokenB = Get-AuthToken $managerBEmail $password
if (-not $tokenB) { Write-Host "[FAIL] Could not login as Manager B" -ForegroundColor Red; exit 1 }
Write-Host "[PASS] Logged in as Manager B" -ForegroundColor Green

# Step 6: Manager B tries to update Manager A's unit (expect 403)
Write-Host ""
Write-Host "Step 6: Manager B attempting to update Manager A's unit (expect 403)..." -ForegroundColor Yellow
$bUpdateData = @{ rentAmount = 999999 }
$bUpdateResult = Invoke-ApiCall "PATCH" "/api/units/$unitId" $tokenB $bUpdateData
if ($bUpdateResult.statusCode -eq 403) {
    Write-Host "[PASS] Manager B correctly received 403 when updating" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] Expected 403, got: $($bUpdateResult.statusCode)" -ForegroundColor Red
    exit 1
}

# Step 7: Manager B tries to delete Manager A's unit (expect 403)
Write-Host ""
Write-Host "Step 7: Manager B attempting to delete Manager A's unit (expect 403)..." -ForegroundColor Yellow
$bDeleteResult = Invoke-ApiCall "DELETE" "/api/units/$unitId" $tokenB
if ($bDeleteResult.statusCode -eq 403) {
    Write-Host "[PASS] Manager B correctly received 403 when deleting" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] Expected 403, got: $($bDeleteResult.statusCode)" -ForegroundColor Red
    exit 1
}

# Step 8: Manager A deletes their own unit
Write-Host ""
Write-Host "Step 8: Manager A deleting their own unit..." -ForegroundColor Yellow
$deleteResult = Invoke-ApiCall "DELETE" "/api/units/$unitId" $tokenA
if (-not $deleteResult.success) { Write-Host "[FAIL] Could not delete unit" -ForegroundColor Red; exit 1 }
Write-Host "[PASS] Manager A successfully deleted their unit" -ForegroundColor Green

# Step 9: Cleanup - Delete test property
Write-Host ""
Write-Host "Step 9: Cleaning up test property..." -ForegroundColor Yellow
$delPropResult = Invoke-ApiCall "DELETE" "/api/properties/$propertyId" $tokenA
if ($delPropResult.success) {
    Write-Host "[PASS] Cleaned up test property" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[PASS] Manager Units CRUD: All ownership checks working" -ForegroundColor Green
Write-Host ""
Write-Host "Verified behaviors:" -ForegroundColor Gray
Write-Host "  - Manager A can create units on their property" -ForegroundColor Gray
Write-Host "  - Manager A can update their own units" -ForegroundColor Gray
Write-Host "  - Manager B cannot update Manager A's units (403)" -ForegroundColor Gray
Write-Host "  - Manager B cannot delete Manager A's units (403)" -ForegroundColor Gray
Write-Host "  - Manager A can delete their own units" -ForegroundColor Gray

exit 0
