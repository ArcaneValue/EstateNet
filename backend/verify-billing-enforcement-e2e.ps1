#!/usr/bin/env pwsh

Write-Host "ESTATE NET - Billing & Terms Enforcement E2E Proof" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

$BaseUrl = "http://localhost:3001"

function Fail([string]$Message) {
    Write-Host "FAIL: $Message" -ForegroundColor Red
    exit 1
}

function Pass([string]$Message) {
    Write-Host "PASS: $Message" -ForegroundColor Green
}

function Invoke-JsonApi {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PATCH', 'DELETE')]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $false)]$Body,
        [Parameter(Mandatory = $false)][string]$Token,
        [Parameter(Mandatory = $true)][int]$ExpectedStatus
    )

    $Headers = @{}
    if ($Token) { $Headers['Authorization'] = "Bearer $Token" }

    $JsonBody = $null
    if ($null -ne $Body) {
        $JsonBody = ($Body | ConvertTo-Json -Depth 10)
        $Headers['Content-Type'] = 'application/json'
    }

    try {
        $resp = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method $Method -Headers $Headers -Body $JsonBody -UseBasicParsing
        $status = [int]$resp.StatusCode
        $content = $resp.Content
    }
    catch {
        $we = $_.Exception
        if ($we.Response) {
            $status = [int]$we.Response.StatusCode.value__
            $reader = New-Object System.IO.StreamReader($we.Response.GetResponseStream())
            $content = $reader.ReadToEnd()
            $reader.Close()
        }
        else {
            throw
        }
    }

    $json = $null
    if ($content -and $content.Trim().StartsWith('{')) {
        $json = $content | ConvertFrom-Json
    }

    if ($status -ne $ExpectedStatus) {
        return @{ Ok = $false; Status = $status; Json = $json; Raw = $content }
    }

    return @{ Ok = $true; Status = $status; Json = $json; Raw = $content }
}

function Invoke-FormApi {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('POST')]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $false)][string]$Token,
        [Parameter(Mandatory = $true)][int]$ExpectedStatus
    )

    $Headers = @{'Content-Type' = 'application/x-www-form-urlencoded' }
    if ($Token) { $Headers['Authorization'] = "Bearer $Token" }

    try {
        $resp = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method $Method -Headers $Headers -Body '' -UseBasicParsing
        $status = [int]$resp.StatusCode
        $content = $resp.Content
    }
    catch {
        $we = $_.Exception
        if ($we.Response) {
            $status = [int]$we.Response.StatusCode.value__
            $reader = New-Object System.IO.StreamReader($we.Response.GetResponseStream())
            $content = $reader.ReadToEnd()
            $reader.Close()
        }
        else {
            throw
        }
    }

    $json = $null
    if ($content -and $content.Trim().StartsWith('{')) {
        $json = $content | ConvertFrom-Json
    }

    if ($status -ne $ExpectedStatus) {
        return @{ Ok = $false; Status = $status; Json = $json; Raw = $content }
    }

    return @{ Ok = $true; Status = $status; Json = $json; Raw = $content }
}

Write-Host "STEP 1 - Create users" -ForegroundColor Yellow

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$ownerEmail = "e2e.owner.$suffix@test.com"
$managerEmail = "e2e.manager.$suffix@test.com"
$tenantEmail = "e2e.tenant.$suffix@test.com"
$password = "Test123456"

$owner = Invoke-JsonApi -Method POST -Path '/api/auth/register-owner' -Body @{ name = 'E2E Owner'; email = $ownerEmail; password = $password; phoneNumber = '+256700001111' } -ExpectedStatus 201
if (-not $owner.Ok) { Fail "Owner register failed (HTTP $($owner.Status)): $($owner.Raw)" }
$ownerToken = $owner.Json.data.token
Pass "Owner created ($ownerEmail)"

$manager = Invoke-JsonApi -Method POST -Path '/api/auth/register/manager' -Body @{ name = 'E2E Manager'; email = $managerEmail; password = $password; phoneNumber = '+256700001112' } -ExpectedStatus 201
if (-not $manager.Ok) { Fail "Manager register failed (HTTP $($manager.Status)): $($manager.Raw)" }
$managerId = $manager.Json.data.user.id
$managerToken = $manager.Json.data.token
Pass "Manager created ($managerEmail)"

