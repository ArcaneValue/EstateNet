#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

$BaseUrl = 'http://localhost:3001'

function Fail([string]$Message) {
    Write-Host "FAIL: $Message" -ForegroundColor Red
    exit 1
}

function Pass([string]$Message) {
    Write-Host "PASS: $Message" -ForegroundColor Green
}

function New-TempJsonFile([object]$Obj) {
    $path = Join-Path $env:TEMP ("estatenet-e2e-" + [Guid]::NewGuid().ToString('N') + '.json')
    ($Obj | ConvertTo-Json -Depth 20) | Set-Content -Encoding UTF8 -Path $path
    return $path
}

function Invoke-CurlJson {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PATCH', 'DELETE')]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $false)][string]$Token,
        [Parameter(Mandatory = $false)][string]$JsonFilePath
    )

    $bodyOut = Join-Path $env:TEMP ("estatenet-e2e-body-" + [Guid]::NewGuid().ToString('N') + '.txt')
    Set-Content -Encoding UTF8 -Path $bodyOut -Value ''

    if (-not $Url) {
        Fail "Invoke-CurlJson missing Url"
    }

    $curlArgs = @(
        '--silent', '--show-error',
        '--location',
        '--request', $Method,
        '--output', $bodyOut,
        '--write-out', '%{http_code}',
        '--header', 'Accept: application/json'
    )

    if ($Token) {
        $curlArgs += @('--header', "Authorization: Bearer $Token")
    }

    if ($JsonFilePath) {
        $curlArgs += @('--header', 'Content-Type: application/json')
        $curlArgs += @('--data-binary', "@$JsonFilePath")
    }

    $curlArgs += $Url

    $curlOut = & curl.exe @curlArgs 2>&1
    $curlExit = $LASTEXITCODE
    $raw = Get-Content -Raw -Path $bodyOut

    if ($curlExit -ne 0) {
        return @{ Status = 0; Raw = ($raw + "`nCURL_EXIT=$curlExit`nCURL_OUT=$curlOut"); BodyFile = $bodyOut; CurlExit = $curlExit }
    }

    $status = [int]$curlOut

    return @{ Status = [int]$status; Raw = $raw; BodyFile = $bodyOut }
}

function Invoke-CurlFormEmptyPost {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Token
    )

    $bodyOut = Join-Path $env:TEMP ("estatenet-e2e-body-" + [Guid]::NewGuid().ToString('N') + '.txt')
    Set-Content -Encoding UTF8 -Path $bodyOut -Value ''

    if (-not $Url) {
        Fail "Invoke-CurlFormEmptyPost missing Url"
    }

    $curlArgs = @(
        '--silent', '--show-error',
        '--location',
        '--request', 'POST',
        '--output', $bodyOut,
        '--write-out', '%{http_code}',
        '--header', 'Accept: application/json',
        '--header', 'Content-Type: application/x-www-form-urlencoded',
        '--header', "Authorization: Bearer $Token",
        '--data-raw', 'x='
    )

    $curlArgs += $Url

    $curlOut = & curl.exe @curlArgs 2>&1
    $curlExit = $LASTEXITCODE
    $raw = Get-Content -Raw -Path $bodyOut

    if ($curlExit -ne 0) {
        return @{ Status = 0; Raw = ($raw + "`nCURL_EXIT=$curlExit`nCURL_OUT=$curlOut"); BodyFile = $bodyOut; CurlExit = $curlExit }
    }

    $status = [int]$curlOut

    return @{ Status = [int]$status; Raw = $raw; BodyFile = $bodyOut }
}

