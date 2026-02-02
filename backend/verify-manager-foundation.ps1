# Manager-Side Foundation Verification Script
# Run after: npx prisma migrate dev --name add_property_manager
#            npx ts-node prisma/backfill-property-manager.ts

$baseUrl = "http://localhost:3001/api"
$testResults = @()

Write-Host "=== Manager-Side Foundation Verification ===" -ForegroundColor Cyan
Write-Host ""

# ============================
# STEP 1: Create Manager A and Manager B (or login existing)
# ============================

# For this test, we assume managers exist. If not, create them first via seed or registration.
# For now, we'll use hardcoded credentials - adjust as needed.

$managerAEmail = "manager-a@test.com"
$managerAPassword = "Manager123!"
$managerBEmail = "manager-b@test.com"
$managerBPassword = "Manager123!"

Write-Host "Step 1: Login Manager A and Manager B" -ForegroundColor Yellow

# Login Manager A
$loginBodyA = '{"email":"' + $managerAEmail + '","password":"' + $managerAPassword + '"}'
$loginBodyA | Out-File ".\login-a.json" -Encoding utf8
$loginRespA = curl.exe -s -X POST "$baseUrl/auth/login" -H "Content-Type: application/json" --data-binary "@login-a.json" | ConvertFrom-Json
$tokenA = $loginRespA.data.token