$tenant = Invoke-JsonApi -Method POST -Path '/api/auth/register-tenant' -Body @{ name = 'E2E Tenant'; email = $tenantEmail; password = $password; phoneNumber = '+256700001113' } -ExpectedStatus 201
if (-not $tenant.Ok) { Fail "Tenant register failed (HTTP $($tenant.Status)): $($tenant.Raw)" }
$tenantToken = $tenant.Json.data.token
$tenantId = $tenant.Json.data.user.tenantId
if (-not $tenantId) { Fail "Tenant register response missing data.user.tenantId" }
Pass "Tenant created ($tenantEmail) tenantId=$tenantId"

Write-Host "STEP 2 - Create property + unit" -ForegroundColor Yellow

$property = Invoke-JsonApi -Method POST -Path '/api/properties' -Token $ownerToken -Body @{ name = 'E2E Property'; location = 'E2E Location' } -ExpectedStatus 201
if (-not $property.Ok) { Fail "Create property failed (HTTP $($property.Status)): $($property.Raw)" }
$propertyId = $property.Json.data.id
if (-not $propertyId) { Fail "Create property response missing data.id. Body: $($property.Raw)" }
Pass "Property created (id=$propertyId)"

$unit = Invoke-JsonApi -Method POST -Path "/api/properties/$propertyId/units" -Token $ownerToken -Body @{ name = 'Unit A'; rentAmount = 100000; bedrooms = 1; bathrooms = 1 } -ExpectedStatus 201
if (-not $unit.Ok) { Fail "Create unit failed (HTTP $($unit.Status)): $($unit.Raw)" }
$unitId = $unit.Json.data.id
if (-not $unitId) { Fail "Create unit response missing data.id. Body: $($unit.Raw)" }
Pass "Unit created (id=$unitId)"

Write-Host "STEP 3 - Terms enforcement proof" -ForegroundColor Yellow

# Without terms accepted, invite must be blocked with 402 + requiresTermsAcceptance
$inviteBlocked = Invoke-JsonApi -Method POST -Path '/api/tenants/invite' -Token $managerToken -Body @{ tenantId = $tenantId; propertyId = $propertyId; unitId = $unitId; rentAmount = 100000 } -ExpectedStatus 402
if (-not $inviteBlocked.Ok) { Fail "Expected 402 for invite without terms, got HTTP $($inviteBlocked.Status): $($inviteBlocked.Raw)" }
if (-not $inviteBlocked.Json.requiresTermsAcceptance) { Fail "Expected requiresTermsAcceptance=true. Body: $($inviteBlocked.Raw)" }
Pass "Invite blocked when terms not accepted (402 + requiresTermsAcceptance=true)"

# Accept terms (form-url-encoded) and use returned refreshed token
$acceptTerms = Invoke-FormApi -Method POST -Path '/api/manager/terms/accept' -Token $managerToken -ExpectedStatus 200
if (-not $acceptTerms.Ok) { Fail "Accept terms failed (HTTP $($acceptTerms.Status)): $($acceptTerms.Raw)" }
$managerTokenTerms = $acceptTerms.Json.data.token
if (-not $managerTokenTerms) { Fail "Accept terms response missing data.token" }
Pass "Terms accepted + refreshed token issued"

# Invite should succeed now (billing CURRENT by default)
$inviteOk = Invoke-JsonApi -Method POST -Path '/api/tenants/invite' -Token $managerTokenTerms -Body @{ tenantId = $tenantId; propertyId = $propertyId; unitId = $unitId; rentAmount = 100000 } -ExpectedStatus 201
if (-not $inviteOk.Ok) { Fail "Expected 201 for invite after terms accepted, got HTTP $($inviteOk.Status): $($inviteOk.Raw)" }
$invitationId = $inviteOk.Json.data.id
if (-not $invitationId) { Fail "Invite response missing data.id" }
Pass "Invite allowed after terms accepted (invitationId=$invitationId)"

Write-Host "STEP 4 - Tenant onboarding flow (accept invitation -> lease)" -ForegroundColor Yellow

$acceptInv = Invoke-JsonApi -Method POST -Path "/api/tenants/invitations/$invitationId/accept" -Token $tenantToken -Body @{} -ExpectedStatus 200
if (-not $acceptInv.Ok) { Fail "Tenant accept invitation failed (HTTP $($acceptInv.Status)): $($acceptInv.Raw)" }
Pass "Tenant accepted invitation (lease created)"

