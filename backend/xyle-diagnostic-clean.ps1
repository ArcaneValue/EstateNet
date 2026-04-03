# Set the Xyle sandbox API key
$env:XYLE_SANDBOX_API_KEY = "xyl_d3c25c7f9b713c79cf9084c06e40e0eebab8256a6e636b2584138a5e861951b6"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "XYLE SANDBOX API KEY DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$diagnosticResults = @{
    KeySet = $false
    KeyFormatOK = $false
    EndpointReachable = $false
    NetworkOK = $false
    APICallSuccessful = $false
}

# PHASE 1: Environment Variable Check
Write-Host "[PHASE 1] Checking Environment Variable..." -ForegroundColor Yellow

if ($env:XYLE_SANDBOX_API_KEY) {
    Write-Host "✓ XYLE_SANDBOX_API_KEY is set" -ForegroundColor Green
    $diagnosticResults.KeySet = $true
} else {
    Write-Host "✗ XYLE_SANDBOX_API_KEY is NOT set" -ForegroundColor Red
    exit 1
}

# PHASE 2: Key Format Check
Write-Host "`n[PHASE 2] Checking Key Format..." -ForegroundColor Yellow

$key = $env:XYLE_SANDBOX_API_KEY
$keyLength = $key.Length
$hasSpaces = $key.Contains(' ')
$hasNewlines = $key.Contains("`n") -or $key.Contains("`r")

Write-Host "  Key Length: $keyLength characters" -ForegroundColor White

if ($keyLength -ge 15) {
    $firstChars = $key.Substring(0, 10)
    $lastChars = $key.Substring($keyLength - 5)
    Write-Host "  Key Preview: $firstChars...$lastChars" -ForegroundColor White
}

$formatIssues = @()
if ($hasSpaces) { $formatIssues += "Contains spaces" }
if ($hasNewlines) { $formatIssues += "Contains newlines" }
if ($keyLength -lt 20) { $formatIssues += "Key seems too short" }

if ($formatIssues.Count -eq 0) {
    Write-Host "✓ Key format looks correct" -ForegroundColor Green
    $diagnosticResults.KeyFormatOK = $true
} else {
    Write-Host "✗ Key format issues: $($formatIssues -join ', ')" -ForegroundColor Red
}

# Check key type
Write-Host "`n  Checking key type..." -ForegroundColor White
if ($key.StartsWith('xyl_')) {
    Write-Host "  ✓ Key has 'xyl_' prefix (Xyle format)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Key prefix not recognized" -ForegroundColor Yellow
}

# PHASE 3: Endpoint Reachability
Write-Host "`n[PHASE 3] Checking Endpoint Reachability..." -ForegroundColor Yellow

$fullUrl = "https://api.xylepayments.com/sandbox/api/v1/client/transactions"
Write-Host "  Testing: $fullUrl" -ForegroundColor White

try {
    $testConnection = Test-NetConnection -ComputerName "api.xylepayments.com" -Port 443 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($testConnection) {
        Write-Host "✓ Endpoint is reachable (Port 443 open)" -ForegroundColor Green
        $diagnosticResults.EndpointReachable = $true
    } else {
        Write-Host "✗ Endpoint is NOT reachable" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Connection test failed" -ForegroundColor Red
}

# PHASE 4: Network/Proxy Check
Write-Host "`n[PHASE 4] Checking Network/Proxy Configuration..." -ForegroundColor Yellow

if ($env:HTTP_PROXY -or $env:HTTPS_PROXY) {
    Write-Host "  ⚠ Proxy detected" -ForegroundColor Yellow
    $diagnosticResults.NetworkOK = $false
} else {
    Write-Host "✓ No proxy detected" -ForegroundColor Green
    $diagnosticResults.NetworkOK = $true
}

# PHASE 5: API Call Test
Write-Host "`n[PHASE 5] Testing API Call with Authorization..." -ForegroundColor Yellow

$authFormats = @(
    @{
        Name = "Bearer Token"
        Headers = @{
            "Authorization" = "Bearer $env:XYLE_SANDBOX_API_KEY"
            "Content-Type" = "application/json"
        }
    },
    @{
        Name = "X-API-Key Header"
        Headers = @{
            "X-API-Key" = "$env:XYLE_SANDBOX_API_KEY"
            "Content-Type" = "application/json"
        }
    }
)

$successfulFormat = $null

foreach ($format in $authFormats) {
    Write-Host "`n  Testing with: $($format.Name)" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -Headers $format.Headers -Method GET -ErrorAction Stop
        Write-Host "  ✓ SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
        $diagnosticResults.APICallSuccessful = $true
        $successfulFormat = $format.Name
        break
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode) {
            Write-Host "  ✗ Failed with HTTP $statusCode" -ForegroundColor Red
        } else {
            Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            if ($responseBody) {
                Write-Host "  Error details: $responseBody" -ForegroundColor Yellow
            }
        } catch {
            # Ignore
        }
    }
}

if (-not $diagnosticResults.APICallSuccessful) {
    Write-Host "`n  ✗ All authorization formats failed" -ForegroundColor Red
    Write-Host "`n  TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "  1. Verify key is active in Xyle dashboard" -ForegroundColor Cyan
    Write-Host "  2. Check if key has expired" -ForegroundColor Cyan
    Write-Host "  3. Ensure you're using a SANDBOX key" -ForegroundColor Cyan
    Write-Host "  4. Contact Xyle support" -ForegroundColor Cyan
}

# DIAGNOSTIC SUMMARY
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nEnvironment Variable:" -ForegroundColor White
if ($diagnosticResults.KeySet) {
    Write-Host "  ✓ Key is set" -ForegroundColor Green
} else {
    Write-Host "  ✗ Key is missing" -ForegroundColor Red
}

Write-Host "`nKey Format:" -ForegroundColor White
if ($diagnosticResults.KeyFormatOK) {
    Write-Host "  ✓ Key format looks correct" -ForegroundColor Green
} else {
    Write-Host "  ✗ Key format has issues" -ForegroundColor Red
}

Write-Host "`nEndpoint Reachability:" -ForegroundColor White
if ($diagnosticResults.EndpointReachable) {
    Write-Host "  ✓ Endpoint is reachable" -ForegroundColor Green
} else {
    Write-Host "  ✗ Endpoint is unreachable" -ForegroundColor Red
}

Write-Host "`nNetwork Configuration:" -ForegroundColor White
if ($diagnosticResults.NetworkOK) {
    Write-Host "  ✓ No proxy issues detected" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Proxy detected - may interfere" -ForegroundColor Yellow
}

Write-Host "`nAPI Call:" -ForegroundColor White
if ($diagnosticResults.APICallSuccessful) {
    Write-Host "  ✓ API call successful using: $successfulFormat" -ForegroundColor Green
} else {
    Write-Host "  ✗ API call failed with all authorization formats" -ForegroundColor Red
}

Write-Host "`n----------------------------------------" -ForegroundColor Cyan
$allPassed = $diagnosticResults.KeySet -and $diagnosticResults.KeyFormatOK -and $diagnosticResults.EndpointReachable -and $diagnosticResults.APICallSuccessful

if ($allPassed) {
    Write-Host "OVERALL STATUS: ✓ ALL CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "OVERALL STATUS: ✗ ISSUES DETECTED" -ForegroundColor Red
}

Write-Host "========================================`n" -ForegroundColor Cyan

if ($allPassed) {
    exit 0
} else {
    exit 1
}
