# Production-Safe Billing Scheduler Backfill E2E Verification
# Tests duplicate cleanup, backfill, and enforcement behavior

param(
    [string]$BackendUrl = "http://localhost:3001",
    [switch]$Verbose
)

# Helper function for test results
function Test-Result {
    param([string]$TestName, [bool]$Passed, [string]$Details = "")
    
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
            }
            else {
                $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" @headerArgs -d $Body
            }
        }
        else {
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
        $containerName = "estatenet-postgres"
        $tempFile = [System.IO.Path]::GetTempFileName()
        $Query | Out-File -FilePath $tempFile -Encoding UTF8
        
        # Copy file to container and execute
        docker cp $tempFile "$($containerName):/tmp/query.sql" | Out-Null
        $result = docker exec $containerName psql -U estatenet -d estatenet_db -f /tmp/query.sql
        
        # Clean up
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        docker exec $containerName rm /tmp/query.sql 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "SQL Error: Docker exec failed with exit code $LASTEXITCODE" -ForegroundColor Red
            return $null
        }
        
        # Extract just the result (remove headers, etc.)
        $lines = $result -split "`n"
        foreach ($line in $lines) {
            if ($line.Trim() -and $line -notmatch "---" -and $line -notmatch "row" -and $line -notmatch "count") {
                return $line.Trim()
            }
        }
        return $result.Trim()
    }
    catch {
        Write-Host "SQL Error: $_" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== Production-Safe Billing Scheduler Backfill E2E ===" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl"
Write-Host ""

# Test 1: Backend health check
Write-Host "1. Backend Health Check" -ForegroundColor Yellow
$health = Invoke-Api -Method "GET" -Endpoint "/health"
$healthPassed = Test-Result "Backend reachable" ($health.StatusCode -eq 200) "Status: $($health.StatusCode)"
if (-not $healthPassed) {
    Write-Host "❌ Backend not reachable. Please start the backend server." -ForegroundColor Red
    exit 1
}

# Test 2: Database connectivity
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
    $firstManagerId = $managerId  # Preserve first manager ID for invoice verification
    $firstManagerToken = $managerToken  # Preserve first manager token for enforcement tests
    Write-Host "    Manager ID: $managerId" -ForegroundColor Gray
}

# Test 5: Accept manager terms
Write-Host "`n5. Accept Manager Terms" -ForegroundColor Yellow
$termsResponse = Invoke-Api -Method "POST" -Endpoint "/api/manager/terms/accept" -Token $managerToken
$termsAccepted = Test-Result "Terms acceptance" ($termsResponse.StatusCode -eq 200)

if ($termsAccepted) {
    $managerToken = $termsResponse.Body.data.token
    $firstManagerToken = $managerToken  # Update first manager token after terms acceptance
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
        Write-Host "    Debug: Unit response = $($unitResponse.RawBody)" -ForegroundColor Gray
        $unitId = $unitResponse.Body.data.id
        Write-Host "    Unit ID: $unitId" -ForegroundColor Gray
    }
    else {
        Write-Host "    Debug: Unit response = $($unitResponse.RawBody)" -ForegroundColor Gray
    }
}
else {
    Write-Host "    Skipping unit creation - no property ID" -ForegroundColor Yellow
    $unitCreated = $false
}

# Test 7.5: Create tenant for lease
Write-Host "`n7.5. Create Test Tenant" -ForegroundColor Yellow
$tenantEmail = "test-tenant-$(Get-Random -Maximum 9999)@example.com"
$tenantJson = @{
    name     = "Test Tenant"
    email    = $tenantEmail
    password = "password123"
} | ConvertTo-Json -Compress

Write-Host "    Debug: Tenant JSON = $tenantJson" -ForegroundColor Gray

# Write JSON to temp file to avoid PowerShell curl issues
$tempTenantFile = [System.IO.Path]::GetTempFileName() + ".json"
$tenantJson | Out-File -FilePath $tempTenantFile -Encoding UTF8

$tenantResponse = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-tenant" -Body $tempTenantFile
Remove-Item $tempTenantFile -ErrorAction SilentlyContinue

$tenantCreated = Test-Result "Tenant creation" ($tenantResponse.StatusCode -eq 201)

if ($tenantCreated) {
    Write-Host "    Debug: Full tenant response = $($tenantResponse.RawBody)" -ForegroundColor Gray
    $tenantId = $tenantResponse.Body.data.user.tenantId
    Write-Host "    Tenant ID: $tenantId" -ForegroundColor Gray
}
else {
    Write-Host "    Debug: Tenant response = $($tenantResponse.RawBody)" -ForegroundColor Gray
}

