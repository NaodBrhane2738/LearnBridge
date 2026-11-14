$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { throw 'Python launcher (py.exe) was not found.' }
Start-Process 'http://127.0.0.1:4173'
py -3 -m http.server 4173 --bind 127.0.0.1
