# Quick test to check token issue
Write-Host "Testing token issue..." -ForegroundColor Yellow

# Step 1: Register manager
$managerEmail = "test-quick-$(Get-Random -Maximum 9999)@example.com"
$managerJson = @{
    name = "Test Manager"
    email = $managerEmail
    phoneNumber = "+256700000000"
    password = "TestPassword123"
} | ConvertTo-Json -Depth 10

$tempJsonFile = [System.IO.Path]::GetTempFileName() + ".json"
$managerJson | Out-File -FilePath $tempJsonFile -Encoding UTF8

$registerResponse = curl.exe -s -w "%{http_code}" "http://localhost:3001/api/auth/register/manager" -H "Content-Type: application/json" -d "@$tempJsonFile"
Remove-Item $tempJsonFile -ErrorAction SilentlyContinue

$statusCode = $registerResponse.Substring($registerResponse.Length - 3)
$body = $registerResponse.Substring(0, $registerResponse.Length - 3)

Write-Host "Registration status: $statusCode" -ForegroundColor Gray

if ($statusCode -eq "201") {
    $data = $body | ConvertFrom-Json
    $token = $data.data.token
    $managerId = $data.data.user.id
    
    Write-Host "Manager ID: $managerId" -ForegroundColor Gray
    Write-Host "Token length: $($token.Length)" -ForegroundColor Gray
    
    # Step 2: Test terms acceptance immediately
    Write-Host "Testing terms acceptance..." -ForegroundColor Yellow
    $termsResponse = curl.exe -s -w "%{http_code}" "http://localhost:3001/api/manager/terms/accept" -X POST -H "Authorization: Bearer $token"
    
    $termsStatusCode = $termsResponse.Substring($termsResponse.Length - 3)
    $termsBody = $termsResponse.Substring(0, $termsResponse.Length - 3)
    
    Write-Host "Terms status: $termsStatusCode" -ForegroundColor Gray
    Write-Host "Terms body: $termsBody" -ForegroundColor Gray
} else {
    Write-Host "Registration failed: $body" -ForegroundColor Red
}
