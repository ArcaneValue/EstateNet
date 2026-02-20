# E2E Payments MVP Test Script
# Tests: Lease creation -> Payment recording -> Manager visibility

param (
    [string]$BaseUrl = "http://localhost:3001"
)

# Helper function for API calls
function Invoke-SafeApiCall {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Token,
        [string]$Body = $null
    )
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
        }
        
        if ($Token) {
            $headers['Authorization'] = "Bearer $Token"
        }
        
        $params = @{
            Method  = $Method
            Uri     = $Url
            Headers = $headers
        }
        
        if ($Body) {
            $params['Body'] = $Body
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Body = $response }
    }
    catch {
        return @{ 
            Success = $false; 
            Body    = $_.Exception.Message 
        }
    }
}

# Helper function to create temp JSON file
function Write-JsonTempFile {
    param(
        [hashtable]$Data,
        [string]$FileName
    )
    $tempPath = Join-Path $env:TEMP $FileName
    $Data | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempPath -Encoding utf8
    return $tempPath
}

Write-Host "=== PAYMENTS MVP E2E TEST ===" -ForegroundColor Cyan

# Step 0: Health Check
Write-Host "`n[0] Health Check" -ForegroundColor Yellow
$healthResponse = Invoke-SafeApiCall -Method "GET" -Url "$BaseUrl/health"
if (-not $healthResponse.Success) {
    Write-Host "FAIL: Health check failed: $($healthResponse.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Health OK" -ForegroundColor Green

# Step 1: Register Owner
Write-Host "`n[1] Register Owner" -ForegroundColor Yellow
$ownerData = @{
    name        = "Payments Test Owner"
    email       = "payments.test.owner.$(Get-Random).test.com"
    password    = "TestPass123!"
    phoneNumber = "+256700000001"
}
$ownerJsonFile = Write-JsonTempFile -Data $ownerData -FileName "owner_register.json"
$ownerResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/auth/register" -Body (Get-Content $ownerJsonFile -Raw)
Remove-Item $ownerJsonFile

if (-not $ownerResponse.Success -or -not $ownerResponse.Body.success) {
    Write-Host "FAIL: Owner registration failed: $($ownerResponse.Body)" -ForegroundColor Red
    exit 1
}
$ownerToken = $ownerResponse.Body.data.token
Write-Host "PASS: Owner registered: $($ownerResponse.Body.data.email)" -ForegroundColor Green

# Step 2: Register Manager
Write-Host "`n[2] Register Manager" -ForegroundColor Yellow
$managerData = @{
    name        = "Payments Test Manager"
    email       = "payments.test.manager.$(Get-Random).test.com"
    password    = "TestPass123!"
    phoneNumber = "+256700000002"
}
$managerJsonFile = Write-JsonTempFile -Data $managerData -FileName "manager_register.json"
$managerResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/auth/register" -Body (Get-Content $managerJsonFile -Raw)
Remove-Item $managerJsonFile

if (-not $managerResponse.Success -or -not $managerResponse.Body.success) {
    Write-Host "FAIL: Manager registration failed: $($managerResponse.Body)" -ForegroundColor Red
    exit 1
}
$managerToken = $managerResponse.Body.data.token
$managerId = $managerResponse.Body.data.id
Write-Host "PASS: Manager registered: $($managerResponse.Body.data.email)" -ForegroundColor Green

# Step 3: Register Tenant
Write-Host "`n[3] Register Tenant" -ForegroundColor Yellow
$tenantData = @{
    name        = "Payments Test Tenant"
    email       = "payments.test.tenant.$(Get-Random).test.com"
    password    = "TestPass123!"
    phoneNumber = "+256700000003"
}
$tenantJsonFile = Write-JsonTempFile -Data $tenantData -FileName "tenant_register.json"
$tenantResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/auth/register" -Body (Get-Content $tenantJsonFile -Raw)
Remove-Item $tenantJsonFile

if (-not $tenantResponse.Success -or -not $tenantResponse.Body.success) {
    Write-Host "FAIL: Tenant registration failed: $($tenantResponse.Body)" -ForegroundColor Red
    exit 1
}
$tenantToken = $tenantResponse.Body.data.token
$tenantId = $tenantResponse.Body.data.user.tenantId
Write-Host "PASS: Tenant registered: $($tenantResponse.Body.data.email), tenantId: $tenantId" -ForegroundColor Green

# Step 4: Owner creates property
Write-Host "`n[4] Owner creates property" -ForegroundColor Yellow
$propertyData = @{
    name     = "Payments Test Property"
    location = "Test Location"
    units    = @(
        @{ unitNumber = "P101"; rentAmount = 100000 }
        @{ unitNumber = "P102"; rentAmount = 120000 }
    )
}
$propertyJsonFile = Write-JsonTempFile -Data $propertyData -FileName "property_create.json"
$propertyResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/properties" -Token $ownerToken -Body (Get-Content $propertyJsonFile -Raw)
Remove-Item $propertyJsonFile

if (-not $propertyResponse.Success -or -not $propertyResponse.Body.success) {
    Write-Host "FAIL: Property creation failed: $($propertyResponse.Body)" -ForegroundColor Red
    exit 1
}
$propertyId = $propertyResponse.Body.data.id
Write-Host "PASS: Property created: $($propertyResponse.Body.data.name)" -ForegroundColor Green

# Step 5: Owner invites manager
Write-Host "`n[5] Owner invites manager" -ForegroundColor Yellow
$managerInviteData = @{
    managerId  = $managerId
    propertyId = $propertyId
}
$managerInviteJsonFile = Write-JsonTempFile -Data $managerInviteData -FileName "manager_invite.json"
$managerInviteResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/owner-manager-invitations" -Token $ownerToken -Body (Get-Content $managerInviteJsonFile -Raw)
Remove-Item $managerInviteJsonFile

if (-not $managerInviteResponse.Success -or -not $managerInviteResponse.Body.success) {
    Write-Host "FAIL: Manager invitation failed: $($managerInviteResponse.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Manager invited" -ForegroundColor Green

# Step 6: Manager accepts invitation
Write-Host "`n[6] Manager accepts invitation" -ForegroundColor Yellow
$managerAcceptResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/owner-manager-invitations/accept" -Token $managerToken

if (-not $managerAcceptResponse.Success -or -not $managerAcceptResponse.Body.success) {
    Write-Host "FAIL: Manager accept invitation failed: $($managerAcceptResponse.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Manager accepted invitation" -ForegroundColor Green

# Step 7: Manager invites tenant
Write-Host "`n[7] Manager invites tenant" -ForegroundColor Yellow
$tenantInviteData = @{
    tenantId   = $tenantId
    propertyId = $propertyId
    unitId     = $propertyResponse.Body.data.units[0].id  # First unit
    rentAmount = 100000
}
$tenantInviteJsonFile = Write-JsonTempFile -Data $tenantInviteData -FileName "tenant_invite.json"
$tenantInviteResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/tenants/invite" -Token $managerToken -Body (Get-Content $tenantInviteJsonFile -Raw)
Remove-Item $tenantInviteJsonFile

if (-not $tenantInviteResponse.Success -or -not $tenantInviteResponse.Body.success) {
    Write-Host "FAIL: Tenant invitation failed: $($tenantInviteResponse.Body)" -ForegroundColor Red
    exit 1
}
$invitationId = $tenantInviteResponse.Body.data.id
Write-Host "PASS: Tenant invited: invitationId $invitationId" -ForegroundColor Green

# Step 8: Tenant accepts invitation
Write-Host "`n[8] Tenant accepts invitation" -ForegroundColor Yellow
$tenantAcceptResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/tenants/invitations/$invitationId/accept" -Token $tenantToken

if (-not $tenantAcceptResponse.Success -or -not $tenantAcceptResponse.Body.success) {
    Write-Host "FAIL: Tenant accept invitation failed: $($tenantAcceptResponse.Body)" -ForegroundColor Red
    exit 1
}
$leaseId = $tenantAcceptResponse.Body.data.lease.id
Write-Host "PASS: Tenant accepted invitation, lease created: $leaseId" -ForegroundColor Green

# Step 9: Tenant records payment
Write-Host "`n[9] Tenant records payment" -ForegroundColor Yellow
$now = Get-Date
$paymentData = @{
    amount        = 100000
    paymentDate   = $now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    dueDate       = $now.ToString("yyyy-MM-01T00:00:00.000Z")
    paymentMethod = "MOBILE_MONEY"
    transactionId = "TXN_PAYMENTS_TEST"
}
$paymentJsonFile = Write-JsonTempFile -Data $paymentData -FileName "payment_record.json"
$paymentResponse = Invoke-SafeApiCall -Method "POST" -Url "$BaseUrl/api/payments" -Token $tenantToken -Body (Get-Content $paymentJsonFile -Raw)
Remove-Item $paymentJsonFile

if (-not $paymentResponse.Success -or -not $paymentResponse.Body.success) {
    Write-Host "FAIL: Payment recording failed: $($paymentResponse.Body)" -ForegroundColor Red
    exit 1
}
$paymentId = $paymentResponse.Body.data.id
$paymentAmount = $paymentResponse.Body.data.amount
Write-Host "PASS: Payment recorded: $paymentId, amount: UGX $paymentAmount" -ForegroundColor Green

# Step 10: Manager verifies payment visibility
Write-Host "`n[10] Manager verifies payments" -ForegroundColor Yellow

# A) GET /api/payments returns the payment
Write-Host "A) Checking manager payments list..." -ForegroundColor Cyan
$managerPaymentsResponse = Invoke-SafeApiCall -Method "GET" -Url "$BaseUrl/api/payments" -Token $managerToken
if (-not $managerPaymentsResponse.Success) {
    Write-Host "FAIL: Get manager payments failed: $($managerPaymentsResponse.Body)" -ForegroundColor Red
    exit 1
}

$managerPayments = $managerPaymentsResponse.Body.data
$foundPayment = $managerPayments | Where-Object { $_.id -eq $paymentId }
if (-not $foundPayment) {
    Write-Host "FAIL: Payment not found in manager list" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Payment found in manager list, amount: UGX $($foundPayment.amount)" -ForegroundColor Green

# B) GET /api/payments/summary reflects the payment
Write-Host "B) Checking payment summary..." -ForegroundColor Cyan
$summaryResponse = Invoke-SafeApiCall -Method "GET" -Url "$BaseUrl/api/payments/summary" -Token $managerToken
if (-not $summaryResponse.Success) {
    Write-Host "FAIL: Get payment summary failed: $($summaryResponse.Body)" -ForegroundColor Red
    exit 1
}

$summary = $summaryResponse.Body.data
if ($summary.totalPaid -lt $paymentAmount) {
    Write-Host "FAIL: Summary totalPaid ($($summary.totalPaid)) less than payment amount ($paymentAmount)" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Summary reflects payment - Total Paid: UGX $($summary.totalPaid)" -ForegroundColor Green

# C) Tenant can see their own payment
Write-Host "C) Checking tenant payments list..." -ForegroundColor Cyan
$tenantPaymentsResponse = Invoke-SafeApiCall -Method "GET" -Url "$BaseUrl/api/payments" -Token $tenantToken
if (-not $tenantPaymentsResponse.Success) {
    Write-Host "FAIL: Get tenant payments failed: $($tenantPaymentsResponse.Body)" -ForegroundColor Red
    exit 1
}

$tenantPayments = $tenantPaymentsResponse.Body.data
$tenantFoundPayment = $tenantPayments | Where-Object { $_.id -eq $paymentId }
if (-not $tenantFoundPayment) {
    Write-Host "FAIL: Payment not found in tenant list" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Payment found in tenant list" -ForegroundColor Green

Write-Host "`n=== E2E TEST PASSED ===" -ForegroundColor Green
Write-Host "✅ Lease created and accepted" -ForegroundColor Green
Write-Host "✅ Payment recorded by tenant" -ForegroundColor Green
Write-Host "✅ Payment visible to manager" -ForegroundColor Green
Write-Host "✅ Payment summary updated" -ForegroundColor Green
Write-Host "✅ Payment visible to tenant" -ForegroundColor Green
Write-Host "`nPayments MVP is working correctly!" -ForegroundColor Cyan
