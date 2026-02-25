# Service-Charge Payment E2E Verification
# Tests: initiate payment -> mock webhook -> invoice PAID -> manager unlocked
# PowerShell 5.1 compatible

param(
    [string]$BackendUrl = "http://localhost:3001",
    [switch]$Verbose
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
        $headers = @{}
        $headers["Content-Type"] = "application/json"
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $headerArgs = $headers.GetEnumerator() | ForEach-Object { "-H", "$($_.Key): $($_.Value)" }
        
        if ($Body) {
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

function Write-JsonToTempFile {
    param([hashtable]$Data)
    $json = $Data | ConvertTo-Json -Depth 10
    $tempFile = [System.IO.Path]::GetTempFileName() + ".json"
    $json | Out-File -FilePath $tempFile -Encoding UTF8
    return $tempFile
}

Write-Host "=== Service-Charge Payment E2E Verification ===" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl"
Write-Host ""

$allTests = @()

# ─── 1. Health check ─────────────────────────────────────────────────────────

Write-Host "1. Backend Health Check" -ForegroundColor Yellow
$health = Invoke-Api -Method "GET" -Endpoint "/health"
$t = Test-Result "Backend reachable" ($health.StatusCode -eq 200) "Status: $($health.StatusCode)"
$allTests += $t
if (-not $t) {
    Write-Host "Backend not reachable. Exiting." -ForegroundColor Red
    exit 1
}

# ─── 2. Register Owner ───────────────────────────────────────────────────────

Write-Host "`n2. Register Owner" -ForegroundColor Yellow
$ownerEmail = "e2e-owner-$(Get-Random -Maximum 99999)@test.com"
$f = Write-JsonToTempFile @{ name = "E2E Owner"; email = $ownerEmail; phoneNumber = "+256700000001"; password = "TestPass123" }
$ownerRes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-owner" -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Owner registered" ($ownerRes.StatusCode -eq 201) "Email: $ownerEmail"
$allTests += $t
$ownerToken = $ownerRes.Body.data.token
$ownerId = $ownerRes.Body.data.user.id

# ─── 3. Register Manager ─────────────────────────────────────────────────────

Write-Host "`n3. Register Manager" -ForegroundColor Yellow
$managerEmail = "e2e-mgr-$(Get-Random -Maximum 99999)@test.com"
$f = Write-JsonToTempFile @{ name = "E2E Manager"; email = $managerEmail; phoneNumber = "+256771234567"; password = "TestPass123" }
$mgrRes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register/manager" -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Manager registered" ($mgrRes.StatusCode -eq 201) "Email: $managerEmail"
$allTests += $t
$managerToken = $mgrRes.Body.data.token
$managerId = $mgrRes.Body.data.user.id
Write-Host "    Manager ID: $managerId" -ForegroundColor Gray

# ─── 4. Accept Manager Terms ─────────────────────────────────────────────────

Write-Host "`n4. Accept Manager Terms" -ForegroundColor Yellow
$termsRes = Invoke-Api -Method "POST" -Endpoint "/api/manager/terms/accept" -Token $managerToken
$t = Test-Result "Terms accepted" ($termsRes.StatusCode -eq 200)
$allTests += $t
if ($termsRes.Body.data.token) {
    $managerToken = $termsRes.Body.data.token
}

# ─── 5. Create Property ──────────────────────────────────────────────────────

Write-Host "`n5. Create Property" -ForegroundColor Yellow
$f = Write-JsonToTempFile @{ name = "E2E Property $(Get-Random -Maximum 999)"; location = "Kampala, Uganda" }
$propRes = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Property created" ($propRes.StatusCode -eq 201)
$allTests += $t
$propertyId = $propRes.Body.data.id
Write-Host "    Property ID: $propertyId" -ForegroundColor Gray

# ─── 6. Create Unit ──────────────────────────────────────────────────────────

Write-Host "`n6. Create Unit" -ForegroundColor Yellow
$f = Write-JsonToTempFile @{ unitNumber = "U$(Get-Random -Maximum 99)"; rentAmount = 500000 }
$unitRes = Invoke-Api -Method "POST" -Endpoint "/api/properties/$propertyId/units" -Token $managerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Unit created" ($unitRes.StatusCode -eq 201)
$allTests += $t
$unitId = $unitRes.Body.data.id
Write-Host "    Unit ID: $unitId" -ForegroundColor Gray

# ─── 7. Create Tenant ────────────────────────────────────────────────────────

Write-Host "`n7. Create Tenant" -ForegroundColor Yellow
$tenantEmail = "e2e-tenant-$(Get-Random -Maximum 99999)@test.com"
$f = Write-JsonToTempFile @{ name = "E2E Tenant"; email = $tenantEmail; password = "TestPass123" }
$tenantRes = Invoke-Api -Method "POST" -Endpoint "/api/auth/register-tenant" -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Tenant created" ($tenantRes.StatusCode -eq 201)
$allTests += $t
$tenantId = $tenantRes.Body.data.user.tenantId
Write-Host "    Tenant ID: $tenantId" -ForegroundColor Gray

# ─── 8. Create Lease ─────────────────────────────────────────────────────────

Write-Host "`n8. Create Lease" -ForegroundColor Yellow
$startDate = (Get-Date).AddMonths(-1).ToString("yyyy-MM-dd")
$f = Write-JsonToTempFile @{ tenantId = $tenantId; propertyId = $propertyId; unitId = $unitId; rentAmount = 500000; startDate = $startDate; status = "ACTIVE" }
$leaseRes = Invoke-Api -Method "POST" -Endpoint "/api/leases" -Token $managerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Lease created" ($leaseRes.StatusCode -eq 201)
$allTests += $t

# ─── 9. Generate Invoice via OWNER dev endpoint ──────────────────────────────

Write-Host "`n9. Generate Invoice (owner generate endpoint)" -ForegroundColor Cyan

$now = Get-Date
$periodStart = (Get-Date -Year $now.Year -Month $now.Month -Day 1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$periodEnd = (Get-Date -Year $now.Year -Month $now.Month -Day ([DateTime]::DaysInMonth($now.Year, $now.Month))).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$genBodyObj = @{
    managerId   = $managerId
    periodStart = $periodStart
    periodEnd   = $periodEnd
}
$genBodyJson = $genBodyObj | ConvertTo-Json -Depth 5

$genFile = [System.IO.Path]::GetTempFileName()
$genBodyJson | Out-File -FilePath $genFile -Encoding UTF8 -NoNewline

$genRes = Invoke-Api -Method "POST" -Endpoint "/api/manager/billing/generate" -Token $ownerToken -Body $genFile
Remove-Item $genFile -ErrorAction SilentlyContinue

if ($genRes.StatusCode -eq 201 -or $genRes.StatusCode -eq 200) {
    $t = Test-Result "Invoice generated" $true
}
else {
    $t = Test-Result "Invoice generation failed" $false "Status=$($genRes.StatusCode) Body=$($genRes.RawBody)"
    $allTests += $t
    exit 1
}
$allTests += $t

# ─── 10. Verify Invoice Exists ────────────────────────────────────────────────

Write-Host "`n10. Verify Invoice Exists" -ForegroundColor Yellow
$invRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/invoices" -Token $managerToken
$t = Test-Result "Invoices endpoint OK" ($invRes.StatusCode -eq 200)
$allTests += $t

$invoices = $invRes.Body.data
$payableInvoice = $null
foreach ($inv in $invoices) {
    if ($inv.status -eq "DUE" -or $inv.status -eq "OVERDUE") {
        $payableInvoice = $inv
        break
    }
}

$t = Test-Result "Payable invoice found" ($null -ne $payableInvoice) $(if ($payableInvoice) { "ID: $($payableInvoice.id) Status: $($payableInvoice.status) Service Fee Due: $($payableInvoice.feeAmount)" } else { "No DUE/OVERDUE invoice" })
$allTests += $t

if (-not $payableInvoice) {
    Write-Host "No payable invoice found. Cannot continue payment test." -ForegroundColor Red
    Write-Host "    Invoices returned: $($invoices.Count)" -ForegroundColor Gray
    foreach ($inv in $invoices) {
        Write-Host "    - $($inv.id) status=$($inv.status)" -ForegroundColor Gray
    }
    exit 1
}

$invoiceId = $payableInvoice.id

# ─── 11. Force Manager OVERDUE ────────────────────────────────────────────────

Write-Host "`n11. Force Manager OVERDUE" -ForegroundColor Yellow
$f = Write-JsonToTempFile @{ managerId = $managerId }
$forceRes = Invoke-Api -Method "POST" -Endpoint "/api/manager/billing/dev/force-overdue" -Token $ownerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Manager forced OVERDUE" ($forceRes.StatusCode -eq 200)
$allTests += $t

# ─── 12. Verify Enforcement Blocks Manager ────────────────────────────────────

Write-Host "`n12. Verify Enforcement Blocks Manager" -ForegroundColor Yellow
$f = Write-JsonToTempFile @{ name = "Should Be Blocked"; location = "Nowhere" }
$blockedRes = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Manager blocked (402)" ($blockedRes.StatusCode -eq 402) "requiresAction: $($blockedRes.Body.requiresAction)"
$allTests += $t

# ─── 13. Initiate Payment ─────────────────────────────────────────────────────

Write-Host "`n13. Initiate Payment" -ForegroundColor Yellow
$f = Write-JsonToTempFile @{ phoneNumber = "0771234567"; network = "MTN" }
$payRes = Invoke-Api -Method "POST" -Endpoint "/api/manager/billing/invoices/$invoiceId/pay" -Token $managerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Payment initiated" ($payRes.StatusCode -eq 201) "Status: $($payRes.Body.data.status)"
$allTests += $t

$paymentId = $payRes.Body.data.paymentId
$externalRef = $payRes.Body.data.externalRef
Write-Host "    Payment ID: $paymentId" -ForegroundColor Gray
Write-Host "    External Ref: $externalRef" -ForegroundColor Gray

# ─── 14. Poll Payment Status (should be PENDING) ──────────────────────────────

Write-Host "`n14. Poll Payment Status (PENDING)" -ForegroundColor Yellow
$pollRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/payments/$paymentId" -Token $managerToken

$t = Test-Result "Payment status is PENDING" ($pollRes.StatusCode -eq 200 -and $pollRes.Body.data.status -eq "PENDING") "Status: $($pollRes.Body.data.status)"
$allTests += $t

# ─── 15. Send Mock Webhook (SUCCESS) ──────────────────────────────────────────

Write-Host "`n15. Send Mock Webhook (SUCCESS)" -ForegroundColor Yellow
$webhookBody = @{
    externalRef  = $externalRef
    status       = "SUCCESS"
    providerTxId = "MOCK-TX-E2E-$(Get-Random -Maximum 99999)"
}
$f = Write-JsonToTempFile $webhookBody
$whRes = Invoke-Api -Method "POST" -Endpoint "/api/payments/webhook/mock" -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Webhook processed" ($whRes.StatusCode -eq 200 -and $whRes.Body.success -eq $true) "Payment status: $($whRes.Body.data.status)"
$allTests += $t

# ─── 16. Poll Payment Status (should be SUCCESS) ──────────────────────────────

Write-Host "`n16. Poll Payment Status (SUCCESS)" -ForegroundColor Yellow
$pollRes2 = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/payments/$paymentId" -Token $managerToken

$t = Test-Result "Payment status is SUCCESS" ($pollRes2.StatusCode -eq 200 -and $pollRes2.Body.data.status -eq "SUCCESS") "Status: $($pollRes2.Body.data.status)"
$allTests += $t

# ─── 17. Verify Invoice is PAID ───────────────────────────────────────────────

Write-Host "`n17. Verify Invoice is PAID" -ForegroundColor Yellow
$statusRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/status" -Token $managerToken

# The current invoice should now be null (it was paid) or the status should be PAID
$currentInv = $statusRes.Body.data.currentInvoice
$billingStatus = $statusRes.Body.data.billingStatus

$t = Test-Result "Billing status is CURRENT" ($billingStatus -eq "CURRENT") "billingStatus: $billingStatus"
$allTests += $t

# Also check the specific invoice via the invoices list
$invListRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/invoices" -Token $managerToken
$paidInvoice = $null
foreach ($inv in $invListRes.Body.data) {
    if ($inv.id -eq $invoiceId) {
        $paidInvoice = $inv
        break
    }
}

$t = Test-Result "Invoice status is PAID" ($null -ne $paidInvoice -and $paidInvoice.status -eq "PAID") $(if ($paidInvoice) { "Status: $($paidInvoice.status)" } else { "Invoice not found in list" })
$allTests += $t

# ─── 18. Verify Manager is Unlocked (enforcement cleared) ─────────────────────

Write-Host "`n18. Verify Manager Unlocked" -ForegroundColor Yellow
$f = Write-JsonToTempFile @{ name = "Unlocked Property $(Get-Random -Maximum 999)"; location = "Kampala" }
$unlockedRes = Invoke-Api -Method "POST" -Endpoint "/api/properties" -Token $managerToken -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Manager can create property (201)" ($unlockedRes.StatusCode -eq 201) "Status: $($unlockedRes.StatusCode)"
$allTests += $t

# ─── 19. Idempotency: re-send webhook ─────────────────────────────────────────

Write-Host "`n19. Webhook Idempotency" -ForegroundColor Yellow
$f = Write-JsonToTempFile $webhookBody
$whRes2 = Invoke-Api -Method "POST" -Endpoint "/api/payments/webhook/mock" -Body $f
Remove-Item $f -ErrorAction SilentlyContinue

$t = Test-Result "Duplicate webhook returns 200 OK" ($whRes2.StatusCode -eq 200) "Message: $($whRes2.Body.message)"
$allTests += $t

# ─── 20. Manager Service Payments List ────────────────────────────────────────

Write-Host "`n20. Manager Service Payments List" -ForegroundColor Yellow
$spListRes = Invoke-Api -Method "GET" -Endpoint "/api/manager/billing/service-payments?limit=10" -Token $managerToken

$spList = $spListRes.Body.data
$successPayment = $null
if ($spList -and $spList.Count -gt 0) {
    foreach ($sp in $spList) {
        if ($sp.status -eq "SUCCESS") {
            $successPayment = $sp
            break
        }
    }
}

$t = Test-Result "Service payments list returns 200" ($spListRes.StatusCode -eq 200) "Status: $($spListRes.StatusCode)"
$allTests += $t

$t = Test-Result "List contains SUCCESS payment" ($null -ne $successPayment) $(if ($successPayment) { "Ref: $($successPayment.externalRef)" } else { "No SUCCESS payment found" })
$allTests += $t

$t = Test-Result "SUCCESS payment has providerTxId" ($null -ne $successPayment -and $null -ne $successPayment.providerTxId -and $successPayment.providerTxId -ne "") "providerTxId: $($successPayment.providerTxId)"
$allTests += $t

$t = Test-Result "SUCCESS payment has externalRef" ($null -ne $successPayment -and $null -ne $successPayment.externalRef -and $successPayment.externalRef -ne "") "externalRef: $($successPayment.externalRef)"
$allTests += $t

# ─── 21. Owner Service Payments List ─────────────────────────────────────────

Write-Host "`n21. Owner Service Payments List" -ForegroundColor Yellow
$ownerSpRes = Invoke-Api -Method "GET" -Endpoint "/api/owner/billing/service-payments?limit=10" -Token $ownerToken

$t = Test-Result "Owner service payments returns 200" ($ownerSpRes.StatusCode -eq 200) "Status: $($ownerSpRes.StatusCode)"
$allTests += $t

$ownerSpList = $ownerSpRes.Body.data
$ownerSuccessPay = $null
if ($ownerSpList -and $ownerSpList.Count -gt 0) {
    foreach ($sp in $ownerSpList) {
        if ($sp.status -eq "SUCCESS") {
            $ownerSuccessPay = $sp
            break
        }
    }
}

$t = Test-Result "Owner list contains SUCCESS payment with manager info" ($null -ne $ownerSuccessPay -and $null -ne $ownerSuccessPay.manager) $(if ($ownerSuccessPay.manager) { "Manager: $($ownerSuccessPay.manager.email)" } else { "No manager info" })
$allTests += $t

# ─── Summary ──────────────────────────────────────────────────────────────────

Write-Host "`n=== E2E VERIFICATION SUMMARY ===" -ForegroundColor Cyan

$passedCount = ($allTests | Where-Object { $_ -eq $true }).Count
$totalCount = $allTests.Count

Write-Host "Tests Passed: $passedCount/$totalCount" -ForegroundColor $(if ($passedCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($passedCount -eq $totalCount) {
    Write-Host "Service-charge payment flow VERIFIED!" -ForegroundColor Green
}
else {
    Write-Host "Some tests failed. Review output above." -ForegroundColor Red
    exit 1
}
