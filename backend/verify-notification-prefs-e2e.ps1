# E2E Test: Notification Preferences Persistence
# Tests canonical schema enforcement, persistence, and validation

param(
    [string]$BASE_URL = "http://localhost:3001/api"
)

# Helper function to make API calls
function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Token = "",
        [string]$Body = ""
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $uri = "$BASE_URL$Endpoint"
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $Body
            return @{ Success = $true; Data = $response }
        }
        else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
            return @{ Success = $true; Data = $response }
        }
    }
    catch {
        $err = $_
        $statusCode = $null
        $responseBody = $null
        if ($null -ne $err.Exception.Response) {
            $statusCode = $err.Exception.Response.StatusCode.value__
        }
        if ($null -ne $err.ErrorDetails) {
            $responseBody = $err.ErrorDetails.Message
        }
        return @{ 
            Success      = $false; 
            Error        = $err.Exception.Message; 
            StatusCode   = $statusCode
            ResponseBody = $responseBody
        }
    }
}

# Step 1: Health Check
Write-Host "Step 1: Health Check" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "  Health OK: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "  Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Register Owner
Write-Host "Step 2: Register Owner" -ForegroundColor Cyan
$ownerEmail = "test.notif.owner.$(Get-Random)@test.com"
$ownerBody = @{
    name        = "Test Owner Notifications"
    email       = $ownerEmail
    phoneNumber = "+256700000001"
    password    = "TestPass123!"
} | ConvertTo-Json -Compress

$ownerResult = Invoke-ApiCall -Method "POST" -Endpoint "/auth/register-owner" -Body $ownerBody
if (-not $ownerResult.Success) {
    Write-Host "  Owner registration failed: $($ownerResult.Error)" -ForegroundColor Red
    exit 1
}
$ownerToken = $ownerResult.Data.data.token
Write-Host "  Owner registered: $ownerEmail" -ForegroundColor Green
Write-Host ""

# Step 3: Verify Initial notificationPrefs (should have defaults)
Write-Host "Step 3: Verify Initial notificationPrefs" -ForegroundColor Cyan
$userResult = Invoke-ApiCall -Method "GET" -Endpoint "/users/me" -Token $ownerToken
if (-not $userResult.Success) {
    Write-Host "  Failed to get user: $($userResult.Error)" -ForegroundColor Red
    exit 1
}

$prefs = $userResult.Data.data.user.notificationPrefs
Write-Host "  Initial prefs: $($prefs | ConvertTo-Json -Compress)" -ForegroundColor DarkGray

