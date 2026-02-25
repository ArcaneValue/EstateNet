# Simple Tenant Money Flow Test
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api"

function Test-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description
    )
    
    $uri = "$baseUrl$Endpoint"
    $params = @{
        Uri = $uri
        Method = $Method
        Headers = $Headers
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        Write-Host "✅ $Description" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ $Description - Error: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

Write-Host "🚀 Starting Tenant Money Flow Test..." -ForegroundColor Cyan

try {
    # Get current billing period
    $testPeriod = (Get-Date).ToString("yyyy-MM")
    Write-Host "📅 Testing with period: $testPeriod" -ForegroundColor Yellow

    # Step 1: Create Manager
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $managerEmail = "mgr-$timestamp@test.com"
    
    $managerData = @{
        name = "Test Manager"
        email = $managerEmail
        password = "TestPass123!"
        phoneNumber = "+256700000001"
    }
    
    $manager = Test-ApiCall -Method "POST" -Endpoint "/auth/register/manager" -Body $managerData -Description "Manager Registration"
    $managerToken = $manager.data.token
    $managerId = $manager.data.user.id
    
    # Step 2: Accept Terms
    Test-ApiCall -Method "POST" -Endpoint "/manager/terms/accept" -Headers @{"Authorization" = "Bearer $managerToken"} -Description "Manager Terms Acceptance"
    
    # Step 3: Create Property
    $propertyData = @{
        name = "Test Property"
        location = "Test Location"
        managerId = $managerId
    }
    
    $property = Test-ApiCall -Method "POST" -Endpoint "/properties" -Headers @{"Authorization" = "Bearer $managerToken"} -Body $propertyData -Description "Property Creation"
    $propertyId = $property.data.id
    
    # Step 4: Create Unit
    $unitData = @{
        unitNumber = "Unit-1A"
        rentAmount = 800000
    }
    
    $unit = Test-ApiCall -Method "POST" -Endpoint "/properties/$propertyId/units" -Headers @{"Authorization" = "Bearer $managerToken"} -Body $unitData -Description "Unit Creation"
    $unitId = $unit.data.id
    
    # Step 5: Create Tenant
    $tenantEmail = "tenant-$timestamp@test.com"
    $tenantData = @{
        name = "Test Tenant"
        email = $tenantEmail
        password = "TestPass123!"
        phoneNumber = "+256700000002"
    }
    
    $tenant = Test-ApiCall -Method "POST" -Endpoint "/auth/register-tenant" -Body $tenantData -Description "Tenant Registration"
    $tenantToken = $tenant.data.token
    $tenantId = $tenant.data.user.tenantId
    
    # Step 6: Create Lease
    $leaseData = @{
        tenantId = $tenantId
        unitId = $unitId
        rentAmount = 800000
        startDate = "2024-01-01T00:00:00.000Z"
    }
    
    Test-ApiCall -Method "POST" -Endpoint "/leases" -Headers @{"Authorization" = "Bearer $managerToken"} -Body $leaseData -Description "Lease Creation"
    
    # Step 7: Test Tenant Rent Status (should be DUE)
    $rentStatus = Test-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$testPeriod" -Headers @{"Authorization" = "Bearer $tenantToken"} -Description "Initial Rent Status Check"
    
    Write-Host "📊 Initial Status: $($rentStatus.data.status)" -ForegroundColor Cyan
    Write-Host "   Expected: UGX $($rentStatus.data.expectedRent)" -ForegroundColor White
    Write-Host "   Paid: UGX $($rentStatus.data.paidForPeriod)" -ForegroundColor White
    Write-Host "   Outstanding: UGX $($rentStatus.data.outstandingForPeriod)" -ForegroundColor White
    
    # Step 8: Make Partial Payment
    $partialAmount = 300000
    $paymentData = @{
        amount = $partialAmount
        paymentDate = (Get-Date).ToString("yyyy-MM-dd")
        dueDate = "$testPeriod-01"
        billingPeriod = $testPeriod
        paymentMethod = "MOBILE_MONEY"
    }
    
    Test-ApiCall -Method "POST" -Endpoint "/payments" -Headers @{"Authorization" = "Bearer $tenantToken"} -Body $paymentData -Description "Partial Payment ($partialAmount)"
    
    # Step 9: Check Status (should be PARTIAL)
    $partialStatus = Test-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$testPeriod" -Headers @{"Authorization" = "Bearer $tenantToken"} -Description "Partial Payment Status Check"
    
    Write-Host "📊 After Partial Payment: $($partialStatus.data.status)" -ForegroundColor Cyan
    Write-Host "   Paid: UGX $($partialStatus.data.paidForPeriod)" -ForegroundColor White
    Write-Host "   Outstanding: UGX $($partialStatus.data.outstandingForPeriod)" -ForegroundColor White
    
    # Step 10: Complete Payment
    $remainingAmount = 500000
    $remainingPaymentData = @{
        amount = $remainingAmount
        paymentDate = (Get-Date).ToString("yyyy-MM-dd")
        dueDate = "$testPeriod-01"
        billingPeriod = $testPeriod
        paymentMethod = "MOBILE_MONEY"
    }
    
    Test-ApiCall -Method "POST" -Endpoint "/payments" -Headers @{"Authorization" = "Bearer $tenantToken"} -Body $remainingPaymentData -Description "Remaining Payment ($remainingAmount)"
    
    # Step 11: Final Status Check (should be PAID)
    $finalStatus = Test-ApiCall -Method "GET" -Endpoint "/tenant/rent-status?period=$testPeriod" -Headers @{"Authorization" = "Bearer $tenantToken"} -Description "Final Status Check"
    
    Write-Host "📊 Final Status: $($finalStatus.data.status)" -ForegroundColor Cyan
    Write-Host "   Paid: UGX $($finalStatus.data.paidForPeriod)" -ForegroundColor White
    Write-Host "   Outstanding: UGX $($finalStatus.data.outstandingForPeriod)" -ForegroundColor White
    
    # Step 12: Manager Finance Check
    $managerOutstanding = Test-ApiCall -Method "GET" -Endpoint "/manager/finance/outstanding-rent?period=$testPeriod" -Headers @{"Authorization" = "Bearer $managerToken"} -Description "Manager Outstanding Check"
    
    $managerCollection = Test-ApiCall -Method "GET" -Endpoint "/manager/finance/rent-collection?period=$testPeriod" -Headers @{"Authorization" = "Bearer $managerToken"} -Description "Manager Collection Check"
    
    Write-Host "📊 Manager Finance:" -ForegroundColor Cyan
    Write-Host "   Total Outstanding: UGX $($managerOutstanding.data.totalOutstanding)" -ForegroundColor White
    Write-Host "   Total Collected: UGX $($managerCollection.data.totalCollected)" -ForegroundColor White
    
    # Validation
    $success = $true
    if ($finalStatus.data.status -ne "PAID") {
        Write-Host "❌ Final status should be PAID, got: $($finalStatus.data.status)" -ForegroundColor Red
        $success = $false
    }
    
    if ($finalStatus.data.outstandingForPeriod -ne 0) {
        Write-Host "❌ Outstanding should be 0, got: $($finalStatus.data.outstandingForPeriod)" -ForegroundColor Red
        $success = $false
    }
    
    if ($managerOutstanding.data.totalOutstanding -ne 0) {
        Write-Host "❌ Manager outstanding should be 0, got: $($managerOutstanding.data.totalOutstanding)" -ForegroundColor Red
        $success = $false
    }
    
    if ($managerCollection.data.totalCollected -ne 800000) {
        Write-Host "❌ Manager collection should be 800000, got: $($managerCollection.data.totalCollected)" -ForegroundColor Red
        $success = $false
    }
    
    if ($success) {
        Write-Host ""
        Write-Host "🎉 SUCCESS: All tenant money flow tests passed!" -ForegroundColor Green
        Write-Host "✅ Billing period attribution working correctly" -ForegroundColor Green
        Write-Host "✅ Tenant and manager data consistent" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ FAILURE: Some tests failed" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Test failed with error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
