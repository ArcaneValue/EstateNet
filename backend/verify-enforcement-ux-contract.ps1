#!/usr/bin/env pwsh

Write-Host "ESTATE NET - Enforcement UX Contract Proof" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

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

Write-Host "STEP 1 - Create manager (no terms accepted yet)" -ForegroundColor Yellow

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$managerEmail = "ux.manager.$suffix@test.com"
$password = "Test123456"

$manager = Invoke-JsonApi -Method POST -Path '/api/auth/register/manager' -Body @{ name = 'UX Manager'; email = $managerEmail; password = $password; phoneNumber = '+256700009999' } -ExpectedStatus 201
if (-not $manager.Ok) { Fail "Manager register failed (HTTP $($manager.Status)): $($manager.Raw)" }
$managerId = $manager.Json.data.user.id
$managerToken = $manager.Json.data.token
if (-not $managerToken) { Fail "Manager register response missing data.token" }
Pass "Manager created ($managerEmail)"

Write-Host "STEP 2 - Prove 402 + requiresAction=ACCEPT_TERMS on POST /api/properties" -ForegroundColor Yellow

$blockedCreateProperty = Invoke-JsonApi -Method POST -Path '/api/properties' -Token $managerToken -Body @{ name = 'UX Property'; location = 'UX Location' } -ExpectedStatus 402
if (-not $blockedCreateProperty.Ok) { Fail "Expected 402 for create property without terms, got HTTP $($blockedCreateProperty.Status): $($blockedCreateProperty.Raw)" }
if ($blockedCreateProperty.Json.requiresAction -ne 'ACCEPT_TERMS') { Fail "Expected requiresAction=ACCEPT_TERMS. Body: $($blockedCreateProperty.Raw)" }
Pass "Create property blocked without terms (402 + requiresAction=ACCEPT_TERMS)"

Write-Host "STEP 3 - Accept terms returns data.token" -ForegroundColor Yellow

$acceptTerms = Invoke-FormApi -Method POST -Path '/api/manager/terms/accept' -Token $managerToken -ExpectedStatus 200
if (-not $acceptTerms.Ok) { Fail "Accept terms failed (HTTP $($acceptTerms.Status)): $($acceptTerms.Raw)" }
$managerTokenTerms = $acceptTerms.Json.data.token
if (-not $managerTokenTerms) { Fail "Accept terms response missing data.token" }
Pass "Terms accepted + refreshed token issued"

Write-Host "STEP 4 - Retry POST /api/properties with refreshed token succeeds (201)" -ForegroundColor Yellow

$createdProperty = Invoke-JsonApi -Method POST -Path '/api/properties' -Token $managerTokenTerms -Body @{ name = 'UX Property'; location = 'UX Location' } -ExpectedStatus 201
if (-not $createdProperty.Ok) { Fail "Expected 201 for create property after terms accepted, got HTTP $($createdProperty.Status): $($createdProperty.Raw)" }
$propertyId = $createdProperty.Json.data.id
if (-not $propertyId) { Fail "Create property response missing data.id" }
Pass "Create property allowed after terms accepted (propertyId=$propertyId)"

Write-Host "STEP 5 - Force overdue and prove 402 + requiresAction=PAY_INVOICE" -ForegroundColor Yellow

# Uses existing dev endpoint contract (owner/privileged role usually required). We re-login as manager after forcing overdue.
$forceOverdue = Invoke-JsonApi -Method POST -Path '/api/manager/billing/dev/force-overdue' -Token $managerTokenTerms -Body @{ managerId = $managerId } -ExpectedStatus 200
if (-not $forceOverdue.Ok) {
    Fail "Force overdue failed (HTTP $($forceOverdue.Status)). If this endpoint requires OWNER, run backend/verify-billing-enforcement-e2e.ps1 which uses an owner token. Body: $($forceOverdue.Raw)"
}
Pass "Manager billing forced to OVERDUE (dev endpoint)"

$managerLogin = Invoke-JsonApi -Method POST -Path '/api/auth/login' -Body @{ email = $managerEmail; password = $password } -ExpectedStatus 200
if (-not $managerLogin.Ok) { Fail "Manager re-login failed (HTTP $($managerLogin.Status)): $($managerLogin.Raw)" }
$managerTokenOverdue = $managerLogin.Json.data.token
if (-not $managerTokenOverdue) { Fail "Manager login missing data.token" }
Pass "Manager re-logged-in to refresh JWT billingStatus"

$blockedCreatePropertyOverdue = Invoke-JsonApi -Method POST -Path '/api/properties' -Token $managerTokenOverdue -Body @{ name = 'UX Property 2'; location = 'UX Location 2' } -ExpectedStatus 402
if (-not $blockedCreatePropertyOverdue.Ok) { Fail "Expected 402 for create property when overdue, got HTTP $($blockedCreatePropertyOverdue.Status): $($blockedCreatePropertyOverdue.Raw)" }
if ($blockedCreatePropertyOverdue.Json.requiresAction -ne 'PAY_INVOICE') { Fail "Expected requiresAction=PAY_INVOICE. Body: $($blockedCreatePropertyOverdue.Raw)" }
Pass "Create property blocked when billing OVERDUE (402 + requiresAction=PAY_INVOICE)"

Write-Host "UX CONTRACT PROOF COMPLETED (exit 0)" -ForegroundColor Green
exit 0