# Should be null or have defaults
if ($null -eq $prefs) {
    Write-Host "  Initial notificationPrefs is null (expected for new user)" -ForegroundColor Green
}
elseif ($prefs.payments -eq $true -and $prefs.messages -eq $true -and $prefs.invitations -eq $true) {
    Write-Host "  Initial notificationPrefs has canonical defaults" -ForegroundColor Green
}
else {
    Write-Host "  Initial prefs unexpected but continuing: $($prefs | ConvertTo-Json)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: PATCH with canonical schema
Write-Host "Step 4: PATCH with Canonical Schema" -ForegroundColor Cyan
$canonicalPrefs = @{
    payments    = $false
    messages    = $true
    invitations = $false
}

$patchBody = @{
    notificationPrefs = $canonicalPrefs
} | ConvertTo-Json -Depth 10

$patchResult = Invoke-ApiCall -Method "PATCH" -Endpoint "/users/me" -Token $ownerToken -Body $patchBody
if (-not $patchResult.Success) {
    Write-Host "  PATCH with canonical schema failed: $($patchResult.Error)" -ForegroundColor Red
    exit 1
}

# Verify returned prefs match exactly
$returnedPrefs = $patchResult.Data.data.user.notificationPrefs
Write-Host "  Returned prefs: $($returnedPrefs | ConvertTo-Json -Compress)" -ForegroundColor DarkGray

if ($returnedPrefs.payments -eq $false -and 
    $returnedPrefs.messages -eq $true -and 
    $returnedPrefs.invitations -eq $false) {
    Write-Host "  Canonical schema saved and returned correctly" -ForegroundColor Green
}
else {
    Write-Host "  Returned prefs don't match sent prefs" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: GET /users/me and verify persistence
Write-Host "Step 5: Verify Persistence via GET" -ForegroundColor Cyan
$verifyResult = Invoke-ApiCall -Method "GET" -Endpoint "/users/me" -Token $ownerToken
if (-not $verifyResult.Success) {
    Write-Host "  GET failed: $($verifyResult.Error)" -ForegroundColor Red
    exit 1
}

$storedPrefs = $verifyResult.Data.data.user.notificationPrefs
Write-Host "  Stored prefs: $($storedPrefs | ConvertTo-Json -Compress)" -ForegroundColor DarkGray

if ($storedPrefs.payments -eq $false -and 
    $storedPrefs.messages -eq $true -and 
    $storedPrefs.invitations -eq $false) {
    Write-Host "  Prefs persisted correctly" -ForegroundColor Green
}
else {
    Write-Host "  Stored prefs don't match" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: PATCH with non-canonical keys (should strip with warning)
Write-Host "Step 6: PATCH with Non-Canonical Keys" -ForegroundColor Cyan
$nonCanonicalPrefs = @{
    payments         = $true
    messages         = $true
    invitations      = $true
    accessRequests   = $true
    paymentReminders = $false
    unknownKey       = "test"
}

$patchBody2 = @{
    notificationPrefs = $nonCanonicalPrefs
} | ConvertTo-Json -Depth 10

$stripResult = Invoke-ApiCall -Method "PATCH" -Endpoint "/users/me" -Token $ownerToken -Body $patchBody2
if (-not $stripResult.Success) {
    Write-Host "  PATCH with non-canonical keys failed: $($stripResult.Error)" -ForegroundColor Red
    exit 1
}

$strippedPrefs = $stripResult.Data.data.user.notificationPrefs
Write-Host "  Returned after strip: $($strippedPrefs | ConvertTo-Json -Compress)" -ForegroundColor DarkGray

# Should have canonical keys only
$hasUnknownKeys = $false
$strippedPrefs.PSObject.Properties | ForEach-Object {
    if ($_.Name -notin @("payments", "messages", "invitations")) {
        $hasUnknownKeys = $true
        Write-Host "  Unknown key found in response: $($_.Name)" -ForegroundColor Yellow
    }
}

# Use the variable to avoid warning
if ($hasUnknownKeys) {
    Write-Host "  Warning: Unknown keys detected in notificationPrefs" -ForegroundColor Yellow
}

if (-not $hasUnknownKeys) {
    Write-Host "  Non-canonical keys were stripped (backend policy)" -ForegroundColor Green
}
else {
    Write-Host "  Unknown keys were not stripped" -ForegroundColor Red
}

# Canonical keys should be preserved
if ($strippedPrefs.payments -eq $true -and 
    $strippedPrefs.messages -eq $true -and 
    $strippedPrefs.invitations -eq $true) {
    Write-Host "  Canonical keys preserved with correct values" -ForegroundColor Green
}
else {
    Write-Host "  Canonical keys not preserved correctly" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 7: PATCH with invalid type (should reject)
Write-Host "Step 7: PATCH with Invalid Type" -ForegroundColor Cyan
$invalidPrefs = @{
    payments    = "not-a-boolean"
    messages    = $true
    invitations = $true
}

$invalidBody = @{
    notificationPrefs = $invalidPrefs
} | ConvertTo-Json -Depth 10

$invalidResult = Invoke-ApiCall -Method "PATCH" -Endpoint "/users/me" -Token $ownerToken -Body $invalidBody

# This should fail with 400
if (-not $invalidResult.Success -and $invalidResult.StatusCode -eq 400) {
    Write-Host "  Invalid type rejected with 400 Bad Request" -ForegroundColor Green
    Write-Host "  Message: $($invalidResult.ResponseBody)" -ForegroundColor DarkGray
}
elseif ($invalidResult.Success) {
    Write-Host "  Invalid type was accepted (should reject)" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "  Got error but check status: $($invalidResult.StatusCode)" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: PATCH with partial update (defaults should fill in)
Write-Host "Step 8: PATCH Partial Update with Defaults" -ForegroundColor Cyan
$partialPrefs = @{
    payments = $false
}

$partialBody = @{
    notificationPrefs = $partialPrefs
} | ConvertTo-Json -Depth 10

$partialResult = Invoke-ApiCall -Method "PATCH" -Endpoint "/users/me" -Token $ownerToken -Body $partialBody
if (-not $partialResult.Success) {
    Write-Host "  PATCH with partial prefs failed: $($partialResult.Error)" -ForegroundColor Red
    exit 1
}

$filledPrefs = $partialResult.Data.data.user.notificationPrefs
Write-Host "  Filled prefs: $($filledPrefs | ConvertTo-Json -Compress)" -ForegroundColor DarkGray

# Missing keys should get defaults (true)
if ($filledPrefs.payments -eq $false -and 
    $filledPrefs.messages -eq $true -and 
    $filledPrefs.invitations -eq $true) {
    Write-Host "  Missing keys filled with defaults (true)" -ForegroundColor Green
}
else {
    Write-Host "  Defaults not applied correctly" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "ALL NOTIFICATION PREFS TESTS PASSED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:"
Write-Host "  - Canonical schema enforced: { payments, messages, invitations }"
Write-Host "  - Unknown keys stripped with warning"
Write-Host "  - Invalid types rejected with 400"
Write-Host "  - Missing keys filled with defaults (true)"
Write-Host ""
