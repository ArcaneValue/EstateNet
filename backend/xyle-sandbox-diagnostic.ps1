# ============================================================================
# XYLE SANDBOX API KEY DIAGNOSTIC SCRIPT
# ============================================================================
# Purpose: Diagnose why a Xyle sandbox key might be failing with 
#          "Invalid or expired token" errors
# Usage:   Run this script in PowerShell after setting $env:XYLE_SANDBOX_API_KEY
# ============================================================================

# Set the Xyle sandbox API key
$env:XYLE_SANDBOX_API_KEY = "xyl_d3c25c7f9b713c79cf9084c06e40e0eebab8256a6e636b2584138a5e861951b6"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "XYLE SANDBOX API KEY DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$diagnosticResults = @{
    KeySet            = $false
    KeyFormatOK       = $false
    EndpointReachable = $false
    NetworkOK         = $false
    APICallSuccessful = $false
}

# ============================================================================
# PHASE 1: ENVIRONMENT VARIABLE CHECK
# ============================================================================
Write-Host "[PHASE 1] Checking Environment Variable..." -ForegroundColor Yellow

if ($env:XYLE_SANDBOX_API_KEY) {
    Write-Host "✓ XYLE_SANDBOX_API_KEY is set" -ForegroundColor Green
    $diagnosticResults.KeySet = $true
}
else {
    Write-Host "✗ XYLE_SANDBOX_API_KEY is NOT set" -ForegroundColor Red
    Write-Host "`nACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "Set your Xyle sandbox API key using one of these methods:`n"
    Write-Host "  Option 1 (Current session only):" -ForegroundColor Cyan
    Write-Host '    $env:XYLE_SANDBOX_API_KEY = "your_sandbox_key_here"' -ForegroundColor White
    Write-Host "`n  Option 2 (Persistent - User level):" -ForegroundColor Cyan
    Write-Host '    [System.Environment]::SetEnvironmentVariable("XYLE_SANDBOX_API_KEY", "your_key", "User")' -ForegroundColor White
    Write-Host "`n  Option 3 (Persistent - System level, requires admin):" -ForegroundColor Cyan
    Write-Host '    [System.Environment]::SetEnvironmentVariable("XYLE_SANDBOX_API_KEY", "your_key", "Machine")' -ForegroundColor White
    Write-Host "`nAfter setting the key, restart PowerShell and run this script again.`n" -ForegroundColor Yellow
    
    # Exit early if key not set
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✗ Key is NOT set - Cannot proceed with further checks" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    exit 1
}

# ============================================================================
# PHASE 2: KEY FORMAT CHECK
# ============================================================================
Write-Host "`n[PHASE 2] Checking Key Format..." -ForegroundColor Yellow

$key = $env:XYLE_SANDBOX_API_KEY
$keyLength = $key.Length
$hasSpaces = $key.Contains(' ')
$hasNewlines = $key.Contains("`n") -or $key.Contains("`r")

Write-Host "  Key Length: $keyLength characters" -ForegroundColor White

# Show masked key preview
if ($keyLength -ge 15) {
    $firstChars = $key.Substring(0, [Math]::Min(10, $keyLength))
    $lastChars = $key.Substring([Math]::Max(0, $keyLength - 5))
    Write-Host "  Key Preview: $firstChars...$lastChars" -ForegroundColor White
}
elseif ($keyLength -gt 0) {
    Write-Host "  Key Preview: $($key.Substring(0, [Math]::Min(5, $keyLength)))..." -ForegroundColor White
}

# Check for format issues
$formatIssues = @()

if ($hasSpaces) {
    $formatIssues += "Contains spaces"
    Write-Host "  ⚠ WARNING: Key contains spaces" -ForegroundColor Yellow
}

if ($hasNewlines) {
    $formatIssues += "Contains newlines"
    Write-Host "  ⚠ WARNING: Key contains newline characters" -ForegroundColor Yellow
}

if ($keyLength -lt 20) {
    $formatIssues += "Key seems too short"
    Write-Host "  ⚠ WARNING: Key seems unusually short (< 20 chars)" -ForegroundColor Yellow
}

if ($formatIssues.Count -eq 0) {
    Write-Host "✓ Key format looks correct" -ForegroundColor Green
    $diagnosticResults.KeyFormatOK = $true
}
else {
    Write-Host "✗ Key format issues detected: $($formatIssues -join ', ')" -ForegroundColor Red
    Write-Host "`nACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "  Try trimming whitespace:" -ForegroundColor Cyan
    Write-Host '    $env:XYLE_SANDBOX_API_KEY = $env:XYLE_SANDBOX_API_KEY.Trim()' -ForegroundColor White
}