Write-Host "STEP 5 - Generate invoice (owner/dev only)" -ForegroundColor Yellow

$periodStart = (Get-Date).AddDays(-30).ToString('yyyy-MM-dd')
$periodEnd = (Get-Date).ToString('yyyy-MM-dd')
$invoice = Invoke-JsonApi -Method POST -Path '/api/manager/billing/generate' -Token $ownerToken -Body @{ managerId = $managerId; periodStart = $periodStart; periodEnd = $periodEnd } -ExpectedStatus 201
if (-not $invoice.Ok) { Fail "Generate invoice failed (HTTP $($invoice.Status)): $($invoice.Raw)" }
$invoiceId = $invoice.Json.data.id
Pass "Invoice generated (invoiceId=$invoiceId)"

Write-Host "STEP 6 - Force overdue + prove billing enforcement" -ForegroundColor Yellow

$forceOverdue = Invoke-JsonApi -Method POST -Path '/api/manager/billing/dev/force-overdue' -Token $ownerToken -Body @{ managerId = $managerId } -ExpectedStatus 200
if (-not $forceOverdue.Ok) { Fail "Force overdue failed (HTTP $($forceOverdue.Status)): $($forceOverdue.Raw)" }
Pass "Manager billing forced to OVERDUE (dev endpoint)"

# Re-login manager to refresh token to include billingStatus=OVERDUE (enforcement reads from JWT)
$managerLogin = Invoke-JsonApi -Method POST -Path '/api/auth/login' -Body @{ email = $managerEmail; password = $password } -ExpectedStatus 200
if (-not $managerLogin.Ok) { Fail "Manager re-login failed (HTTP $($managerLogin.Status)): $($managerLogin.Raw)" }
$managerTokenOverdue = $managerLogin.Json.data.token
Pass "Manager re-logged-in to refresh JWT billingStatus"

# Now invite must be blocked with 402 + billingOverdue + requiresAction=PAY_INVOICE
$overdueInvite = Invoke-JsonApi -Method POST -Path '/api/tenants/invite' -Token $managerTokenOverdue -Body @{ tenantId = $tenantId; propertyId = $propertyId; unitId = $unitId; rentAmount = 100000 } -ExpectedStatus 402
if (-not $overdueInvite.Ok) { Fail "Expected 402 for invite when overdue, got HTTP $($overdueInvite.Status): $($overdueInvite.Raw)" }
if (-not $overdueInvite.Json.billingOverdue) { Fail "Expected billingOverdue=true. Body: $($overdueInvite.Raw)" }
if ($overdueInvite.Json.requiresAction -ne 'PAY_INVOICE') { Fail "Expected requiresAction=PAY_INVOICE. Body: $($overdueInvite.Raw)" }
Pass "Invite blocked when billing OVERDUE (402 + billingOverdue=true + requiresAction=PAY_INVOICE)"

Write-Host "STEP 7 - Read-only routes remain accessible when overdue" -ForegroundColor Yellow

$statusOk = Invoke-JsonApi -Method GET -Path '/api/manager/billing/status' -Token $managerTokenOverdue -ExpectedStatus 200
if (-not $statusOk.Ok) { Fail "Expected billing status accessible, got HTTP $($statusOk.Status): $($statusOk.Raw)" }
Pass "GET /api/manager/billing/status accessible when overdue"

$invoicesOk = Invoke-JsonApi -Method GET -Path '/api/manager/billing/invoices' -Token $managerTokenOverdue -ExpectedStatus 200
if (-not $invoicesOk.Ok) { Fail "Expected invoices accessible, got HTTP $($invoicesOk.Status): $($invoicesOk.Raw)" }
Pass "GET /api/manager/billing/invoices accessible when overdue"

$dashboardOk = Invoke-JsonApi -Method GET -Path '/api/manager/dashboard' -Token $managerTokenOverdue -ExpectedStatus 200
if (-not $dashboardOk.Ok) { Fail "Expected dashboard accessible, got HTTP $($dashboardOk.Status): $($dashboardOk.Raw)" }
Pass "GET /api/manager/dashboard accessible when overdue"

Write-Host "E2E PROOF COMPLETED (exit 0)" -ForegroundColor Green
exit 0
