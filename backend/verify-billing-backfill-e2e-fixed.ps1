# === Production-Safe Billing Scheduler Backfill E2E ===
param(
    [string]$BackendUrl = "http://localhost:3001",
    [string]$Verbose = $false
)

Write-Host "Backend URL: $BackendUrl" -ForegroundColor Cyan

# Helper function for test results
function Test-Result {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $color = if ($Passed) { "Green" } else { "Red" }
    
    Write-Host "[$status] $TestName" -ForegroundColor $color
    if ($Details) {
        Write-Host "    $Details" -ForegroundColor Gray
    }
    
    return $Passed
}

# Helper function for HTTP requests
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Token = "",
        [string]$Body = ""
    )
    
    try {
        $headers = @{}
        $headers["Content-Type"] = "application/json"
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        # Build curl command
        $headerArgs = $headers.GetEnumerator() | ForEach-Object { "-H", "$($_.Key): $($_.Value)" }
        
        if ($Body) {
            # Check if Body is a file path
            if ($Body -is [string] -and (Test-Path $Body)) {
                $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" @headerArgs -d "@$Body"
            } else {
                $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" @headerArgs -d $Body
            }
        } else {
            $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" @headerArgs
        }
        
        $statusCode = $response.Substring($response.Length - 3)
        $body = $response.Substring(0, $response.Length - 3)
        
        return @{
            StatusCode = [int]$statusCode
            Body       = $body | ConvertFrom-Json -ErrorAction SilentlyContinue
            RawBody    = $body
        }
    }
    catch {
        return @{
            StatusCode = 0
            Body       = $null
            RawBody    = $_.Exception.Message
        }
    }
}

# Helper function for SQL queries via Docker exec using temp files
function Invoke-Sql {
    param([string]$Query)
    
    try {
        # Create temp SQL file with UTF-8 encoding
        $tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
        $Query | Out-File -FilePath $tempSqlFile -Encoding UTF8
        
        # Copy to container and execute
        docker cp $tempSqlFile estatenet-postgres:/tmp/query.sql 2>$null
        $result = docker exec estatenet-postgres psql -U estatenet -d estatenet_db -f /tmp/query.sql 2>&1
        
        # Cleanup
        Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
        
        return $result
    }
    catch {
        return "ERROR: $($_.Exception.Message)"
    }
}

# Test 1: Backend Health Check
Write-Host "`n1. Backend Health Check" -ForegroundColor Yellow
$healthResponse = Invoke-Api -Method "GET" -Endpoint "/health"
$healthPassed = Test-Result "Backend reachable" ($healthResponse.StatusCode -eq 200) "Status: $($healthResponse.StatusCode)"

# Test 2: Database Connectivity
Write-Host "`n2. Database Connectivity" -ForegroundColor Yellow
$dbVersion = Invoke-Sql "SELECT version();"
$dbPassed = Test-Result "Database reachable" ($dbVersion -and $dbVersion.Length -gt 0) "PostgreSQL version retrieved"
if (-not $dbPassed) {
    Write-Host "❌ Database not reachable. Please check PostgreSQL connection." -ForegroundColor Red
    exit 1
}

# Test 3: Create test OWNER (for scheduler access)
Write-Host "`n3. Create Test Owner" -ForegroundColor Yellow
$ownerEmail = "test-owner-$(Get-Random -Maximum 9999)@example.com"

# Create JSON file for owner registration to avoid PowerShell escaping issues
$ownerJson = @{
    name        = "Test Owner"
    email       = $ownerEmail
    phoneNumber = "+256700000000"
    password    = "TestPassword123"
} | ConvertTo-Json -Depth 10

$tempOwnerFile = [System.IO.Path]::GetTempFileName() + ".json"
$ownerJson | Out-File -FilePath $tempOwnerFile -Encoding UTF8

$ownerResponse = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-owner" -Body $tempOwnerFile
Remove-Item $tempOwnerFile -ErrorAction SilentlyContinue

$ownerCreated = Test-Result "Owner creation" ($ownerResponse.StatusCode -eq 201) "Email: $ownerEmail"

if ($ownerCreated) {
    $ownerToken = $ownerResponse.Body.data.token
    $ownerId = $ownerResponse.Body.data.user.id
    Write-Host "    Owner ID: $ownerId" -ForegroundColor Gray
}

# Test 4: Create test MANAGER (for property/unit management)
Write-Host "`n4. Create Test Manager" -ForegroundColor Yellow
$managerEmail = "test-manager-$(Get-Random -Maximum 9999)@example.com"

# Create JSON file for manager registration to avoid PowerShell escaping issues
$managerJson = @{
    name        = "Test Manager"
    email       = $managerEmail
    phoneNumber = "+256700000000"
    password    = "TestPassword123"
} | ConvertTo-Json -Depth 10

$tempManagerFile = [System.IO.Path]::GetTempFileName() + ".json"
$managerJson | Out-File -FilePath $tempManagerFile -Encoding UTF8

