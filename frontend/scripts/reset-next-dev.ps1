param(
  [switch]$Start
)

$ErrorActionPreference = 'SilentlyContinue'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontendRootPattern = [regex]::Escape($frontendRoot)

Write-Host "Frontend root: $frontendRoot"

$nextNodeProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match $frontendRootPattern -and (
      $_.CommandLine -match '\\next\\dist\\' -or
      $_.CommandLine -match 'next(\.exe)?\s+dev' -or
      $_.CommandLine -match '\\.next\\dev' -or
      $_.CommandLine -match 'turbopack'
    )
  }

if ($nextNodeProcs) {
  Write-Host "Stopping Next.js dev processes..."
  foreach ($p in $nextNodeProcs) {
    Write-Host "- PID $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force
  }
} else {
  Write-Host "No Next.js dev processes found for this project."
}

$devDir = Join-Path $frontendRoot '.next\dev'
if (Test-Path $devDir) {
  Write-Host "Removing $devDir"
  Remove-Item -Recurse -Force $devDir
}

if ($Start) {
  Write-Host "Starting dev server..."
  Set-Location $frontendRoot
  npm run dev
} else {
  Write-Host "Done. You can now run: npm run dev"
}
