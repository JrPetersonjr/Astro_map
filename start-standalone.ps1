$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $scriptRoot 'standalone\start-standalone.ps1'

if (-not (Test-Path $target)) {
  throw "Could not find launcher script at: $target"
}

& $target