# Test 7.6: Create active lease for unit
Write-Host "`n7.6. Create Active Lease" -ForegroundColor Yellow
if ($unitId -and $tenantId) {
    $leaseJson = @{
        tenantId   = $tenantId
        propertyId = $propertyId
        unitId     = $unitId
        rentAmount = 500000
        startDate  = (Get-Date).AddMonths(-1).ToString("yyyy-MM-dd")
        status     = "ACTIVE"
    } | ConvertTo-Json -Compress

    Write-Host "    Debug: Lease JSON = $leaseJson" -ForegroundColor Gray

    # Write JSON to temp file to avoid PowerShell curl issues
    $tempLeaseFile = [System.IO.Path]::GetTempFileName() + ".json"
    $leaseJson | Out-File -FilePath $tempLeaseFile -Encoding UTF8

    $leaseResponse = Invoke-Api -Method "POST" -Endpoint "/api/leases" -Token $managerToken -Body $tempLeaseFile
    Remove-Item $tempLeaseFile -ErrorAction SilentlyContinue
    
    $leaseCreated = Test-Result "Lease creation" ($leaseResponse.StatusCode -eq 201)
    
    if ($leaseCreated) {
        $leaseId = $leaseResponse.Body.data.id
        Write-Host "    Lease ID: $leaseId" -ForegroundColor Gray
    }
    else {
        Write-Host "    Debug: Lease response = $($leaseResponse.RawBody)" -ForegroundColor Gray
    }
}

# Test 8: Create historical gap (simulate 3 months ago)
Write-Host "`n8. Create Historical Invoice Gap" -ForegroundColor Yellow
$threeMonthsAgo = (Get-Date).AddMonths(-3).ToString("yyyy-MM-01")
$gapQuery = 'INSERT INTO invoices (id, "managerId", "periodStart", "periodEnd", "subtotalAmount", "feeRateBps", "feeAmount", status, "dueDate", "createdAt", "updatedAt") VALUES (''test-invoice-$(Get-Random -Maximum 9999)'', ''' + $managerId + ''', ''' + $threeMonthsAgo + ''', ''' + $((Get-Date).AddMonths(-2).ToString("yyyy-MM-28")) + ''', 500000, 150, 7500, ''PAID'', ''' + $((Get-Date).AddMonths(-1).ToString("yyyy-MM-dd")) + ''', NOW(), NOW()) ON CONFLICT DO NOTHING;'

$gapCreated = Invoke-Sql $gapQuery
$gapPassed = Test-Result "Historical gap created" ($gapCreated -and $gapCreated -ne "ERROR")
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
    }
    else {
        Write-Host "    Debug: Unit response = $($unitResponse.RawBody)" -ForegroundColor Gray
    }
}
# Test 8: Create historical gap (simulate 3 months ago) for the first manager who has leases
Write-Host "`n8. Create Historical Invoice Gap" -ForegroundColor Yellow
$threeMonthsAgo = (Get-Date).AddMonths(-3).ToString("yyyy-MM-01")
$gapQuery = 'INSERT INTO invoices (id, "managerId", "periodStart", "periodEnd", "subtotalAmount", "feeRateBps", "feeAmount", status, "dueDate", "createdAt", "updatedAt") VALUES (''test-invoice-$(Get-Random -Maximum 9999)'', ''' + $firstManagerId + ''', ''' + $threeMonthsAgo + ''', ''' + $((Get-Date).AddMonths(-2).ToString("yyyy-MM-28")) + ''', 500000, 150, 7500, ''PAID'', ''' + $((Get-Date).AddMonths(-1).ToString("yyyy-MM-dd")) + ''', NOW(), NOW()) ON CONFLICT DO NOTHING;'

$gapCreated = Invoke-Sql $gapQuery
$gapPassed = Test-Result "Historical gap created" ($gapCreated -and $gapCreated -ne "ERROR")

# Test 9: Run scheduler backfill
Write-Host "`n9. Run Scheduler Backfill" -ForegroundColor Yellow
# Clear distributed lock so scheduler can run fresh
Invoke-Sql 'DELETE FROM job_locks WHERE "jobName" = ''daily-billing-tasks'';'
$schedulerResponse = Invoke-Api -Method "POST" -Endpoint "/api/manager/billing/scheduler/run" -Token $ownerToken
$schedulerRun = Test-Result "Scheduler backfill executed" ($schedulerResponse.StatusCode -eq 200)

if ($schedulerRun) {
    Write-Host "    Invoices created: $($schedulerResponse.Body.invoicesCreatedCount)" -ForegroundColor Gray
    Write-Host "    Debug: Full scheduler response = $($schedulerResponse.RawBody)" -ForegroundColor Gray
}
else {
    Write-Host "    Debug: Scheduler response = $($schedulerResponse.RawBody)" -ForegroundColor Gray
}

# Test 10: Verify backfill invoices created
Write-Host "`n10. Verify Backfill Invoices" -ForegroundColor Yellow
Write-Host "    Debug: Using firstManagerId = $firstManagerId" -ForegroundColor Gray
$invoiceCountQuery = 'SELECT COUNT(*) FROM invoices WHERE "managerId" = ''' + $firstManagerId + ''' AND status = ''DUE'''
$invoiceCount = Invoke-Sql $invoiceCountQuery
$invoicesVerified = Test-Result "Backfill invoices exist" ([int]$invoiceCount -gt 0) "Count: $invoiceCount"

