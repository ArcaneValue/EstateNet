$Timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$Email = "manager-e2e-$Timestamp@test.com"
$Password = "TestPassword123!"

Write-Host "Testing login with email: $Email"

$Body = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

$Body | Out-File -FilePath 'login_test.json' -Encoding UTF8

try {
    $response = curl.exe -X POST -H "Content-Type: application/json" --data-binary "@login_test.json" "http://localhost:3001/api/auth/login"
    Write-Host "curl exit code: $LASTEXITCODE"
    Write-Host "Response: $response"
} catch {
    Write-Host "Error: $_"
} finally {
    Remove-Item 'login_test.json' -ErrorAction SilentlyContinue
}
