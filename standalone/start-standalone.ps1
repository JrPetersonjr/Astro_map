$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$runtimeUrl = 'http://127.0.0.1:8787'
$appUrl = "$runtimeUrl/index.html?standalone=1"

Set-Location $root

function Test-RuntimeHealthy {
	try {
		$response = Invoke-RestMethod -Uri "$runtimeUrl/health" -Method GET -TimeoutSec 2
		return [bool]$response.ok
	} catch {
		return $false
	}
}

if (Test-RuntimeHealthy) {
	Write-Host "LuminaSynodic runtime already running at $runtimeUrl" -ForegroundColor Green
	Write-Host "Opening app: $appUrl" -ForegroundColor Cyan
	Start-Process $appUrl | Out-Null
	return
}

Write-Host "Starting LuminaSynodic standalone runtime in a dedicated PowerShell window..." -ForegroundColor Cyan

$cmd = "Set-Location '$root'; node .\standalone\local-runtime.js"
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $cmd) -WindowStyle Normal | Out-Null

Start-Sleep -Milliseconds 800
if (Test-RuntimeHealthy) {
	Write-Host "Runtime started. Opening app: $appUrl" -ForegroundColor Green
	Start-Process $appUrl | Out-Null
} else {
	Write-Warning "Runtime did not report healthy yet. Check the new PowerShell window for logs."
}
