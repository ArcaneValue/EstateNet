# EstateNet Billing Snapshot E2E Verification (Option A)
# Tests: Option A billing snapshot rules - only leases ACTIVE at periodStart are included
# PowerShell 5.1 compatible - Windows isolation-safe E2E test

param(
    [string]$BackendUrl = "http://localhost:3001"
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

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

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Token = "",
        [string]$Body = ""
    )
    
    try {
        $headers = @()
        $headers += "-H"
        $headers += "Content-Type: application/json"
        
        if ($Token) {
            $headers += "-H"
            $headers += "Authorization: Bearer $Token"
        }
        
        if ($Body) {
            $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" @headers --data-binary "@$Body"
        }
        else {
            $response = curl.exe -s -w "%{http_code}" -X $Method "$BackendUrl$Endpoint" @headers
        }
        
        $statusCode = $response[-3..-1] -join ""
        $responseBody = $response[0..($response.Length - 4)] -join ""
        
        return @{
            StatusCode = [int]$statusCode
            Body       = if ($responseBody) { $responseBody | ConvertFrom-Json } else { $null }
            RawBody    = $responseBody
        }
    }
    catch {
        Write-Host "API call failed: $_" -ForegroundColor Red
        return @{
            StatusCode = 0
            Body       = $null
            RawBody    = ""
        }
    }
}

function Get-KampalaPeriodStart {
    param([DateTime]$Date = (Get-Date))
    
    # Use exact same logic as backend getBillingPeriod + getPeriodDates
    $kampalaOffset = 3 * 60 * 60 * 1000  # UTC+3 in milliseconds
    $kampalaTime = $Date.AddMilliseconds($kampalaOffset)
    
    # Get billing period (YYYY-MM format)
    $year = $kampalaTime.Year
    $month = $kampalaTime.Month
    $billingPeriod = "$year-$($month.ToString().PadLeft(2, '0'))"
    
    # Convert back to period dates using getPeriodDates logic
    $periodYear = [int]$billingPeriod.Split('-')[0]
    $periodMonth = [int]$billingPeriod.Split('-')[1]
    
    # First day of month at 00:00:00 Kampala time, then convert to UTC
    $periodStartUTC = [DateTime]::new($periodYear, $periodMonth, 1, 0, 0, 0, [DateTimeKind]::Utc)
    $periodStart = $periodStartUTC.AddMilliseconds(-$kampalaOffset)
    
    return $periodStart
}

function Get-UniqueEmail {
    param([string]$Prefix)
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $random = Get-Random -Minimum 1000 -Maximum 9999
    return "$Prefix-$timestamp-$random@example.com"
}

# ─── Main Script ──────────────────────────────────────────────────────────────

Write-Host "=== EstateNet Billing Snapshot E2E Test ===" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Gray

$allTests = @()
$tempFiles = @()