$managerResponse = Invoke-Api -Method "POST" -Endpoint "/api/auth/register/manager" -Body $tempManagerFile
Remove-Item $tempManagerFile -ErrorAction SilentlyContinue

$managerCreated = Test-Result "Manager creation" ($managerResponse.StatusCode -eq 201) "Email: $managerEmail"

if ($managerCreated) {
    $managerToken = $managerResponse.Body.data.token
    $managerId = $managerResponse.Body.data.user.id
    Write-Host "    Manager ID: $managerId" -ForegroundColor Gray
}

# Test 5: Accept manager terms
Write-Host "`n5. Accept Manager Terms" -ForegroundColor Yellow
$termsResponse = Invoke-Api -Method "POST" -Endpoint "/api/manager/terms/accept" -Token $managerToken
$termsAccepted = Test-Result "Terms acceptance" ($termsResponse.StatusCode -eq 200)

# Update token with refreshed one after terms acceptance
if ($termsAccepted) {
    $managerToken = $termsResponse.Body.data.token
    Write-Host "    Updated token after terms acceptance" -ForegroundColor Gray
}

# Test 6: Create test property with unit
Write-Host "`n6. Create Test Property" -ForegroundColor Yellow
$propertyData = @{
    name        = "Test Property $(Get-Random -Maximum 999)"
    location    = "Test Address, Kampala"
    description = "Test property for billing verification"
} | ConvertTo-Json -Depth 10

$tempPropertyFile = [System.IO.Path]::GetTempFileName() + ".json"
$propertyData | Out-File -FilePath $tempPropertyFile -Encoding UTF8

$propertyResponse = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $tempPropertyFile
Remove-Item $tempPropertyFile -ErrorAction SilentlyContinue

$propertyCreated = Test-Result "Property creation" ($propertyResponse.StatusCode -eq 201)

if ($propertyCreated) {
    $propertyId = $propertyResponse.Body.data.id
    Write-Host "    Property ID: $propertyId" -ForegroundColor Gray
}

# Test 7: Create test unit
Write-Host "`n7. Create Test Unit" -ForegroundColor Yellow
if ($propertyId) {
    $unitData = @{
        unitNumber = "A$(Get-Random -Maximum 99)"
        type       = "RESIDENTIAL"
        bedrooms   = 2
        bathrooms  = 1
        rentAmount = 500000
        status     = "AVAILABLE"
    } | ConvertTo-Json -Depth 10

    $tempUnitFile = [System.IO.Path]::GetTempFileName() + ".json"
    $unitData | Out-File -FilePath $tempUnitFile -Encoding UTF8

    $unitResponse = Invoke-Api -Method "POST" -Endpoint "/api/properties/$propertyId/units" -Token $managerToken -Body $tempUnitFile
    Remove-Item $tempUnitFile -ErrorAction SilentlyContinue

    $unitCreated = Test-Result "Unit creation" ($unitResponse.StatusCode -eq 201)

    if ($unitCreated) {
        $unitId = $unitResponse.Body.data.id
        Write-Host "    Unit ID: $unitId" -ForegroundColor Gray
    } else {
        Write-Host "    Debug: Unit response = $($unitResponse.RawBody)" -ForegroundColor Gray
    }
} else {
    Write-Host "    Skipping unit creation - no property ID" -ForegroundColor Yellow
    $unitCreated = $false
}

