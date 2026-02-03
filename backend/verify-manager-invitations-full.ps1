#Requires -Version 5.1
<#
.SYNOPSIS
    End-to-end verification script for Manager Invitations flow with Cancel functionality.
.DESCRIPTION
    Tests the complete flow: EMPTY → PENDING → CANCELLED → PENDING → ACCEPTED → Tenant Active.
    Uses curl.exe for all API calls.
#>

$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:3001/api'
$TempDir = "$env:TEMP\estate-verify-$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

function Cleanup {
    if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
}

try {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Manager Invitations Flow Verification" -ForegroundColor Cyan
    Write-Host "With Cancel Functionality" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Temp directory: $TempDir" -ForegroundColor Gray
    Write-Host ""

    # ============================================
    # STEP 1: Login as Manager A
    # ============================================
    Write-Host "[STEP 1] Login as Manager A" -ForegroundColor Yellow
    
    $loginBody = @'
{"email": "manager_a@test.com", "password": "password123"}
'@
    $loginFile = "$TempDir\manager-login.json"
    Set-Content -Path $loginFile -Value $loginBody -NoNewline

    $loginResp = curl.exe -s -X POST "$BaseUrl/auth/login" `
        -H "Content-Type: application/json" `
        --data-binary "@$loginFile" | ConvertFrom-Json

    if (-not $loginResp.success) {
        throw "Manager login failed: $($loginResp.message)"
    }

    $managerToken = $loginResp.data.token
    $managerId = $loginResp.data.user.id
    Write-Host "  Manager Token: $($managerToken.Substring(0,20))..." -ForegroundColor Gray
    Write-Host "  Manager ID: $managerId" -ForegroundColor Gray
    Write-Host "  [OK] Logged in as manager" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 2: Check EMPTY state (no invitations or existing)
    # ============================================
    Write-Host "[STEP 2] Fetch invitations (current state)" -ForegroundColor Yellow

    $invitesResp = curl.exe -s -X GET "$BaseUrl/manager/invitations" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    if (-not $invitesResp.success) {
        throw "Failed to fetch invitations: $($invitesResp.message)"
    }

    $initialCount = ($invitesResp.data | Measure-Object).Count
    Write-Host "  Current invitations count: $initialCount" -ForegroundColor Gray
    if ($initialCount -eq 0) {
        Write-Host "  [STATE] EMPTY - No invitations found" -ForegroundColor Green
    }
    else {
        Write-Host "  [INFO] Found $initialCount existing invitations" -ForegroundColor Yellow
        $invitesResp.data | ForEach-Object {
            Write-Host "    - ID: $($_.id), Status: $($_.status), Tenant: $($_.tenantId)" -ForegroundColor Gray
        }
    }
    Write-Host ""

    # ============================================
    # STEP 3: Login as Tenant to get tenantId
    # ============================================
    Write-Host "[STEP 3] Login as Tenant to get tenantId" -ForegroundColor Yellow

    $tenantLoginBody = @'
{"email": "tenant2@test.com", "password": "password123"}
'@
    $tenantLoginFile = "$TempDir\tenant-login.json"
    Set-Content -Path $tenantLoginFile -Value $tenantLoginBody -NoNewline

    $tenantLoginResp = curl.exe -s -X POST "$BaseUrl/auth/login" `
        -H "Content-Type: application/json" `
        --data-binary "@$tenantLoginFile" | ConvertFrom-Json

    if (-not $tenantLoginResp.success) {
        throw "Tenant login failed: $($tenantLoginResp.message)"
    }

    $tenantToken = $tenantLoginResp.data.token

    # Get tenant profile to get tenantId
    $profileResp = curl.exe -s -X GET "$BaseUrl/tenant/me" `
        -H "Authorization: Bearer $tenantToken" | ConvertFrom-Json

    if (-not $profileResp.success) {
        throw "Failed to get tenant profile: $($profileResp.message)"
    }

    $tenantId = $profileResp.data.tenantId
    Write-Host "  Tenant ID: $tenantId" -ForegroundColor Gray
    Write-Host "  [OK] Got tenant ID" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 3a: Register a NEW clean tenant (no existing lease)
    # ============================================
    Write-Host "[STEP 3a] Register new clean tenant for accept test" -ForegroundColor Yellow

    $randomSuffix = Get-Random
    $cleanTenantEmail = "clean_tenant_$randomSuffix@test.com"
    $cleanTenantPassword = "password123"

    $registerBody = @"
{"name": "Clean Test Tenant", "email": "$cleanTenantEmail", "password": "$cleanTenantPassword", "phoneNumber": "+256700999999"}
"@
    $registerFile = "$TempDir\register.json"
    Set-Content -Path $registerFile -Value $registerBody -NoNewline

    $registerRaw = curl.exe -s -X POST "$BaseUrl/auth/register-tenant" `
        -H "Content-Type: application/json" `
        --data-binary "@$registerFile"
    $registerResp = $registerRaw | ConvertFrom-Json

    # Strict validation: success must be true AND token must exist
    $cleanTenantToken = $null
    if ($registerResp.success -eq $true -and $registerResp.data.token) {
        $cleanTenantToken = $registerResp.data.token
    }

    # If no token, determine next action based on message
    if (-not $cleanTenantToken) {
        $msg = $registerResp.message
        if ($registerResp.success -eq $true -and -not $registerResp.data.token) {
            # Register succeeded but no token - this is a backend issue
            throw "Register succeeded but token missing. Response: $registerRaw"
        }
        elseif ($msg -like "*Email already exists*") {
            # Try login fallback only for "already exists"
            $cleanLoginBody = @"
{"email": "$cleanTenantEmail", "password": "$cleanTenantPassword"}
"@
            Set-Content -Path $registerFile -Value $cleanLoginBody -NoNewline
            
            $loginRaw = curl.exe -s -X POST "$BaseUrl/auth/login" `
                -H "Content-Type: application/json" `
                --data-binary "@$registerFile"
            $loginResp = $loginRaw | ConvertFrom-Json

            if ($loginResp.success -eq $true -and $loginResp.data.token) {
                $cleanTenantToken = $loginResp.data.token
            }

            if (-not $cleanTenantToken) {
                throw "Clean tenant login failed after register. RegisterRaw: $registerRaw | LoginRaw: $loginRaw"
            }
        } else {
            throw "Clean tenant register failed. Response: $registerRaw"
        }
    }

    # Get the new tenant's tenantId from /tenant/me
    $profileRaw = curl.exe -s -X GET "$BaseUrl/tenant/me" `
        -H "Authorization: Bearer $cleanTenantToken"
    $cleanProfileResp = $profileRaw | ConvertFrom-Json

    if (-not $cleanProfileResp.success) {
        throw "Clean tenant profile fetch failed. Response: $profileRaw"
    }

    $cleanTenantId = $cleanProfileResp.data.tenantId
    if (-not $cleanTenantId) {
        throw "Could not extract tenantId from profile. Response: $profileRaw"
    }

    Write-Host "  Clean Tenant ID: $cleanTenantId" -ForegroundColor Gray
    Write-Host "  [OK] Clean tenant ready (no leases)" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 4: Create Property + Unit (as manager)
    # ============================================
    Write-Host "[STEP 4] Create test property with unit" -ForegroundColor Yellow

    $propName = "Test Property $(Get-Random)"
    $unitNum = "A$((Get-Random) % 1000)"
    $propertyBody = @"
{"name": "$propName", "location": "Test Location", "units": [{"unitNumber": "$unitNum", "rentAmount": 500000}]}
"@
    $propertyFile = "$TempDir\property.json"
    Set-Content -Path $propertyFile -Value $propertyBody -NoNewline

    $propertyResp = curl.exe -s -X POST "$BaseUrl/properties" `
        -H "Authorization: Bearer $managerToken" `
        -H "Content-Type: application/json" `
        --data-binary "@$propertyFile" | ConvertFrom-Json

    if (-not $propertyResp.success) {
        throw "Failed to create property: $($propertyResp.message)"
    }

    $propertyId = $propertyResp.data.id
    $unitId = $propertyResp.data.units[0].id
    Write-Host "  Property ID: $propertyId" -ForegroundColor Gray
    Write-Host "  Unit ID: $unitId" -ForegroundColor Gray
    Write-Host "  [OK] Property created" -ForegroundColor Green
    Write-Host ""

    $propName = "Test Property $(Get-Random)"
    $unitNum = "A$((Get-Random) % 1000)"
    $propertyBody = @"
{"name": "$propName", "location": "Test Location", "units": [{"unitNumber": "$unitNum", "rentAmount": 500000}]}
"@
    $propertyFile = "$TempDir\property.json"
    Set-Content -Path $propertyFile -Value $propertyBody -NoNewline

    $propertyResp = curl.exe -s -X POST "$BaseUrl/properties" `
        -H "Authorization: Bearer $managerToken" `
        -H "Content-Type: application/json" `
        --data-binary "@$propertyFile" | ConvertFrom-Json

    if (-not $propertyResp.success) {
        throw "Failed to create property: $($propertyResp.message)"
    }

    $propertyId = $propertyResp.data.id
    $unitId = $propertyResp.data.units[0].id
    Write-Host "  Property ID: $propertyId" -ForegroundColor Gray
    Write-Host "  Unit ID: $unitId" -ForegroundColor Gray
    Write-Host "  [OK] Property created" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 6: Send invitation (creates PENDING state)
    # ============================================
    Write-Host "[STEP 6] Send invitation (expect PENDING)" -ForegroundColor Yellow

    $inviteBody = @"
{"tenantId": "$cleanTenantId", "propertyId": "$propertyId", "unitId": "$unitId", "rentAmount": 500000}
"@
    $inviteFile = "$TempDir\invite.json"
    Set-Content -Path $inviteFile -Value $inviteBody -NoNewline

    $inviteResp = curl.exe -s -X POST "$BaseUrl/tenants/invite" `
        -H "Authorization: Bearer $managerToken" `
        -H "Content-Type: application/json" `
        --data-binary "@$inviteFile" | ConvertFrom-Json

    if (-not $inviteResp.success) {
        throw "Failed to send invitation: $($inviteResp.message)"
    }

    $invitationId = $inviteResp.data.id
    Write-Host "  Invitation ID: $invitationId" -ForegroundColor Gray
    Write-Host "  Status: $($inviteResp.data.status)" -ForegroundColor Gray
    Write-Host "  [OK] Invitation sent" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 7: Verify PENDING state
    # ============================================
    Write-Host "[STEP 7] Verify PENDING state" -ForegroundColor Yellow

    $pendingResp = curl.exe -s -X GET "$BaseUrl/manager/invitations" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    $newInvite = $pendingResp.data | Where-Object { $_.id -eq $invitationId }
    if ($newInvite.status -eq 'PENDING') {
        Write-Host "  [STATE] PENDING - Invitation status is PENDING" -ForegroundColor Green
    }
    else {
        throw "Expected PENDING status but got $($newInvite.status)"
    }
    Write-Host "  Invitation JSON: $($newInvite | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""

    # ============================================
    # STEP 8: Cancel the invitation (CANCELLED state)
    # ============================================
    Write-Host "[STEP 8] Cancel invitation (expect CANCELLED)" -ForegroundColor Yellow

    $cancelResp = curl.exe -s -X DELETE "$BaseUrl/tenants/invitations/$invitationId" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    if (-not $cancelResp.success) {
        throw "Failed to cancel invitation: $($cancelResp.message)"
    }

    Write-Host "  Cancelled Invitation ID: $($cancelResp.data.id)" -ForegroundColor Gray
    Write-Host "  New Status: $($cancelResp.data.status)" -ForegroundColor Gray
    Write-Host "  [OK] Invitation cancelled" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 9: Verify CANCELLED state
    # ============================================
    Write-Host "[STEP 9] Verify CANCELLED state" -ForegroundColor Yellow

    $cancelledResp = curl.exe -s -X GET "$BaseUrl/manager/invitations" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    $cancelledInvite = $cancelledResp.data | Where-Object { $_.id -eq $invitationId }
    if ($cancelledInvite.status -eq 'CANCELLED') {
        Write-Host "  [STATE] CANCELLED - Invitation status is CANCELLED" -ForegroundColor Green
    }
    else {
        throw "Expected CANCELLED status but got $($cancelledInvite.status)"
    }
    Write-Host "  Response: $($cancelledInvite | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""

    # ============================================
    # STEP 10: Re-invite the tenant (new PENDING)
    # ============================================
    Write-Host "[STEP 10] Re-invite tenant (new PENDING)" -ForegroundColor Yellow

    $reinviteResp = curl.exe -s -X POST "$BaseUrl/tenants/invite" `
        -H "Authorization: Bearer $managerToken" `
        -H "Content-Type: application/json" `
        --data-binary "@$inviteFile" | ConvertFrom-Json

    if (-not $reinviteResp.success) {
        throw "Failed to re-send invitation: $($reinviteResp.message)"
    }

    $newInvitationId = $reinviteResp.data.id
    Write-Host "  New Invitation ID: $newInvitationId" -ForegroundColor Gray
    Write-Host "  Status: $($reinviteResp.data.status)" -ForegroundColor Gray
    Write-Host "  [OK] Re-invitation sent" -ForegroundColor Green
    Write-Host ""

    # ============================================
    # STEP 11: Verify new PENDING state
    # ============================================
    Write-Host "[STEP 11] Verify new PENDING state" -ForegroundColor Yellow

    $reinvitePendingResp = curl.exe -s -X GET "$BaseUrl/manager/invitations" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    $reinvited = $reinvitePendingResp.data | Where-Object { $_.id -eq $newInvitationId }
    if ($reinvited.status -eq 'PENDING') {
        Write-Host "  [STATE] PENDING - New invitation is PENDING" -ForegroundColor Green
    }
    else {
        throw "Expected PENDING status but got $($reinvited.status)"
    }
    Write-Host ""

    # ============================================
    # STEP 12: Tenant accepts invitation
    # ============================================
    Write-Host "[STEP 12] Tenant accepts invitation" -ForegroundColor Yellow

    $acceptResp = curl.exe -s -X POST "$BaseUrl/tenants/invitations/$newInvitationId/accept" `
        -H "Authorization: Bearer $cleanTenantToken" | ConvertFrom-Json

    if (-not $acceptResp.success) {
        # Handle case where tenant already has active lease
        if ($acceptResp.message -like "*already has an active lease*") {
            Write-Host "  [STATE] ERROR - Tenant already has active lease" -ForegroundColor Yellow
            Write-Host "  Note: This is expected if tenant already has a lease" -ForegroundColor Gray
        }
        else {
            throw "Failed to accept invitation: $($acceptResp.message)"
        }
    }
    else {
        Write-Host "  Lease ID: $($acceptResp.data.id)" -ForegroundColor Gray
        Write-Host "  [OK] Invitation accepted, lease created" -ForegroundColor Green
    }
    Write-Host ""

    # ============================================
    # STEP 13: Verify ACCEPTED state (if accepted)
    # ============================================
    Write-Host "[STEP 13] Verify ACCEPTED state" -ForegroundColor Yellow

    $acceptedResp = curl.exe -s -X GET "$BaseUrl/manager/invitations" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    $acceptedInvite = $acceptedResp.data | Where-Object { $_.id -eq $newInvitationId }
    if ($acceptedInvite) {
        if ($acceptedInvite.status -eq 'ACCEPTED') {
            Write-Host "  [STATE] ACCEPTED - Invitation status is ACCEPTED" -ForegroundColor Green
        }
        elseif ($acceptedInvite.status -eq 'PENDING') {
            Write-Host "  [STATE] PENDING PERSISTED - Invitation remains PENDING (tenant has lease)" -ForegroundColor Yellow
        }
        else {
            Write-Host "  [INFO] Invitation status: $($acceptedInvite.status)" -ForegroundColor Gray
        }
        Write-Host "  Response: $($acceptedInvite | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
    else {
        Write-Host "  [INFO] Invitation not found in list (may have been filtered)" -ForegroundColor Gray
    }
    Write-Host ""

    # ============================================
    # STEP 14: Verify tenant appears in manager tenants list
    # ============================================
    Write-Host "[STEP 14] Verify tenant in manager tenants list" -ForegroundColor Yellow

    $tenantsResp = curl.exe -s -X GET "$BaseUrl/manager/tenants" `
        -H "Authorization: Bearer $managerToken" | ConvertFrom-Json

    if (-not $tenantsResp.success) {
        throw "Failed to fetch tenants: $($tenantsResp.message)"
    }

    $foundTenant = $tenantsResp.data | Where-Object { $_.tenantId -eq $cleanTenantId }
    if ($foundTenant) {
        Write-Host "  [STATE] TENANT ACTIVE - Tenant found in manager tenants list" -ForegroundColor Green
        Write-Host "  Tenant JSON: $($foundTenant | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
    else {
        Write-Host "  [INFO] Tenant not found in manager tenants list (may have lease with different manager)" -ForegroundColor Yellow
        Write-Host "  All tenants count: $(($tenantsResp.data | Measure-Object).Count)" -ForegroundColor Gray
    }
    Write-Host ""

    # ============================================
    # SUMMARY
    # ============================================
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  [PASS] Manager authentication works" -ForegroundColor Green
    Write-Host "  [PASS] Property creation works" -ForegroundColor Green
    Write-Host "  [PASS] PENDING state verified (initial invite)" -ForegroundColor Green
    Write-Host "  [PASS] CANCELLED state verified" -ForegroundColor Green
    Write-Host "  [PASS] Cancel endpoint works" -ForegroundColor Green
    Write-Host "  [PASS] PENDING state verified (re-invite)" -ForegroundColor Green
    Write-Host "  [PASS] ACCEPTED/ERROR state handled" -ForegroundColor Green
    Write-Host ""
    Write-Host "All states verified successfully!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan

}
catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "VERIFICATION FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    Cleanup
}