function Parse-JsonOrNull([string]$Raw) {
    if ($null -eq $Raw) {
        $trim = ''
    }
    else {
        $trim = $Raw.Trim()
    }
    if (-not $trim.StartsWith('{')) { return $null }
    try {
        return $trim | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Assert-Status([hashtable]$Resp, [int]$Expected, [string]$Context) {
    if ($Resp.Status -ne $Expected) {
        Fail "$Context | Expected HTTP $Expected, got $($Resp.Status). Body: $($Resp.Raw)"
    }
}

function Assert-JsonField([object]$Json, [string]$Field, [object]$Expected, [string]$Context) {
    if ($null -eq $Json) {
        Fail "$Context | Response is not valid JSON."
    }

    $value = $Json.$Field
    if ($value -ne $Expected) {
        Fail "$Context | Expected JSON.$Field == '$Expected', got '$value'. Body: $($Json | ConvertTo-Json -Depth 10)"
    }
}

Write-Host "VERIFY PHASE 1 ENFORCEMENT (curl.exe)" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Green

# Step 0 - Health
Write-Host "STEP 0 - Health" -ForegroundColor Yellow
$health = Invoke-CurlJson -Method GET -Url "$BaseUrl/health"
Assert-Status -Resp $health -Expected 200 -Context "GET /health"
Pass 'GET /health => 200'

# Step 1 - Register Manager (fresh)
Write-Host "STEP 1 - Register Manager" -ForegroundColor Yellow
$suffix = (Get-Date).ToString('yyyyMMddHHmmss') + '-' + ([Guid]::NewGuid().ToString('N').Substring(0, 6))
$managerEmail = "e2e.phase1.manager.$suffix@test.com"
$managerPassword = 'Test123456'

$mgrRegisterFile = New-TempJsonFile @{ name = 'E2E Phase1 Manager'; email = $managerEmail; phoneNumber = '+256700009999'; password = $managerPassword }
$mgrRegister = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/auth/register/manager" -JsonFilePath $mgrRegisterFile
Assert-Status -Resp $mgrRegister -Expected 201 -Context "POST /api/auth/register/manager"
$mgrRegisterJson = Parse-JsonOrNull $mgrRegister.Raw
if ($null -eq $mgrRegisterJson) { Fail "Manager register did not return JSON. Body: $($mgrRegister.Raw)" }
$managerToken = $mgrRegisterJson.data.token
$managerId = $mgrRegisterJson.data.user.id
if (-not $managerToken) { Fail "Manager register missing data.token. Body: $($mgrRegister.Raw)" }
if (-not $managerId) { Fail "Manager register missing data.user.id. Body: $($mgrRegister.Raw)" }
Pass "Manager registered => token acquired (email=$managerEmail)"

# Step 2 - Prove TERMS gate blocks growth endpoints
Write-Host "STEP 2 - Terms gate blocks POST /api/properties" -ForegroundColor Yellow
$propCreateFile = New-TempJsonFile @{ name = 'E2E Phase1 Property'; location = 'E2E Location' }
$propBlocked = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/properties" -Token $managerToken -JsonFilePath $propCreateFile
Assert-Status -Resp $propBlocked -Expected 402 -Context "POST /api/properties (terms not accepted)"
$propBlockedJson = Parse-JsonOrNull $propBlocked.Raw
Assert-JsonField -Json $propBlockedJson -Field 'success' -Expected $false -Context "POST /api/properties terms block"
Assert-JsonField -Json $propBlockedJson -Field 'requiresTermsAcceptance' -Expected $true -Context "POST /api/properties terms block"
Assert-JsonField -Json $propBlockedJson -Field 'requiresAction' -Expected 'ACCEPT_TERMS' -Context "POST /api/properties terms block"
Pass 'POST /api/properties blocked by terms gate (402 + requiresAction=ACCEPT_TERMS)'

# Step 3 - Accept Terms as Manager
Write-Host "STEP 3 - Accept terms" -ForegroundColor Yellow
$acceptTerms = Invoke-CurlFormEmptyPost -Url "$BaseUrl/api/manager/terms/accept" -Token $managerToken
Assert-Status -Resp $acceptTerms -Expected 200 -Context "POST /api/manager/terms/accept"
$acceptTermsJson = Parse-JsonOrNull $acceptTerms.Raw
if ($null -eq $acceptTermsJson) { Fail "Accept terms did not return JSON. Body: $($acceptTerms.Raw)" }
Pass "Terms accepted endpoint returned 200"

# Re-login to refresh JWT claims (design requirement)
Write-Host "STEP 3b - Re-login to refresh JWT" -ForegroundColor Yellow
$mgrLoginFile = New-TempJsonFile @{ email = $managerEmail; password = $managerPassword }
$mgrLogin = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/auth/login" -JsonFilePath $mgrLoginFile
Assert-Status -Resp $mgrLogin -Expected 200 -Context "POST /api/auth/login"
$mgrLoginJson = Parse-JsonOrNull $mgrLogin.Raw
if ($null -eq $mgrLoginJson) { Fail "Manager login did not return JSON. Body: $($mgrLogin.Raw)" }
$managerToken2 = $mgrLoginJson.data.token
if (-not $managerToken2) { Fail "Manager login missing data.token. Body: $($mgrLogin.Raw)" }
$managerToken = $managerToken2
Pass "Manager re-login => refreshed token acquired"

# Step 4 - Prove properties creation allowed (not overdue)
Write-Host "STEP 4 - Create property allowed" -ForegroundColor Yellow
$propAllowed = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/properties" -Token $managerToken -JsonFilePath $propCreateFile
Assert-Status -Resp $propAllowed -Expected 201 -Context "POST /api/properties (after terms accepted)"
$propAllowedJson = Parse-JsonOrNull $propAllowed.Raw
if ($null -eq $propAllowedJson) { Fail "Create property did not return JSON. Body: $($propAllowed.Raw)" }
Assert-JsonField -Json $propAllowedJson -Field 'success' -Expected $true -Context "POST /api/properties allowed"
$propertyId = $propAllowedJson.data.id
if (-not $propertyId) { Fail "Create property missing data.id. Body: $($propAllowed.Raw)" }
Pass "Property created (id=$propertyId)"

# Step 5 - Prove units creation allowed (not overdue)
Write-Host "STEP 5 - Create unit allowed" -ForegroundColor Yellow
$unitCreateFile = New-TempJsonFile @{ unitNumber = 'A-1'; rentAmount = 1000000 }
$unitAllowed = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/properties/$propertyId/units" -Token $managerToken -JsonFilePath $unitCreateFile
Assert-Status -Resp $unitAllowed -Expected 201 -Context "POST /api/properties/:id/units (after terms accepted)"
$unitAllowedJson = Parse-JsonOrNull $unitAllowed.Raw
if ($null -eq $unitAllowedJson) { Fail "Create unit did not return JSON. Body: $($unitAllowed.Raw)" }
Assert-JsonField -Json $unitAllowedJson -Field 'success' -Expected $true -Context "Create unit allowed"
$unitId = $unitAllowedJson.data.id
if (-not $unitId) { Fail "Create unit missing data.id. Body: $($unitAllowed.Raw)" }
Pass "Unit created (id=$unitId)"

# Step 6 - Billing overdue gate blocks growth endpoints (deterministic via dev endpoint)
Write-Host "STEP 6 - Force overdue (requires owner token)" -ForegroundColor Yellow

# Register owner (fresh)
$ownerEmail = "e2e.phase1.owner.$suffix@test.com"
$ownerRegisterFile = New-TempJsonFile @{ name = 'E2E Phase1 Owner'; email = $ownerEmail; phoneNumber = '+256700009998'; password = $managerPassword }
$ownerRegister = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/auth/register-owner" -JsonFilePath $ownerRegisterFile
Assert-Status -Resp $ownerRegister -Expected 201 -Context "POST /api/auth/register-owner"
$ownerRegisterJson = Parse-JsonOrNull $ownerRegister.Raw
if ($null -eq $ownerRegisterJson) { Fail "Owner register did not return JSON. Body: $($ownerRegister.Raw)" }
$ownerToken = $ownerRegisterJson.data.token
if (-not $ownerToken) { Fail "Owner register missing data.token. Body: $($ownerRegister.Raw)" }
Pass "Owner registered => token acquired"

# Verify dev endpoint exists by calling it
$forceOverdueFile = New-TempJsonFile @{ managerId = $managerId }
$forceOverdue = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/manager/billing/dev/force-overdue" -Token $ownerToken -JsonFilePath $forceOverdueFile
if ($forceOverdue.Status -eq 404) {
    Fail "Dev overdue endpoint missing (POST /api/manager/billing/dev/force-overdue returned 404). Cannot deterministically verify overdue enforcement. Body: $($forceOverdue.Raw)"
}
Assert-Status -Resp $forceOverdue -Expected 200 -Context "POST /api/manager/billing/dev/force-overdue"
Pass "Manager forced to OVERDUE via dev endpoint"

# Re-login manager to refresh JWT billingStatus
Write-Host "STEP 6b - Re-login manager to refresh billingStatus in JWT" -ForegroundColor Yellow
$mgrLogin2 = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/auth/login" -JsonFilePath $mgrLoginFile
Assert-Status -Resp $mgrLogin2 -Expected 200 -Context "POST /api/auth/login (after force overdue)"
$mgrLogin2Json = Parse-JsonOrNull $mgrLogin2.Raw
if ($null -eq $mgrLogin2Json) { Fail "Manager login did not return JSON. Body: $($mgrLogin2.Raw)" }
$managerTokenOverdue = $mgrLogin2Json.data.token
if (-not $managerTokenOverdue) { Fail "Manager login missing data.token. Body: $($mgrLogin2.Raw)" }

# Now growth endpoints should be blocked
Write-Host "STEP 6c - Overdue blocks POST /api/properties" -ForegroundColor Yellow
$propBlockedOverdue = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/properties" -Token $managerTokenOverdue -JsonFilePath $propCreateFile
Assert-Status -Resp $propBlockedOverdue -Expected 402 -Context "POST /api/properties (overdue)"
$propBlockedOverdueJson = Parse-JsonOrNull $propBlockedOverdue.Raw
Assert-JsonField -Json $propBlockedOverdueJson -Field 'success' -Expected $false -Context "POST /api/properties overdue block"
Assert-JsonField -Json $propBlockedOverdueJson -Field 'billingOverdue' -Expected $true -Context "POST /api/properties overdue block"
Assert-JsonField -Json $propBlockedOverdueJson -Field 'requiresAction' -Expected 'PAY_INVOICE' -Context "POST /api/properties overdue block"
Pass 'POST /api/properties blocked when overdue (402 + requiresAction=PAY_INVOICE)'

Write-Host "STEP 6d - Overdue blocks POST /api/properties/:id/units" -ForegroundColor Yellow
$unitBlockedOverdue = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/properties/$propertyId/units" -Token $managerTokenOverdue -JsonFilePath $unitCreateFile
Assert-Status -Resp $unitBlockedOverdue -Expected 402 -Context "POST /api/properties/:id/units (overdue)"
$unitBlockedOverdueJson = Parse-JsonOrNull $unitBlockedOverdue.Raw
Assert-JsonField -Json $unitBlockedOverdueJson -Field 'success' -Expected $false -Context "POST /api/properties/:id/units overdue block"
Assert-JsonField -Json $unitBlockedOverdueJson -Field 'billingOverdue' -Expected $true -Context "POST /api/properties/:id/units overdue block"
Assert-JsonField -Json $unitBlockedOverdueJson -Field 'requiresAction' -Expected 'PAY_INVOICE' -Context "POST /api/properties/:id/units overdue block"
Pass 'POST /api/properties/:id/units blocked when overdue (402 + requiresAction=PAY_INVOICE)'

# Step 7 - Control: read endpoints remain accessible
Write-Host "STEP 7 - Read endpoint accessible" -ForegroundColor Yellow
$dashboard = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/manager/dashboard" -Token $managerTokenOverdue
Assert-Status -Resp $dashboard -Expected 200 -Context "GET /api/manager/dashboard"
Pass "GET /api/manager/dashboard accessible when overdue"

Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
exit 0