if (-not $tokenA) {
    Write-Host "ERROR: Manager A login failed. Create managers first with seed script." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Manager A logged in (token obtained)" -ForegroundColor Green

# Login Manager B
$loginBodyB = '{"email":"' + $managerBEmail + '","password":"' + $managerBPassword + '"}'
$loginBodyB | Out-File ".\login-b.json" -Encoding utf8
$loginRespB = curl.exe -s -X POST "$baseUrl/auth/login" -H "Content-Type: application/json" --data-binary "@login-b.json" | ConvertFrom-Json
$tokenB = $loginRespB.data.token

if (-not $tokenB) {
    Write-Host "ERROR: Manager B login failed. Create managers first with seed script." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Manager B logged in (token obtained)" -ForegroundColor Green

# ============================
# STEP 2: Manager A creates a property
# ============================

Write-Host "`nStep 2: Manager A creates a property" -ForegroundColor Yellow

$propertyBody = @{
    name = "Manager A Property"
    location = "Kampala, Nakasero"
    units = @(
        @{ unitNumber = "101"; rentAmount = 1200000 }
        @{ unitNumber = "102"; rentAmount = 1400000 }
    )
} | ConvertTo-Json -Depth 3

$propertyBody | Out-File ".\property-a.json" -Encoding utf8
$createResp = curl.exe -s -X POST "$baseUrl/properties" `
    -H "Authorization: Bearer $tokenA" `
    -H "Content-Type: application/json" `
    --data-binary "@property-a.json" | ConvertFrom-Json

$propertyId = $createResp.data.id
$managerIdInResponse = $createResp.data.managerId

if (-not $propertyId) {
    Write-Host "ERROR: Failed to create property" -ForegroundColor Red
    Write-Host "Response: $(ConvertTo-Json $createResp)"
    exit 1
}

Write-Host "  ✓ Property created with ID: $propertyId" -ForegroundColor Green

# ============================
# STEP 3: Verify managerId is set to Manager A
# ============================

Write-Host "`nStep 3: Verify managerId is set to Manager A" -ForegroundColor Yellow

if ($managerIdInResponse -eq $loginRespA.data.user.id) {
    Write-Host "  ✓ managerId correctly set to Manager A ($managerIdInResponse)" -ForegroundColor Green
    $testResults += [PSCustomObject]@{ Test = "Property managerId set correctly"; Pass = $true; Detail = "managerId = $managerIdInResponse" }
} else {
    Write-Host "  ✗ FAILED: managerId is $managerIdInResponse, expected $($loginRespA.data.user.id)" -ForegroundColor Red
    $testResults += [PSCustomObject]@{ Test = "Property managerId set correctly"; Pass = $false; Detail = "Expected: $($loginRespA.data.user.id), Got: $managerIdInResponse" }
}

# ============================
# STEP 4: Manager A can view their property
# ============================

Write-Host "`nStep 4: Manager A can view their property" -ForegroundColor Yellow

$getRespA = curl.exe -s -X GET "$baseUrl/properties/$propertyId" `
    -H "Authorization: Bearer $tokenA" `
    -H "Content-Type: application/json" | ConvertFrom-Json

if ($getRespA.success -eq $true -and $getRespA.data.id -eq $propertyId) {
    Write-Host "  ✓ Manager A can view their property" -ForegroundColor Green
    $testResults += [PSCustomObject]@{ Test = "Manager A can view own property"; Pass = $true; Detail = "Property ID: $propertyId" }
} else {
    Write-Host "  ✗ FAILED: Manager A cannot view property" -ForegroundColor Red
    Write-Host "Response: $(ConvertTo-Json $getRespA)"
    $testResults += [PSCustomObject]@{ Test = "Manager A can view own property"; Pass = $false; Detail = "Response: $(ConvertTo-Json $getRespA)" }
}

# ============================
# STEP 5: Manager B cannot access Manager A's property (403 expected)
# ============================

Write-Host "`nStep 5: Manager B cannot access Manager A's property (403 expected)" -ForegroundColor Yellow

$getRespB = curl.exe -s -w "%{http_code}" -X GET "$baseUrl/properties/$propertyId" `
    -H "Authorization: Bearer $tokenB" `
    -H "Content-Type: application/json"

# Extract status code from response (curl -w appends it at the end)
$statusCode = $getRespB.Substring($getRespB.Length - 3)
$body = $getRespB.Substring(0, $getRespB.Length - 3) | ConvertFrom-Json

if ($statusCode -eq "403") {
    Write-Host "  ✓ Manager B gets 403 (access denied) - no existence leak" -ForegroundColor Green
    $testResults += [PSCustomObject]@{ Test = "Manager B blocked from A's property (403)"; Pass = $true; Detail = "HTTP 403" }
} else {
    Write-Host "  ✗ FAILED: Expected 403, got $statusCode" -ForegroundColor Red
    $testResults += [PSCustomObject]@{ Test = "Manager B blocked from A's property (403)"; Pass = $false; Detail = "Expected: 403, Got: $statusCode" }
}

# ============================
# STEP 6: Manager A's property list includes the new property
# ============================

Write-Host "`nStep 6: Manager A's property list includes the new property" -ForegroundColor Yellow

$listRespA = curl.exe -s -X GET "$baseUrl/properties" `
    -H "Authorization: Bearer $tokenA" `
    -H "Content-Type: application/json" | ConvertFrom-Json

$foundProperty = $listRespA.data | Where-Object { $_.id -eq $propertyId }

if ($foundProperty) {
    Write-Host "  ✓ Property found in Manager A's list" -ForegroundColor Green
    $testResults += [PSCustomObject]@{ Test = "Property in Manager A's list"; Pass = $true; Detail = "Property ID: $propertyId" }
} else {
    Write-Host "  ✗ FAILED: Property not in Manager A's list" -ForegroundColor Red
    $testResults += [PSCustomObject]@{ Test = "Property in Manager A's list"; Pass = $false; Detail = "Property ID: $propertyId not found" }
}

# ============================
# STEP 7: Manager B's property list does NOT include Manager A's property
# ============================

Write-Host "`nStep 7: Manager B's property list does NOT include Manager A's property" -ForegroundColor Yellow

$listRespB = curl.exe -s -X GET "$baseUrl/properties" `
    -H "Authorization: Bearer $tokenB" `
    -H "Content-Type: application/json" | ConvertFrom-Json

$foundInB = $listRespB.data | Where-Object { $_.id -eq $propertyId }

if (-not $foundInB) {
    Write-Host "  ✓ Property correctly NOT in Manager B's list" -ForegroundColor Green
    $testResults += [PSCustomObject]@{ Test = "Property NOT in Manager B's list"; Pass = $true; Detail = "Property ID: $propertyId not in B's list" }
} else {
    Write-Host "  ✗ FAILED: Property found in Manager B's list (isolation breach!)" -ForegroundColor Red
    $testResults += [PSCustomObject]@{ Test = "Property NOT in Manager B's list"; Pass = $false; Detail = "Property ID: $propertyId found in B's list" }
}

# ============================
# STEP 8: Tenant regression test (ensure tenant still works)
# ============================

Write-Host "`nStep 8: Tenant regression test" -ForegroundColor Yellow

$tenantLogin = '{"email":"tenant@test.com","password":"Test123!"}'
$tenantLogin | Out-File ".\login-tenant.json" -Encoding utf8
$tenantResp = curl.exe -s -X POST "$baseUrl/auth/login" -H "Content-Type: application/json" --data-binary "@login-tenant.json" | ConvertFrom-Json
$tenantToken = $tenantResp.data.token

if ($tenantToken) {
    Write-Host "  ✓ Tenant logged in" -ForegroundColor Green
    
    # Tenant properties endpoint (should still work)
    $tenantProps = curl.exe -s -X GET "$baseUrl/properties" `
        -H "Authorization: Bearer $tenantToken" `
        -H "Content-Type: application/json" | ConvertFrom-Json
    
    if ($tenantProps.success -eq $true) {
        Write-Host "  ✓ Tenant GET /properties returns 200" -ForegroundColor Green
        $testResults += [PSCustomObject]@{ Test = "Tenant regression: GET /properties"; Pass = $true; Detail = "Array count: $($tenantProps.data.Count)" }
    } else {
        Write-Host "  ✗ FAILED: Tenant GET /properties failed" -ForegroundColor Red
        $testResults += [PSCustomObject]@{ Test = "Tenant regression: GET /properties"; Pass = $false; Detail = "Response: $(ConvertTo-Json $tenantProps)" }
    }
    
    # Tenant identities endpoint
    $tenantIdentity = curl.exe -s -X GET "$baseUrl/identities/me" `
        -H "Authorization: Bearer $tenantToken" `
        -H "Content-Type: application/json" | ConvertFrom-Json
    
    if ($tenantIdentity.success -eq $true) {
        Write-Host "  ✓ Tenant GET /identities/me returns 200" -ForegroundColor Green
        $testResults += [PSCustomObject]@{ Test = "Tenant regression: GET /identities/me"; Pass = $true; Detail = "Tenant ID: $($tenantIdentity.data.tenantId)" }
    } else {
        Write-Host "  ✗ FAILED: Tenant GET /identities/me failed" -ForegroundColor Red
        $testResults += [PSCustomObject]@{ Test = "Tenant regression: GET /identities/me"; Pass = $false; Detail = "Response: $(ConvertTo-Json $tenantIdentity)" }
    }
} else {
    Write-Host "  ⚠ Tenant login failed (may not exist)" -ForegroundColor Yellow
    $testResults += [PSCustomObject]@{ Test = "Tenant regression: login"; Pass = $false; Detail = "Tenant login failed" }
}

# ============================
# FINAL REPORT
# ============================

Write-Host "`n=== Verification Results ===" -ForegroundColor Cyan
$testResults | Format-Table -AutoSize

$passed = ($testResults | Where-Object { $_.Pass }).Count
$failed = ($testResults | Where-Object { -not $_.Pass }).Count

Write-Host "`nTotal: $($testResults.Count), Passed: $passed, Failed: $failed" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`n✅ ALL TESTS PASS - Manager-side foundation is working correctly!" -ForegroundColor Green
} else {
    Write-Host "`n❌ SOME TESTS FAILED - Review the failures above" -ForegroundColor Red
}

# Cleanup
Remove-Item ".\login-a.json", ".\login-b.json", ".\login-tenant.json", ".\property-a.json" -ErrorAction SilentlyContinue
