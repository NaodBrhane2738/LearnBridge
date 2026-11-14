# Use-QA-Toolkit.ps1
# Helper script to run Playwright tests in the LearnBridge QA toolkit.
# Uses the local Node.js 26 LTS installation — does not depend on the system Node.
#
# Usage:
#   .\Use-QA-Toolkit.ps1                        # run all tests
#   .\Use-QA-Toolkit.ps1 -Test smoke-test.spec.js
#   .\Use-QA-Toolkit.ps1 -Codegen http://localhost:4173

param(
    [string]$Test    = '',
    [string]$Codegen = '',
    [string]$Url     = 'http://127.0.0.1:4173'
)

$ErrorActionPreference = 'Stop'

$nodeDir = 'D:\LearnBridge\tools\nodejs'
$npx     = Join-Path $nodeDir 'npx.cmd'
$qaDir   = 'D:\LearnBridge\qa-toolkit'

if (-not (Test-Path $npx))  { throw "Local Node 26 not found at $nodeDir. Re-run setup." }

$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\LearnBridge\tools\playwright-browsers'

Set-Location $qaDir

if ($Codegen) {
    Write-Host "Starting Playwright codegen for: $Codegen"
    & $npx playwright codegen $Codegen
} elseif ($Test) {
    Write-Host "Running test: $Test"
    & $npx playwright test $Test
} else {
    Write-Host "Running all tests in $qaDir"
    Write-Host "PLAYWRIGHT_BROWSERS_PATH = $env:PLAYWRIGHT_BROWSERS_PATH"
    & $npx playwright test
}
