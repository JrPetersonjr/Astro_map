$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Starting LuminaSynodic standalone runtime..." -ForegroundColor Cyan
node .\standalone\local-runtime.js