# Check key type (sandbox vs live)
Write-Host "`n  Checking key type..." -ForegroundColor White
$commonSandboxPrefixes = @('sk_sandbox_', 'test_', 'sandbox_', 'sb_')
$commonLivePrefixes = @('sk_live_', 'prod_', 'live_', 'pk_')

$isSandboxKey = $false
foreach ($prefix in $commonSandboxPrefixes) {
    if ($key.StartsWith($prefix)) {
        Write-Host "  ✓ Key appears to be a sandbox key (starts with '$prefix')" -ForegroundColor Green
        $isSandboxKey = $true
        break
    }
}

if (-not $isSandboxKey) {
    $isLiveKey = $false
    foreach ($prefix in $commonLivePrefixes) {
        if ($key.StartsWith($prefix)) {
            Write-Host "  ✗ WARNING: Key appears to be a LIVE key (starts with '$prefix')" -ForegroundColor Red
            Write-Host "    You need a SANDBOX key for sandbox endpoints!" -ForegroundColor Yellow
            $isLiveKey = $true
            break
        }
    }
    
    if (-not $isLiveKey) {
        Write-Host "  ⚠ Key prefix not recognized - verify in Xyle dashboard" -ForegroundColor Yellow
        Write-Host "    Expected sandbox prefixes: $($commonSandboxPrefixes -join ', ')" -ForegroundColor Cyan
    }
}

# ============================================================================
# PHASE 3: ENDPOINT REACHABILITY CHECK
# ============================================================================
Write-Host "`n[PHASE 3] Checking Endpoint Reachability..." -ForegroundColor Yellow

$baseUrl = "https://api.xylepayments.com"
$sandboxPath = "/sandbox/api/v1/client/transactions"
$fullUrl = "$baseUrl$sandboxPath"

Write-Host "  Testing: $fullUrl" -ForegroundColor White

try {
    $testConnection = Test-NetConnection -ComputerName "api.xylepayments.com" -Port 443 -WarningAction SilentlyContinue -InformationLevel Quiet
    
    if ($testConnection) {
        Write-Host "✓ Endpoint is reachable (Port 443 open)" -ForegroundColor Green
        $diagnosticResults.EndpointReachable = $true
    }
    else {
        Write-Host "✗ Endpoint is NOT reachable (Port 443 blocked)" -ForegroundColor Red
        Write-Host "  Check firewall or network settings" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "✗ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# PHASE 4: NETWORK/PROXY CHECK
# ============================================================================
Write-Host "`n[PHASE 4] Checking Network/Proxy Configuration..." -ForegroundColor Yellow

$httpProxy = $env:HTTP_PROXY
$httpsProxy = $env:HTTPS_PROXY

if ($httpProxy -or $httpsProxy) {
    Write-Host "  ⚠ Proxy detected:" -ForegroundColor Yellow
    if ($httpProxy) { Write-Host "    HTTP_PROXY: $httpProxy" -ForegroundColor White }
    if ($httpsProxy) { Write-Host "    HTTPS_PROXY: $httpsProxy" -ForegroundColor White }
    Write-Host "  Consider using -NoProxy flag in API calls if proxy interferes" -ForegroundColor Cyan
    $diagnosticResults.NetworkOK = $false
}
else {
    Write-Host "✓ No proxy detected" -ForegroundColor Green
    $diagnosticResults.NetworkOK = $true
}

# ============================================================================
# PHASE 5: AUTHORIZATION HEADER & TEST API CALL
# ============================================================================
Write-Host "`n[PHASE 5] Testing API Call with Authorization..." -ForegroundColor Yellow

# Test different authorization header formats
$authFormats = @(
    @{
        Name    = "Bearer Token (Most Common)"
        Headers = @{
            "Authorization" = "Bearer $env:XYLE_SANDBOX_API_KEY"
            "Content-Type"  = "application/json"
        }
    },
    @{
        Name    = "X-API-Key Header"
        Headers = @{
            "X-API-Key"    = "$env:XYLE_SANDBOX_API_KEY"
            "Content-Type" = "application/json"
        }
    },
    @{
        Name    = "Xyle-API-Key Header"
        Headers = @{
            "Xyle-API-Key" = "$env:XYLE_SANDBOX_API_KEY"
            "Content-Type" = "application/json"
        }
    }
)

$successfulFormat = $null

foreach ($format in $authFormats) {
    Write-Host "`n  Testing with: $($format.Name)" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -Headers $format.Headers -Method GET -ErrorAction Stop
        
        Write-Host "  ✓ SUCCESS! API call returned status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response preview:" -ForegroundColor White
        
        # Parse and display response (first 500 chars)
        $responseText = $response.Content
        if ($responseText.Length -gt 500) {
            Write-Host "  $($responseText.Substring(0, 500))..." -ForegroundColor Gray
        }
        else {
            Write-Host "  $responseText" -ForegroundColor Gray
        }
        
        $diagnosticResults.APICallSuccessful = $true
        $successfulFormat = $format.Name
        break
        
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        
        if ($statusCode) {
            Write-Host "  ✗ Failed with HTTP $statusCode" -ForegroundColor Red
        }
        else {
            Write-Host "  ✗ Failed: $errorMessage" -ForegroundColor Red
        }
        
        # Try to get response body for more details
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            
            if ($responseBody) {
                Write-Host "  Error details: $responseBody" -ForegroundColor Yellow
            }
        }
        catch {
            # Ignore if we can't read response body
        }
    }
}

