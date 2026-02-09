#Requires -Version 5.1
<#
.SYNOPSIS
    EstateNet Owner E2E API Verification Script
.DESCRIPTION
    End-to-end verification of OWNER flows: register, login, users/me, properties, invitations, activity
#>
$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:3001/api"
$TestEmail = "test.owner.$(Get-Random -Minimum 1000 -Maximum 9999)@e2e.test"
$TestPassword = "TestPassword123!"
$TestName = "E2E Test Owner"
$TestPhone = "+256700000001"

$script:Token = $null
$script:UserId = $null
$script:PropertyId = $null
$script:InvitationId = $null

function Write-Step($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Pass($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Yellow }

function Invoke-Api {
    param($Method, $Path, $Body = $null, $Auth = $true)
    $url = if ($Path -eq "/health") { "http://localhost:3001$Path" } else { "$BaseUrl$Path" }
    $headers = @{ "Content-Type" = "application/json" }
    if ($Auth -and $script:Token) { $headers["Authorization"] = "Bearer $script:Token" }
    
    $bodyJson = if ($Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson -TimeoutSec 30
        return @{ Success = $true; Data = $response; Status = 200 }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $raw = $_.ErrorDetails.Message
        return @{ Success = $false; Status = $status; Raw = $raw; Error = $_ }
    }
}

# 1. Health Check
Write-Step "1. Health Check GET /health"
$health = Invoke-Api -Method GET -Path "/health" -Auth $false
if ($health.Success -and $health.Data.status -eq "OK") { Write-Pass "Health OK" } 
else { Write-Fail "Health failed: $($health.Raw)"; exit 1 }

# 2. Register Owner
Write-Step "2. POST /auth/register-owner ($TestEmail)"
$reg = Invoke-Api -Method POST -Path "/auth/register-owner" -Auth $false -Body @{
    name = $TestName
    email = $TestEmail
    phoneNumber = $TestPhone
    password = $TestPassword
}
if ($reg.Success -and $reg.Data.success) {
    $script:Token = $reg.Data.data.token
    $script:UserId = $reg.Data.data.user.id
    Write-Pass "Registered, token received"
} else { Write-Fail "Register failed: $($reg.Raw)"; exit 1 }

# 3. Login Owner
Write-Step "3. POST /auth/login"
$login = Invoke-Api -Method POST -Path "/auth/login" -Auth $false -Body @{
    email = $TestEmail
    password = $TestPassword
}
if ($login.Success -and $login.Data.success) {
    $script:Token = $login.Data.data.token
    Write-Pass "Login OK"
} else { Write-Fail "Login failed: $($login.Raw)"; exit 1 }

# 4. GET /users/me
Write-Step "4. GET /users/me"
$me = Invoke-Api -Method GET -Path "/users/me"
if ($me.Success -and $me.Data.data.user.role -eq "OWNER" -and $me.Data.data.user.createdAt) {
    Write-Pass "Got user with createdAt"
} else { Write-Fail "Get user failed: $($me.Raw)"; exit 1 }

# 5. PATCH /users/me (name/phone)
Write-Step "5. PATCH /users/me (name/phone)"
$newName = "Updated Owner Name"
$newPhone = "+256700000002"
$patch1 = Invoke-Api -Method PATCH -Path "/users/me" -Body @{ name = $newName; phoneNumber = $newPhone }
if ($patch1.Success -and $patch1.Data.data.user.name -eq $newName) {
    Write-Pass "Updated name/phone"
} else { Write-Fail "Patch failed: $($patch1.Raw)"; exit 1 }

# Verify persistence
$me2 = Invoke-Api -Method GET -Path "/users/me"
if ($me2.Data.data.user.name -eq $newName) { Write-Pass "Persisted after refresh" }
else { Write-Fail "Not persisted"; exit 1 }

# 6. PATCH /users/me (profileImageUrl)
Write-Step "6. PATCH /users/me (profileImageUrl)"
$imageUrl = "https://example.com/avatar.jpg"
$patch2 = Invoke-Api -Method PATCH -Path "/users/me" -Body @{ profileImageUrl = $imageUrl }
if ($patch2.Success -and $patch2.Data.data.user.profileImage -eq $imageUrl) {
    Write-Pass "Updated profileImage"
} else { Write-Fail "ProfileImage update failed: $($patch2.Raw)"; exit 1 }

# 7. GET /properties
Write-Step "7. GET /properties"
$props = Invoke-Api -Method GET -Path "/properties"
if ($props.Success -and $props.Data.success) { Write-Pass "Got properties list" }
else { Write-Fail "Properties failed: $($props.Raw)"; exit 1 }

# 8. POST /properties
Write-Step "8. POST /properties"
$propBody = @{
    name = "E2E Test Property"
    address = "123 Test Street"
    location = "Kampala"
    type = "APARTMENT"
}
$newProp = Invoke-Api -Method POST -Path "/properties" -Body $propBody
if ($newProp.Success -and $newProp.Data.success) {
    $script:PropertyId = $newProp.Data.data.id
    Write-Pass "Created property: $script:PropertyId"
} else { Write-Fail "Create property failed: $($newProp.Raw)"; exit 1 }

# Verify in list
$props2 = Invoke-Api -Method GET -Path "/properties"
$found = $props2.Data.data | Where-Object { $_.id -eq $script:PropertyId }
if ($found) { Write-Pass "Property appears in list" }
else { Write-Fail "Property not in list"; exit 1 }

# 9. Invitations flow
Write-Step "9. POST /owner/invitations"
$managerEmail = "manager.$(Get-Random)@e2e.test"
$invBody = @{
    propertyId = $script:PropertyId
    managerEmail = $managerEmail
    message = "Please manage this property"
}
$inv = Invoke-Api -Method POST -Path "/owner/invitations" -Body $invBody
if ($inv.Success -and $inv.Data.success) {
    $script:InvitationId = $inv.Data.data.id
    Write-Pass "Created invitation: $script:InvitationId"
} else { Write-Fail "Invitation failed: $($inv.Raw)"; exit 1 }

# GET /owner/invitations
Write-Step "10. GET /owner/invitations"
$invList = Invoke-Api -Method GET -Path "/owner/invitations"
if ($invList.Success -and $invList.Data.data.Count -gt 0) { Write-Pass "Got invitations list" }
else { Write-Fail "Get invitations failed: $($invList.Raw)"; exit 1 }

# DELETE /owner/invitations/:id
Write-Step "11. DELETE /owner/invitations/:id"
$del = Invoke-Api -Method DELETE -Path "/owner/invitations/$script:InvitationId"
if ($del.Success -and $del.Data.success) { Write-Pass "Cancelled invitation" }
else { Write-Fail "Cancel failed: $($del.Raw)"; exit 1 }

# 10. GET /activity/recent
Write-Step "12. GET /activity/recent"
$act = Invoke-Api -Method GET -Path "/activity/recent?limit=10"
if ($act.Success -and $act.Data.success) { Write-Pass "Got activity feed" }
else { Write-Fail "Activity failed: $($act.Raw)"; exit 1 }

Write-Host "`n================================" -ForegroundColor Green
Write-Host "ALL TESTS PASSED" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