# Test 11: Verify no duplicates
Write-Host "`n11. Verify No Duplicates" -ForegroundColor Yellow
$duplicateQuery = @"
SELECT "managerId","periodStart","periodEnd",COUNT(*)
FROM invoices
GROUP BY "managerId","periodStart","periodEnd"
HAVING COUNT(*) > 1;
"@
$duplicateCount = Invoke-Sql $duplicateQuery
$duplicateCountInt = if ($duplicateCount -is [array]) { 0 } else { [int]$duplicateCount }
$noDuplicates = Test-Result "No duplicate invoices" ($duplicateCountInt -eq 0) "Duplicate count: $duplicateCountInt"

# Test 12: Verify unique constraint
Write-Host "`n12. Verify Unique Constraint" -ForegroundColor Yellow
$constraintQuery = 'SELECT COUNT(*) FROM pg_indexes WHERE tablename = ''invoices'' AND indexname = ''invoices_managerId_periodStart_periodEnd_key'''
$constraintExists = Invoke-Sql $constraintQuery
$constraintVerified = Test-Result "Unique constraint exists" ([int]$constraintExists -eq 1) "Constraint count: $constraintExists"

# Test 13: Test enforcement with overdue invoice
Write-Host "`n13. Test Enforcement with Overdue" -ForegroundColor Yellow
# Mark an invoice as overdue and update manager billing status
$overdueQuery = 'UPDATE invoices SET status = ''OVERDUE'', "dueDate" = ''2020-01-01'' WHERE "managerId" = ''' + $firstManagerId + ''' AND status = ''DUE'''
Invoke-Sql $overdueQuery

# Update manager billing status to OVERDUE to trigger enforcement
$managerOverdueQuery = 'UPDATE users SET "billingStatus" = ''OVERDUE'' WHERE id = ''' + $firstManagerId + ''''
Invoke-Sql $managerOverdueQuery

# Try to create property (should be blocked)
$blockedPropertyData = @{
    name        = "Blocked Property"
    location    = "Should be blocked"
    description = "This should be blocked by enforcement"
} | ConvertTo-Json -Compress

$tempBlockedFile = [System.IO.Path]::GetTempFileName() + ".json"
$blockedPropertyData | Out-File -FilePath $tempBlockedFile -Encoding UTF8

$blockedResponse = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $firstManagerToken -Body $tempBlockedFile
Remove-Item $tempBlockedFile -ErrorAction SilentlyContinue
$enforcementTriggered = Test-Result "402 enforcement triggered" ($blockedResponse.StatusCode -eq 402) "Status: $($blockedResponse.StatusCode)"

if ($enforcementTriggered) {
    $requiresAction = $blockedResponse.Body.requiresAction
    Test-Result "Correct requiresAction" ($requiresAction -eq "PAY_INVOICE") "Action: $requiresAction"
}

# Test 14: Test enforcement after clear
Write-Host "`n14. Test Enforcement After Clear" -ForegroundColor Yellow
# Clear manager overdue status
$clearQuery = 'UPDATE users SET "billingStatus" = ''CURRENT'' WHERE id = ''' + $firstManagerId + ''''
Invoke-Sql $clearQuery

# Try to create property (should succeed)
$clearedPropertyData = @{
    name        = "Cleared Property"
    location    = "Should succeed"
    description = "This should succeed after clearing"
} | ConvertTo-Json -Compress

$tempClearedFile = [System.IO.Path]::GetTempFileName() + ".json"
$clearedPropertyData | Out-File -FilePath $tempClearedFile -Encoding UTF8

$clearedResponse = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $firstManagerToken -Body $tempClearedFile
Remove-Item $tempClearedFile -ErrorAction SilentlyContinue
$enforcementCleared = Test-Result "Enforcement cleared" ($clearedResponse.StatusCode -eq 201) "Status: $($clearedResponse.StatusCode)"

# Test 15: Cleanup test data
Write-Host "`n15. Cleanup Test Data" -ForegroundColor Yellow
$cleanupQuery = 'DELETE FROM invoices WHERE "managerId" = ''' + $firstManagerId + '''; DELETE FROM users WHERE email LIKE ''test-%'' AND id IN (''' + $ownerId + ''', ''' + $firstManagerId + ''');'
Invoke-Sql $cleanupQuery
Write-Host "    Test data cleaned up" -ForegroundColor Green

# Summary
Write-Host "`n=== E2E VERIFICATION SUMMARY ===" -ForegroundColor Cyan

$allTests = @(
    $healthPassed,
    $dbPassed, 
    $managerCreated,
    $termsAccepted,
    $propertyCreated,
    $unitCreated,
    $tenantCreated,
    $leaseCreated,
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

if ($passedCount -eq $totalCount) {
    Write-Host "✅ Production-safe billing scheduler backfill VERIFIED!" -ForegroundColor Green
}
else {
    Write-Host "❌ Some tests failed. Please review the output above." -ForegroundColor Red
    exit 1
}
