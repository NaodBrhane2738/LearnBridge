$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { throw 'Python launcher (py.exe) was not found.' }
Write-Host "Starting LearnBridge on port 4173 (0.0.0.0 - accessible from anywhere)..." -ForegroundColor Cyan
Start-Process 'http://localhost:4173'
py -3 -m http.server 4173 --bind 0.0.0.0
