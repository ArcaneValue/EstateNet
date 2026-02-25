# EstateNet Manager Finance E2E Verification Script
# Verifies the new manager finance endpoints work correctly

param(
    [string]$BaseUrl = "http://localhost:3001",
    [switch]$Verbose = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Test data
$TestManagerEmail = "finance-manager-$(Get-Random)@test.com"
$TestTenantEmail = "finance-tenant-$(Get-Random)@test.com"
$TestPassword = "TestPass123!"

# Helper function to make API calls with error handling
function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description = ""
    )
    
    try {
        $uri = "$BaseUrl$Endpoint"
        $params = @{
            Uri         = $uri
            Method      = $Method
            Headers     = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        if ($Verbose) {
            Write-Host "[$Method] $uri" -ForegroundColor Cyan
            if ($Body) {
                Write-Host "Body: $($params.Body)" -ForegroundColor Gray
            }
        }
        
        $response = Invoke-RestMethod @params
        
        if ($Verbose -and $Description) {
            Write-Host "✓ $Description" -ForegroundColor Green
        }
        
        return $response
    }
    catch {
        Write-Host "✗ API call failed: $Description" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "Status Code: $statusCode" -ForegroundColor Red
        }
        throw
    }
}

# Helper function to create auth headers
function Get-AuthHeaders {
    param([string]$Token)
    return @{
        "Authorization" = "Bearer $Token"
        "Content-Type"  = "application/json"
    }
}

