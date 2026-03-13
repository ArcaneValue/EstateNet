# Tenant Rent Status Smoke Test Script
# PowerShell script to manually verify the /api/tenant/me/rent-status endpoint

param(
    [string]$Period,
    [string]$BaseUrl = "http://localhost:3001"
)

Write-Host "=== EstateNet Tenant Rent Status Smoke Test ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = $BaseUrl
$TENANT_EMAIL = Read-Host "Enter tenant email"
$TENANT_PASSWORD = Read-Host "Enter tenant password" -AsSecureString
$TENANT_PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($TENANT_PASSWORD))

if ($Period) {
    Write-Host "Period parameter: $Period" -ForegroundColor Cyan
    if ($Period -notmatch '^\d{4}-\d{2}$') {
        Write-Host "Warning: Period format should be YYYY-MM" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 1: Authenticating tenant..." -ForegroundColor Yellow

# Login to get token
$loginBody = @{
    email    = $TENANT_EMAIL
    password = $TENANT_PASSWORD_TEXT
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/signin" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success -and $loginResponse.token) {
        Write-Host "✓ Authentication successful" -ForegroundColor Green
        $token = $loginResponse.token
    }
    else {
        Write-Host "✗ Authentication failed: $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Authentication error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Fetching rent status..." -ForegroundColor Yellow

# Get rent status
$headers = @{
    "Authorization" = "Bearer $token"
}

# Build URL with optional period parameter
$rentStatusUrl = "$BASE_URL/api/tenant/me/rent-status"
if ($Period) {
    $rentStatusUrl += "?period=$Period"
    Write-Host "Requesting period: $Period" -ForegroundColor Gray
}

try {
    $rentStatusResponse = Invoke-RestMethod -Uri $rentStatusUrl -Method GET -Headers $headers
    
    if ($rentStatusResponse.success) {
        Write-Host "✓ Rent status retrieved successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== RENT STATUS RESPONSE ===" -ForegroundColor Cyan
        
        $data = $rentStatusResponse.data
        
        # Display all 12 fields
        Write-Host ""
        Write-Host "Lease Information:" -ForegroundColor White
        Write-Host "  Lease ID:     $($data.leaseId)" -ForegroundColor Gray
        Write-Host "  Property ID:  $($data.propertyId)" -ForegroundColor Gray
        Write-Host "  Unit ID:      $($data.unitId)" -ForegroundColor Gray
        Write-Host "  Rent Amount:  $($data.rentAmount)" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "Billing Period Information:" -ForegroundColor White
        Write-Host "  Billing Period:       $($data.billingPeriod)" -ForegroundColor Gray
        Write-Host "  Due Date:             $($data.dueDate)" -ForegroundColor Gray
        Write-Host "  Amount Due:           $($data.amountDueForPeriod)" -ForegroundColor Gray
        Write-Host "  Total Paid:           $($data.totalPaidForPeriod)" -ForegroundColor Gray
        Write-Host "  Arrears Total:        $($data.arrearsTotal)" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "Status Information:" -ForegroundColor White
        $statusColor = switch ($data.status) {
            "PAID" { "Green" }
            "PARTIAL" { "Yellow" }
            "OVERDUE" { "Red" }
            "NOT_DUE" { "Cyan" }
            "NO_LEASE" { "Gray" }
            default { "White" }
        }
        Write-Host "  Status:               $($data.status)" -ForegroundColor $statusColor
        Write-Host "  Days Until Due:       $($data.daysUntilDue)" -ForegroundColor Gray
        Write-Host "  Days Overdue:         $($data.daysOverdue)" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "=== CONTRACT VALIDATION ===" -ForegroundColor Cyan
        
        # Validate all 12 required fields are present
        $requiredFields = @(
            "leaseId", "propertyId", "unitId", "rentAmount",
            "billingPeriod", "dueDate", "totalPaidForPeriod", "amountDueForPeriod",
            "arrearsTotal", "status", "daysUntilDue", "daysOverdue"
        )
        
        $missingFields = @()
        foreach ($field in $requiredFields) {
            if (-not $data.PSObject.Properties.Name.Contains($field)) {
                $missingFields += $field
            }
        }
        
        if ($missingFields.Count -eq 0) {
            Write-Host "✓ All 12 required fields present" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Missing fields: $($missingFields -join ', ')" -ForegroundColor Red
        }
        
        # Historical period validation
        $now = Get-Date
        $currentPeriod = $now.ToString("yyyy-MM")
        if ($data.billingPeriod -ne $currentPeriod) {
            Write-Host "ℹ Historical period query detected" -ForegroundColor Cyan
            if ($null -eq $data.daysUntilDue -and $null -eq $data.daysOverdue) {
                Write-Host "✓ Days fields correctly null for historical period" -ForegroundColor Green
            }
            else {
                Write-Host "⚠ Warning: Days fields should be null for historical periods" -ForegroundColor Yellow
            }
        }
        
        # Validate status enum
        $validStatuses = @("PAID", "PARTIAL", "OVERDUE", "NOT_DUE", "NO_LEASE")
        if ($validStatuses -contains $data.status) {
            Write-Host "✓ Status enum valid: $($data.status)" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Invalid status: $($data.status)" -ForegroundColor Red
        }
        
        # Validate billingPeriod format
        if ($data.billingPeriod -match '^\d{4}-\d{2}$') {
            Write-Host "✓ Billing period format valid: $($data.billingPeriod)" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Invalid billing period format: $($data.billingPeriod)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "=== RAW JSON RESPONSE ===" -ForegroundColor Cyan
        $rentStatusResponse | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray
        
    }
    else {
        Write-Host "✗ Failed to retrieve rent status: $($rentStatusResponse.message)" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Request error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== SMOKE TEST COMPLETE ===" -ForegroundColor Cyan