try {
    # Generate unique identifiers for isolation
    $runId = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $ownerEmail = Get-UniqueEmail "owner"
    $managerEmail = Get-UniqueEmail "manager"
    
    # ─── 1. Health Check ───────────────────────────────────────────────────────
    
    Write-Host "`n1. Health Check" -ForegroundColor Yellow
    $healthRes = Invoke-Api -Method "GET" -Endpoint "/health"
    $t = Test-Result "Health check" ($healthRes.StatusCode -eq 200) "Status: $($healthRes.StatusCode)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Backend not available. Exiting." -ForegroundColor Red
        exit 1
    }
    
    # ─── 2. Create New Owner ───────────────────────────────────────────────────
    
    Write-Host "`n2. Create New Owner" -ForegroundColor Yellow
    $ownerRegFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $ownerRegFile
    
    $ownerRegData = @{
        name        = "Test Owner $runId"
        email       = $ownerEmail
        phoneNumber = "0700000001"
        password    = "Password123"
    }
    $ownerRegData | ConvertTo-Json -Compress | Out-File -FilePath $ownerRegFile -Encoding UTF8 -NoNewline
    
    $ownerRegRes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-owner" -Body $ownerRegFile
    $t = Test-Result "Owner registration" ($ownerRegRes.StatusCode -eq 201) "Email: $ownerEmail"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Owner registration failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $ownerToken = $ownerRegRes.Body.data.token
    
    # ─── 3. Create New Manager ─────────────────────────────────────────────────
    
    Write-Host "`n3. Create New Manager" -ForegroundColor Yellow
    $managerRegFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $managerRegFile
    
    $managerRegData = @{
        name        = "Test Manager $runId"
        email       = $managerEmail
        phoneNumber = "0700000002"
        password    = "Password123"
    }
    $managerRegData | ConvertTo-Json -Compress | Out-File -FilePath $managerRegFile -Encoding UTF8 -NoNewline
    
    $managerRegRes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register/manager" -Body $managerRegFile
    $t = Test-Result "Manager registration" ($managerRegRes.StatusCode -eq 201) "Email: $managerEmail"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Manager registration failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $managerToken = $managerRegRes.Body.data.token
    $managerId = $managerRegRes.Body.data.user.id
    
    # ─── 4. Manager Accept Terms ───────────────────────────────────────────────
    
    Write-Host "`n4. Manager Accept Terms" -ForegroundColor Yellow
    $termsRes = Invoke-Api -Method "POST" -Endpoint "/api/manager/terms/accept" -Token $managerToken
    $t = Test-Result "Terms acceptance" ($termsRes.StatusCode -eq 200) "Manager accepted terms"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Terms acceptance failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    # Update token - backend returns new token with terms acceptance timestamp
    $managerToken = $termsRes.Body.data.token
    
    # ─── 5. Create Property ────────────────────────────────────────────────────
    
    Write-Host "`n5. Create Property" -ForegroundColor Yellow
    $propertyFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $propertyFile
    
    $propertyData = @{
        name     = "Test Property Snapshot $runId"
        location = "123 Test Street, Kampala"
    }
    $propertyData | ConvertTo-Json -Compress | Out-File -FilePath $propertyFile -Encoding UTF8 -NoNewline
    
    $propertyRes = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $propertyFile
    $t = Test-Result "Property creation" ($propertyRes.StatusCode -eq 201) "Property created"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Property creation failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $propertyId = $propertyRes.Body.data.id
    
    # ─── 6. Create Units ───────────────────────────────────────────────────────
    
    Write-Host "`n6. Create Units" -ForegroundColor Yellow
    
    # Unit A - 800,000 UGX
    $unitAFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $unitAFile
    
    $unitAData = @{
        unitNumber = "A1"
        rentAmount = 800000
    }
    $unitAData | ConvertTo-Json -Compress | Out-File -FilePath $unitAFile -Encoding UTF8 -NoNewline
    
    $unitARes = Invoke-Api -Method "POST" -Endpoint "/api/properties/$propertyId/units" -Token $managerToken -Body $unitAFile
    $t = Test-Result "Unit A creation" ($unitARes.StatusCode -eq 201) "Rent: 800,000 UGX"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Unit A creation failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $unitAId = $unitARes.Body.data.id
    
    # Unit B - 500,000 UGX
    $unitBFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $unitBFile
    
    $unitBData = @{
        unitNumber = "B1"
        rentAmount = 500000
    }
    $unitBData | ConvertTo-Json -Compress | Out-File -FilePath $unitBFile -Encoding UTF8 -NoNewline
    
    $unitBRes = Invoke-Api -Method "POST" -Endpoint "/api/properties/$propertyId/units" -Token $managerToken -Body $unitBFile
    $t = Test-Result "Unit B creation" ($unitBRes.StatusCode -eq 201) "Rent: 500,000 UGX"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Unit B creation failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $unitBId = $unitBRes.Body.data.id
    
    # ─── 7. Compute Period Boundaries ──────────────────────────────────────────
    
    Write-Host "`n7. Compute Period Boundaries" -ForegroundColor Yellow
    
    # Use current month period for testing
    $now = Get-Date
    $periodStart = Get-KampalaPeriodStart $now
    $periodEnd = $periodStart.AddMonths(1).AddMilliseconds(-1)
    
    # Create leases in current billing period for scheduler to find them
    # Lease A: starts before periodStart (should be INCLUDED)
    # Lease B: starts after periodStart (should be EXCLUDED)
    $leaseAStart = $periodStart.AddDays(-2)  # 2 days before periodStart - INCLUDED
    $leaseBStart = $periodStart.AddDays(3)   # 3 days after periodStart - EXCLUDED
    
    Write-Host "    Current Time: $($now.ToString('yyyy-MM-dd HH:mm:ss')) UTC" -ForegroundColor Gray
    Write-Host "    Period Start (Kampala): $($periodStart.ToString('yyyy-MM-dd HH:mm:ss')) UTC" -ForegroundColor Gray
    Write-Host "    Period End: $($periodEnd.ToString('yyyy-MM-dd HH:mm:ss')) UTC" -ForegroundColor Gray
    Write-Host "    Lease A Start: $($leaseAStart.ToString('yyyy-MM-dd HH:mm:ss')) UTC (SHOULD BE INCLUDED)" -ForegroundColor Gray
    Write-Host "    Lease B Start: $($leaseBStart.ToString('yyyy-MM-dd HH:mm:ss')) UTC (SHOULD BE EXCLUDED)" -ForegroundColor Gray
    
    # ─── 8. Create Tenants and Leases ──────────────────────────────────────────
    
    Write-Host "`n8. Create Tenants and Leases" -ForegroundColor Yellow
    
    # Tenant A
    $tenantAEmail = Get-UniqueEmail "tenant-a"
    $tenantAFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $tenantAFile
    
    $tenantAData = @{
        name        = "Tenant A $runId"
        email       = $tenantAEmail
        phoneNumber = "0700000003"
        password    = "Password123"
    }
    $tenantAData | ConvertTo-Json -Compress | Out-File -FilePath $tenantAFile -Encoding UTF8 -NoNewline
    
    $tenantARes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-tenant" -Body $tenantAFile
    $t = Test-Result "Tenant A registration" ($tenantARes.StatusCode -eq 201) "Email: $tenantAEmail"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Tenant A registration failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $tenantAId = $tenantARes.Body.data.user.tenantId
    
    # Lease A (before periodStart - should be INCLUDED)
    $leaseAFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $leaseAFile
    
    $leaseAData = @{
        tenantId   = $tenantAId
        propertyId = $propertyId
        unitId     = $unitAId
        rentAmount = 800000
        startDate  = $leaseAStart.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        endDate    = $null
    }
    $leaseAData | ConvertTo-Json -Compress | Out-File -FilePath $leaseAFile -Encoding UTF8 -NoNewline
    
    $leaseARes = Invoke-Api -Method "POST" -Endpoint "/api/leases" -Token $managerToken -Body $leaseAFile
    $t = Test-Result "Lease A creation" ($leaseARes.StatusCode -eq 201) "Start: $($leaseAStart.ToString('yyyy-MM-dd')) (INCLUDED)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Lease A creation failed. Status: $($leaseARes.StatusCode)" -ForegroundColor Red
        Write-Host "Response: $($leaseARes.RawBody)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "    Debug: Lease A created with startDate: $($leaseAStart.ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))" -ForegroundColor Gray
    Write-Host "    Debug: Lease A propertyId: $propertyId, managerId: $managerId" -ForegroundColor Gray
    
    # Tenant B
    $tenantBEmail = Get-UniqueEmail "tenant-b"
    $tenantBFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $tenantBFile
    
    $tenantBData = @{
        name        = "Tenant B $runId"
        email       = $tenantBEmail
        phoneNumber = "0700000004"
        password    = "Password123"
    }
    $tenantBData | ConvertTo-Json -Compress | Out-File -FilePath $tenantBFile -Encoding UTF8 -NoNewline
    
    $tenantBRes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-tenant" -Body $tenantBFile
    $t = Test-Result "Tenant B registration" ($tenantBRes.StatusCode -eq 201) "Email: $tenantBEmail"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Tenant B registration failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $tenantBId = $tenantBRes.Body.data.user.tenantId
    
    # Lease B (after periodStart - should be EXCLUDED)
    $leaseBFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $leaseBFile
    
    $leaseBData = @{
        tenantId   = $tenantBId
        propertyId = $propertyId
        unitId     = $unitBId
        rentAmount = 500000
        startDate  = $leaseBStart.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        endDate    = $null
    }
    $leaseBData | ConvertTo-Json -Compress | Out-File -FilePath $leaseBFile -Encoding UTF8 -NoNewline
    
    $leaseBRes = Invoke-Api -Method "POST" -Endpoint "/api/leases" -Token $managerToken -Body $leaseBFile
    $t = Test-Result "Lease B creation" ($leaseBRes.StatusCode -eq 201) "Start: $($leaseBStart.ToString('yyyy-MM-dd')) (EXCLUDED)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Lease B creation failed. Exiting." -ForegroundColor Red
        exit 1
    }
    
    # ─── 9. Trigger Invoice Generation (Manual) ────────────────────────────────
    
    Write-Host "`n9. Trigger Invoice Generation (Manual)" -ForegroundColor Yellow
    
    # Use the manual invoice generation endpoint (now fixed with Option A logic)
    $invoiceGenFile = [System.IO.Path]::GetTempFileName() + ".json"
    $tempFiles += $invoiceGenFile
    
    $invoiceGenData = @{
        managerId   = $managerId
        periodStart = $periodStart.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        periodEnd   = $periodEnd.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    }
    $invoiceGenData | ConvertTo-Json -Compress | Out-File -FilePath $invoiceGenFile -Encoding UTF8 -NoNewline
    
    Write-Host "    Debug: Generating invoice for managerId: $managerId" -ForegroundColor Gray
    Write-Host "    Debug: Period: $($periodStart.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')) to $($periodEnd.ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))" -ForegroundColor Gray
    
    $generateRes = Invoke-Api -Method "POST" -Endpoint "/api/manager/billing/generate" -Token $ownerToken -Body $invoiceGenFile
    $t = Test-Result "Invoice generation" ($generateRes.StatusCode -eq 201) "Invoice generated"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Invoice generation failed. Status: $($generateRes.StatusCode)" -ForegroundColor Red
        Write-Host "Response: $($generateRes.RawBody)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "    Generated invoice ID: $($generateRes.Body.data.id)" -ForegroundColor Gray
    Write-Host "    Subtotal: $($generateRes.Body.data.subtotalAmount), Lines: $($generateRes.Body.data.lines.Count)" -ForegroundColor Gray
    
    # ─── 10. Verify Invoice Selection ──────────────────────────────────────────────────────
    
    Write-Host "`n10. Verify Invoice Selection" -ForegroundColor Yellow
    $invoicesRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/invoices" -Token $managerToken
    $t = Test-Result "Get invoices" ($invoicesRes.StatusCode -eq 200) "Retrieved invoices"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Failed to get invoices. Exiting." -ForegroundColor Red
        exit 1
    }
    
    # Filter invoices for this manager and billing status
    $validInvoices = @()
    foreach ($invoice in $invoicesRes.Body.data) {
        if ($invoice.status -in @('DUE', 'OVERDUE', 'PAID')) {
            $validInvoices += $invoice
        }
    }
    
    # Find the most recent invoice for our manager (should be the one just created)
    Write-Host "    Debug: Found $($validInvoices.Count) valid invoices" -ForegroundColor Gray
    
    if ($validInvoices.Count -eq 0) {
        Write-Host "No invoices found for manager. Scheduler may not have created invoice for current period." -ForegroundColor Red
        exit 1
    }
    
    # Sort by creation date and take the most recent
    $sortedInvoices = $validInvoices | Sort-Object { [DateTime]$_.createdAt } -Descending
    $currentInvoice = $sortedInvoices[0]
    
    Write-Host "    Debug: Selected most recent invoice:" -ForegroundColor Gray
    Write-Host "    Debug: Invoice ID: $($currentInvoice.id)" -ForegroundColor Gray
    Write-Host "    Debug: Period Start: $($currentInvoice.periodStart)" -ForegroundColor Gray
    Write-Host "    Debug: Created At: $($currentInvoice.createdAt)" -ForegroundColor Gray
    Write-Host "    Debug: Line Count: $($currentInvoice.lineCount)" -ForegroundColor Gray
    Write-Host "    Debug: Subtotal: $($currentInvoice.subtotalAmount)" -ForegroundColor Gray
    
    # Verify exactly 1 invoice for this manager (isolation check)
    $t = Test-Result "Single invoice for manager" ($validInvoices.Count -eq 1) "Found: $($validInvoices.Count) invoices for manager"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Expected exactly 1 invoice for manager, found $($validInvoices.Count). Contamination detected." -ForegroundColor Red
        exit 1
    }
    
    # Verify line count is 1 (Option A: only Lease A should be included)
    $t = Test-Result "Invoice line count" ($currentInvoice.lineCount -eq 1) "Expected: 1, Actual: $($currentInvoice.lineCount)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Expected exactly 1 line (Lease A only), found $($currentInvoice.lineCount). Option A violation." -ForegroundColor Red
        exit 1
    }
    
    # Verify subtotal (should be 800,000 - only Lease A)
    $expectedSubtotal = 800000
    $t = Test-Result "Subtotal amount" ($currentInvoice.subtotalAmount -eq $expectedSubtotal) "Expected: $expectedSubtotal, Actual: $($currentInvoice.subtotalAmount)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Expected subtotal to be $expectedSubtotal, found $($currentInvoice.subtotalAmount). Option A violation." -ForegroundColor Red
        exit 1
    }
    
    # Verify fee amount (3.99% of subtotal)
    $expectedFee = [Math]::Round($expectedSubtotal * 0.0399)
    $t = Test-Result "Fee amount" ($currentInvoice.feeAmount -eq $expectedFee) "Expected: $expectedFee, Actual: $($currentInvoice.feeAmount)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Expected fee to be $expectedFee, found $($currentInvoice.feeAmount). Option A violation." -ForegroundColor Red
        exit 1
    }
    
    # Verify service fee due
    if ($currentInvoice.PSObject.Properties.Name -contains "serviceFeeDue") {
        $t = Test-Result "Service fee due" ($currentInvoice.serviceFeeDue -eq $expectedFee) "Expected: $expectedFee, Actual: $($currentInvoice.serviceFeeDue)"
        $allTests += $t
    }
    
    # ─── 11. Verify Invoice Lines (Option A Assertions) ──────────────────────────────────────────────────────
    
    Write-Host "`n11. Verify Invoice Lines (Option A Assertions)" -ForegroundColor Yellow
    $invoiceDetailRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/invoices/$($currentInvoice.id)" -Token $managerToken
    $t = Test-Result "Get invoice details" ($invoiceDetailRes.StatusCode -eq 200) "Retrieved invoice details"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Failed to get invoice details. Exiting." -ForegroundColor Red
        exit 1
    }
    
    $invoiceLines = $invoiceDetailRes.Body.data.lines
    
    # Verify exactly 1 line (Option A: only Lease A should be included)
    $t = Test-Result "Invoice lines count" ($invoiceLines.Count -eq 1) "Expected: 1, Actual: $($invoiceLines.Count)"
    $allTests += $t
    
    if (-not $t) {
        Write-Host "Option A violation: Expected exactly 1 line (Lease A only), found $($invoiceLines.Count)" -ForegroundColor Red
        exit 1
    }
    
    if ($invoiceLines.Count -gt 0) {
        $line = $invoiceLines[0]
        
        # Verify line is for Unit A (the INCLUDED lease)
        $t = Test-Result "Invoice line unit ID" ($line.unitId -eq $unitAId) "Expected: $unitAId, Actual: $($line.unitId)"
        $allTests += $t
        
        if (-not $t) {
            Write-Host "Option A violation: Line should be for Unit A (included lease)" -ForegroundColor Red
            exit 1
        }
        
        # Verify line rent amount
        $t = Test-Result "Invoice line rent amount" ($line.rentAmount -eq 800000) "Expected: 800000, Actual: $($line.rentAmount)"
        $allTests += $t
        
        # Verify Unit B is NOT in any line (EXCLUDED lease)
        $unitBInLines = $invoiceLines | Where-Object { $_.unitId -eq $unitBId }
        $t = Test-Result "Unit B excluded from lines" ($unitBInLines.Count -eq 0) "Unit B should not appear in invoice lines"
        $allTests += $t
        
        if (-not $t) {
            Write-Host "Option A violation: Unit B (excluded lease) should not appear in invoice" -ForegroundColor Red
            exit 1
        }
    }
    
    # ─── Final Summary ──────────────────────────────────────────────────────────────────────────────
    
    Write-Host "`n=== BILLING SNAPSHOT E2E SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Expected included unit: $unitAId" -ForegroundColor White
    Write-Host "Expected excluded unit: $unitBId" -ForegroundColor White
    Write-Host "InvoiceId: $($currentInvoice.id)" -ForegroundColor White
    Write-Host "Subtotal: $($currentInvoice.subtotalAmount) (expected 800000)" -ForegroundColor White
    Write-Host "Fee: $($currentInvoice.feeAmount) (expected $expectedFee)" -ForegroundColor White
    Write-Host "LineCount: $($currentInvoice.lineCount) (expected 1)" -ForegroundColor White
    
    $passedCount = ($allTests | Where-Object { $_ -eq $true }).Count
    $failedCount = ($allTests | Where-Object { $_ -eq $false }).Count
    $totalCount = $allTests.Count
    
    Write-Host "`nTest Results:" -ForegroundColor White
    Write-Host "Total Tests: $totalCount" -ForegroundColor White
    Write-Host "Passed: $passedCount" -ForegroundColor Green
    Write-Host "Failed: $failedCount" -ForegroundColor Red
    
    if ($failedCount -eq 0) {
        Write-Host "`nSTATUS: PASS" -ForegroundColor Green
        Write-Host "`nOption A Billing Snapshot: ALL TESTS PASSED" -ForegroundColor Green
        Write-Host "- Lease A (before periodStart): INCLUDED in invoice" -ForegroundColor Green
        Write-Host "- Lease B (after periodStart): EXCLUDED from invoice" -ForegroundColor Green
        Write-Host "- Invoice subtotal: 800,000 UGX (Lease A only)" -ForegroundColor Green
        Write-Host "- Invoice lines: 1 line (Unit A only)" -ForegroundColor Green
        Write-Host "- Isolation: New owner/manager/property created successfully" -ForegroundColor Green
        exit 0
    }
    else {
        Write-Host "`nSTATUS: FAIL" -ForegroundColor Red
        Write-Host "`nOption A Billing Snapshot: TESTS FAILED" -ForegroundColor Red
        exit 1
    }
}
finally {
    # Clean up temp files
    foreach ($file in $tempFiles) {
        if (Test-Path $file) {
            Remove-Item $file -Force
        }
    }
}