if (-not $diagnosticResults.APICallSuccessful) {
    Write-Host "`n  ✗ All authorization formats failed" -ForegroundColor Red
    Write-Host "`n  TROUBLESHOOTING STEPS:" -ForegroundColor Yellow
    Write-Host "  1. Verify your key is active in the Xyle dashboard" -ForegroundColor Cyan
    Write-Host "  2. Check if the key has expired" -ForegroundColor Cyan
    Write-Host "  3. Ensure you're using a SANDBOX key (not live)" -ForegroundColor Cyan
    Write-Host "  4. Check Xyle documentation for correct authorization format" -ForegroundColor Cyan
    Write-Host "  5. Contact Xyle support if the key should be valid" -ForegroundColor Cyan
}

# ============================================================================
# DIAGNOSTIC SUMMARY
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nEnvironment Variable:" -ForegroundColor White
if ($diagnosticResults.KeySet) {
    Write-Host "  ✓ Key is set" -ForegroundColor Green
}
else {
    Write-Host "  ✗ Key is missing" -ForegroundColor Red
}

Write-Host "`nKey Format:" -ForegroundColor White
if ($diagnosticResults.KeyFormatOK) {
    Write-Host "  ✓ Key format looks correct" -ForegroundColor Green
}
else {
    Write-Host "  ✗ Key format has issues" -ForegroundColor Red
}

Write-Host "`nEndpoint Reachability:" -ForegroundColor White
if ($diagnosticResults.EndpointReachable) {
    Write-Host "  ✓ Endpoint is reachable" -ForegroundColor Green
}
else {
    Write-Host "  ✗ Endpoint is unreachable" -ForegroundColor Red
}

Write-Host "`nNetwork Configuration:" -ForegroundColor White
if ($diagnosticResults.NetworkOK) {
    Write-Host "  ✓ No proxy issues detected" -ForegroundColor Green
}
else {
    Write-Host "  ⚠ Proxy detected - may interfere" -ForegroundColor Yellow
}

Write-Host "`nAPI Call:" -ForegroundColor White
if ($diagnosticResults.APICallSuccessful) {
    Write-Host "  ✓ API call successful using: $successfulFormat" -ForegroundColor Green
}
else {
    Write-Host "  ✗ API call failed with all authorization formats" -ForegroundColor Red
}

# Overall status
Write-Host "`n----------------------------------------" -ForegroundColor Cyan
$allPassed = $diagnosticResults.KeySet -and $diagnosticResults.KeyFormatOK -and $diagnosticResults.EndpointReachable -and $diagnosticResults.APICallSuccessful

if ($allPassed) {
    Write-Host "OVERALL STATUS: ✓ ALL CHECKS PASSED" -ForegroundColor Green
    Write-Host "Your Xyle sandbox key is working correctly!" -ForegroundColor Green
}
else {
    Write-Host "OVERALL STATUS: ✗ ISSUES DETECTED" -ForegroundColor Red
    Write-Host "Review the failures above and take corrective action." -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan

# Exit with appropriate code
if ($allPassed) {
    exit 0
}
else {
    exit 1
}