Write-Host "=== EstateNet Manager Finance E2E Verification ===" -ForegroundColor Yellow
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Step 1: Create test manager
    Write-Host "1. Creating test manager..." -ForegroundColor Blue
    $managerData = @{
        email    = $TestManagerEmail
        password = $TestPassword
        name     = "Finance Test Manager"
        role     = "MANAGER"
    }
    
    $manager = Invoke-ApiCall -Method "POST" -Endpoint "/api/auth/register" -Body $managerData -Description "Manager registration"
    $managerToken = $manager.token
    $managerId = $manager.user.id
    
    Write-Host "✓ Manager created: $($manager.user.name) ($managerId)" -ForegroundColor Green
    
    # Step 2: Create test property
    Write-Host "2. Creating test property..." -ForegroundColor Blue
    $propertyData = @{
        name        = "Finance Test Property"
        location    = "Test Location"
        description = "Property for finance testing"
    }
    
    $property = Invoke-ApiCall -Method "POST" -Endpoint "/api/properties" -Headers (Get-AuthHeaders $managerToken) -Body $propertyData -Description "Property creation"
    $propertyId = $property.data.id
    
    Write-Host "✓ Property created: $($property.data.name) ($propertyId)" -ForegroundColor Green
    
    # Step 3: Create test unit
    Write-Host "3. Creating test unit..." -ForegroundColor Blue
    $unitData = @{
        unitNumber = "101"
        rentAmount = 1000000
        bedrooms   = 2
        bathrooms  = 1
    }
    
    $unit = Invoke-ApiCall -Method "POST" -Endpoint "/api/properties/$propertyId/units" -Headers (Get-AuthHeaders $managerToken) -Body $unitData -Description "Unit creation"
    $unitId = $unit.data.id
    
    Write-Host "✓ Unit created: $($unit.data.unitNumber) ($unitId)" -ForegroundColor Green
    
    # Step 4: Create test tenant identity
    Write-Host "4. Creating test tenant..." -ForegroundColor Blue
    $tenantData = @{
        email    = $TestTenantEmail
        password = $TestPassword
        name     = "Finance Test Tenant"
        role     = "TENANT"
    }
    
    $tenant = Invoke-ApiCall -Method "POST" -Endpoint "/api/auth/register" -Body $tenantData -Description "Tenant registration"
    $tenantToken = $tenant.token
    $tenantId = $tenant.user.id
    
    Write-Host "✓ Tenant created: $($tenant.user.name) ($tenantId)" -ForegroundColor Green
    
    # Step 5: Create lease (active from start of current month)
    Write-Host "5. Creating active lease..." -ForegroundColor Blue
    $currentDate = Get-Date
    $monthStart = Get-Date -Year $currentDate.Year -Month $currentDate.Month -Day 1
    $leaseStartDate = $monthStart.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $leaseData = @{
        tenantId   = $tenantId
        propertyId = $propertyId
        unitId     = $unitId
        rentAmount = 1000000
        startDate  = $leaseStartDate
    }
    
    $lease = Invoke-ApiCall -Method "POST" -Endpoint "/api/leases" -Headers (Get-AuthHeaders $managerToken) -Body $leaseData -Description "Lease creation"
    $leaseId = $lease.data.id
    
    Write-Host "✓ Lease created: $leaseId (Start: $leaseStartDate)" -ForegroundColor Green
    
    # Step 6: Create test payment (partial payment)
    Write-Host "6. Creating test payment..." -ForegroundColor Blue
    $paymentDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $paymentData = @{
        amount        = 800000
        paymentDate   = $paymentDate
        paymentMethod = "BANK_TRANSFER"
        transactionId = "TEST-TXN-$(Get-Random)"
    }
    
    Invoke-ApiCall -Method "POST" -Endpoint "/api/payments" -Headers (Get-AuthHeaders $tenantToken) -Body $paymentData -Description "Payment creation" | Out-Null
    
    Write-Host "✓ Payment created: UGX 800,000 (leaving 200,000 outstanding)" -ForegroundColor Green
    
    # Step 7: Test rent collection endpoint
    Write-Host "7. Testing rent collection endpoint..." -ForegroundColor Blue
    $currentPeriod = $currentDate.ToString("yyyy-MM")
    
    $rentCollection = Invoke-ApiCall -Method "GET" -Endpoint "/api/manager/finance/rent-collection?period=$currentPeriod" -Headers (Get-AuthHeaders $managerToken) -Description "Rent collection data retrieval"
    
    # Verify rent collection data
    if ($rentCollection.success -ne $true) {
        throw "Rent collection endpoint returned success: $($rentCollection.success)"
    }
    
    if ($rentCollection.data.totalCollected -ne 800000) {
        throw "Expected totalCollected: 800000, got: $($rentCollection.data.totalCollected)"
    }
    
    if ($rentCollection.data.period -ne $currentPeriod) {
        throw "Expected period: $currentPeriod, got: $($rentCollection.data.period)"
    }
    
    if ($rentCollection.data.byProperty.Count -eq 0) {
        throw "Expected at least one property in byProperty array"
    }
    
    $propertyData = $rentCollection.data.byProperty[0]
    if ($propertyData.expectedRent -ne 1000000) {
        throw "Expected expectedRent: 1000000, got: $($propertyData.expectedRent)"
    }
    
    if ($propertyData.collectedRent -ne 800000) {
        throw "Expected collectedRent: 800000, got: $($propertyData.collectedRent)"
    }
    
    if ($propertyData.collectionRate -ne 80) {
        throw "Expected collectionRate: 80%, got: $($propertyData.collectionRate)%"
    }
    
    Write-Host "✓ Rent collection data verified:" -ForegroundColor Green
    Write-Host "  - Total Collected: UGX $($rentCollection.data.totalCollected)" -ForegroundColor Gray
    Write-Host "  - Collection Rate: $($propertyData.collectionRate)%" -ForegroundColor Gray
    Write-Host "  - Recent Payments: $($rentCollection.data.recentPayments.Count)" -ForegroundColor Gray
    
    # Step 8: Test outstanding rent endpoint
    Write-Host "8. Testing outstanding rent endpoint..." -ForegroundColor Blue
    
    $outstandingRent = Invoke-ApiCall -Method "GET" -Endpoint "/api/manager/finance/outstanding-rent?period=$currentPeriod" -Headers (Get-AuthHeaders $managerToken) -Description "Outstanding rent data retrieval"
    
    # Verify outstanding rent data
    if ($outstandingRent.success -ne $true) {
        throw "Outstanding rent endpoint returned success: $($outstandingRent.success)"
    }
    
    if ($outstandingRent.data.totalOutstanding -ne 200000) {
        throw "Expected totalOutstanding: 200000, got: $($outstandingRent.data.totalOutstanding)"
    }
    
    if ($outstandingRent.data.overdueTenantsCount -ne 1) {
        throw "Expected overdueTenantsCount: 1, got: $($outstandingRent.data.overdueTenantsCount)"
    }
    
    if ($outstandingRent.data.items.Count -eq 0) {
        throw "Expected at least one item in outstanding items array"
    }
    
    $outstandingItem = $outstandingRent.data.items[0]
    if ($outstandingItem.amountOutstanding -ne 200000) {
        throw "Expected amountOutstanding: 200000, got: $($outstandingItem.amountOutstanding)"
    }
    
    if ($outstandingItem.expectedRent -ne 1000000) {
        throw "Expected expectedRent: 1000000, got: $($outstandingItem.expectedRent)"
    }
    
    if ($outstandingItem.collectedRent -ne 800000) {
        throw "Expected collectedRent: 800000, got: $($outstandingItem.collectedRent)"
    }
    
    Write-Host "✓ Outstanding rent data verified:" -ForegroundColor Green
    Write-Host "  - Total Outstanding: UGX $($outstandingRent.data.totalOutstanding)" -ForegroundColor Gray
    Write-Host "  - Overdue Tenants: $($outstandingRent.data.overdueTenantsCount)" -ForegroundColor Gray
    Write-Host "  - Tenant: $($outstandingItem.tenantName)" -ForegroundColor Gray
    
    # Step 9: Test property filtering
    Write-Host "9. Testing property filtering..." -ForegroundColor Blue
    
    $filteredRentCollection = Invoke-ApiCall -Method "GET" -Endpoint "/api/manager/finance/rent-collection?period=$currentPeriod&propertyId=$propertyId" -Headers (Get-AuthHeaders $managerToken) -Description "Filtered rent collection data"
    
    if ($filteredRentCollection.data.byProperty.Count -ne 1) {
        throw "Expected exactly 1 property when filtering, got: $($filteredRentCollection.data.byProperty.Count)"
    }
    
    if ($filteredRentCollection.data.byProperty[0].propertyId -ne $propertyId) {
        throw "Expected filtered property ID: $propertyId, got: $($filteredRentCollection.data.byProperty[0].propertyId)"
    }
    
    Write-Host "✓ Property filtering verified" -ForegroundColor Green
    
    # Step 10: Test Option A snapshot semantics
    Write-Host "10. Testing Option A snapshot semantics..." -ForegroundColor Blue
    
    # Test with a future period (should show expected rent but no collected rent)
    $futureDate = $currentDate.AddMonths(1)
    $futurePeriod = $futureDate.ToString("yyyy-MM")
    
    $futureRentCollection = Invoke-ApiCall -Method "GET" -Endpoint "/api/manager/finance/rent-collection?period=$futurePeriod" -Headers (Get-AuthHeaders $managerToken) -Description "Future period rent collection"
    
    # Should show expected rent (lease active) but no collected rent (no payments in future)
    if ($futureRentCollection.data.byProperty[0].expectedRent -ne 1000000) {
        throw "Expected future expectedRent: 1000000, got: $($futureRentCollection.data.byProperty[0].expectedRent)"
    }
    
    if ($futureRentCollection.data.byProperty[0].collectedRent -ne 0) {
        throw "Expected future collectedRent: 0, got: $($futureRentCollection.data.byProperty[0].collectedRent)"
    }
    
    Write-Host "✓ Option A snapshot semantics verified" -ForegroundColor Green
    
    # Step 11: Test authentication requirements
    Write-Host "11. Testing authentication requirements..." -ForegroundColor Blue
    
    try {
        Invoke-ApiCall -Method "GET" -Endpoint "/api/manager/finance/rent-collection" -Description "Unauthenticated request"
        throw "Expected authentication error but request succeeded"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Write-Host "✓ Authentication requirement verified" -ForegroundColor Green
        }
        else {
            throw "Expected 401 Unauthorized, got: $($_.Exception.Response.StatusCode.value__)"
        }
    }
    
    Write-Host ""
    Write-Host "=== ALL TESTS PASSED ===" -ForegroundColor Green
    Write-Host "Manager Finance endpoints are working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "- Rent Collection API: ✓ Working" -ForegroundColor Green
    Write-Host "- Outstanding Rent API: ✓ Working" -ForegroundColor Green
    Write-Host "- Property Filtering: ✓ Working" -ForegroundColor Green
    Write-Host "- Option A Snapshot Logic: ✓ Working" -ForegroundColor Green
    Write-Host "- Authentication: ✓ Working" -ForegroundColor Green
    
}
catch {
    Write-Host ""
    Write-Host "=== TEST FAILED ===" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # Cleanup is handled by the test database reset
    Write-Host ""
    Write-Host "Test completed." -ForegroundColor Gray
}