# Test 8: Create historical gap (simulate 3 months ago)
Write-Host "`n8. Create Historical Invoice Gap" -ForegroundColor Yellow
$threeMonthsAgo = (Get-Date).AddMonths(-3).ToString("yyyy-MM-01")
$gapQuery = @"
INSERT INTO invoices ("id", "managerId", "periodStart", "periodEnd", "subtotalAmount", "feeRateBps", "feeAmount", "status", "dueDate", "createdAt", "updatedAt")
VALUES (
    'test-invoice-$(Get-Random -Maximum 9999)',
    '$managerId',
    '$threeMonthsAgo',
    '$((Get-Date).AddMonths(-2).ToString("yyyy-MM-28"))',
    500000,
    399,
    500,
    'PAID',
    '$((Get-Date).AddMonths(-1).ToString("yyyy-MM-dd"))',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;
"@

$gapCreated = Invoke-Sql $gapQuery
$gapPassed = Test-Result "Historical gap created" ($gapCreated -and $gapCreated -ne "ERROR")

# Test 9: Run scheduler backfill
Write-Host "`n9. Run Scheduler Backfill" -ForegroundColor Yellow
$schedulerResponse = Invoke-Api -Method "POST" -Endpoint "/api/manager/billing/scheduler/run" -Token $ownerToken
$schedulerRun = Test-Result "Scheduler backfill executed" ($schedulerResponse.StatusCode -eq 200)

if ($schedulerRun) {
    Write-Host "    Invoices created: $($schedulerResponse.Body.invoicesCreatedCount)" -ForegroundColor Gray
} else {
    Write-Host "    Debug: Scheduler response = $($schedulerResponse.RawBody)" -ForegroundColor Gray
}

# Test 10: Verify backfill invoices created
Write-Host "`n10. Verify Backfill Invoices" -ForegroundColor Yellow
$invoiceCountQuery = "SELECT COUNT(*) FROM invoices WHERE `"managerId`" = '$managerId' AND `"status`" = 'DUE'"
$invoiceCount = Invoke-Sql $invoiceCountQuery
$invoicesVerified = Test-Result "Backfill invoices exist" ([int]$invoiceCount -gt 0) "Count: $invoiceCount"

# Test 11: Verify no duplicates
Write-Host "`n11. Verify No Duplicates" -ForegroundColor Yellow
$duplicateQuery = @"
SELECT `"managerId`",`"periodStart`",`"periodEnd`",COUNT(*)
FROM invoices
GROUP BY `"managerId`",`"periodStart`",`"periodEnd`"
HAVING COUNT(*) > 1;
"@

$duplicateCount = Invoke-Sql $duplicateQuery
$noDuplicates = Test-Result "No duplicate invoices" ([int]$duplicateCount -eq 0) "Duplicate count: $duplicateCount"

# Test 12: Verify unique constraint
Write-Host "`n12. Verify Unique Constraint" -ForegroundColor Yellow
$constraintQuery = @"
SELECT COUNT(*)
FROM information_schema.table_constraints
WHERE table_name = 'invoices' 
  AND constraint_name = 'invoices_managerId_periodStart_periodEnd_key'
  AND constraint_type = 'UNIQUE';
"@

$constraintExists = Invoke-Sql $constraintQuery
$constraintVerified = Test-Result "Unique constraint exists" ([int]$constraintExists -eq 1) "Constraint count: $constraintExists"

# Test 13: Test enforcement with overdue invoice
Write-Host "`n13. Test Enforcement with Overdue" -ForegroundColor Yellow
# Mark an invoice as overdue
$overdueQuery = "UPDATE invoices SET `"status`" = 'OVERDUE', `"dueDate`" = '2020-01-01' WHERE `"managerId`" = '$managerId' AND `"status`" = 'DUE'"
Invoke-Sql $overdueQuery

# Try to create property (should be blocked)
$blockedPropertyData = @{
    name        = "Blocked Property"
    address     = "Should be blocked"
    city        = "Kampala"
    description = "This should be blocked by enforcement"
} | ConvertTo-Json -Compress

$blockedResponse = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $blockedPropertyData
$enforcementTriggered = Test-Result "402 enforcement triggered" ($blockedResponse.StatusCode -eq 402) "Status: $($blockedResponse.StatusCode)"

if ($enforcementTriggered) {
    $requiresAction = $blockedResponse.Body.requiresAction
    Test-Result "Correct requiresAction" ($requiresAction -eq "PAY_INVOICE") "Action: $requiresAction"
}

# Test 14: Test enforcement after clear
Write-Host "`n14. Test Enforcement After Clear" -ForegroundColor Yellow
# Clear manager overdue status
$clearQuery = "UPDATE users SET `"billingStatus`" = 'CURRENT' WHERE id = '$managerId'"
Invoke-Sql $clearQuery

# Try to create property (should succeed)
$clearedPropertyData = @{
    name        = "Cleared Property"
    address     = "Should succeed"
    city        = "Kampala"
    description = "This should succeed after clearing"
} | ConvertTo-Json -Compress

$clearedResponse = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $clearedPropertyData
$enforcementCleared = Test-Result "Enforcement cleared" ($clearedResponse.StatusCode -eq 201) "Status: $($clearedResponse.StatusCode)"

# Test 15: Cleanup test data
Write-Host "`n15. Cleanup Test Data" -ForegroundColor Yellow
$cleanupQuery = "DELETE FROM invoices WHERE `"managerId`" = '$managerId'; DELETE FROM users WHERE email LIKE 'test-%' AND id IN ('$ownerId', '$managerId');"
Invoke-Sql $cleanupQuery
Write-Host "    Test data cleaned up" -ForegroundColor Green

# Summary
Write-Host "`n=== E2E VERIFICATION SUMMARY ===" -ForegroundColor Cyan

$allTests = @(
    $healthPassed,
    $dbPassed, 
    $ownerCreated,
    $managerCreated,
    $termsAccepted,
    $propertyCreated,
    $unitCreated,
    $gapPassed,
    $schedulerRun,
    $invoicesVerified,
    $noDuplicates,
    $constraintVerified,
    $enforcementTriggered,
    $enforcementCleared
)

$passedCount = ($allTests | Where-Object { $_ -eq $true }).Count
$totalCount = $allTests.Count

Write-Host "Tests Passed: $passedCount/$totalCount" -ForegroundColor $(if ($passedCount -eq $totalCount) { "Green" } else { "Yellow" })
