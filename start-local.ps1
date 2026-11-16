Set-Location $PSScriptRoot
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Starting LearnBridge ALX Test Website & LMS Platform" -ForegroundColor Green
Write-Host " Author: pleaselogmein2738-4236 (pleaselogmein2738@gmail.com)" -ForegroundColor White
Write-Host " Serving ALX Test Website at http://localhost:4173" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Start-Process 'http://localhost:4173'
py -m http.server 4173
