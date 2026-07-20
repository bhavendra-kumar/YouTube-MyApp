param(
  [switch]$Start
)

$ErrorActionPreference = 'SilentlyContinue'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "Frontend root: $frontendRoot"

$isFrontendCmd = {
  param([string]$cmd)
  return $cmd -and ($cmd -like "*$frontendRoot*")
}

$isNextDevCmd = {
  param([string]$cmd)
  return $cmd -and (
    $cmd -match '\\node_modules\\next\\dist\\' -or
    $cmd -match '\\next\\dist\\' -or
    $cmd -match '\\start-server\.js' -or
    $cmd -match '\\.next\\dev' -or
    $cmd -match 'turbopack' -or
    $cmd -match 'next(\.exe)?\s+dev'
  )
}

$nextNodeProcs = @()

# 1) Command-line based detection (fast path)
$nextNodeProcs += Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object {
    $cmd = $_.CommandLine
    (& $isFrontendCmd $cmd) -and (& $isNextDevCmd $cmd)
  }

# 2) Port-based detection (more reliable when the command line is odd)
try {
  $ports = 3000..3010
  $portPids = @(
    $ports |
      ForEach-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue } |
      Select-Object -ExpandProperty OwningProcess -Unique
  )

  foreach ($pid in $portPids) {
    if (-not $pid) { continue }
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
    if (-not $p) { continue }
    $cmd = $p.CommandLine
    if ((& $isFrontendCmd $cmd) -and ($cmd -match '\\node_modules\\next\\dist\\')) {
      $nextNodeProcs += $p
    }
  }
} catch {
  # Ignore: Get-NetTCPConnection may be unavailable in some environments
}

$nextNodeProcs = $nextNodeProcs | Sort-Object -Property ProcessId -Unique

if ($nextNodeProcs) {
  Write-Host "Stopping Next.js dev processes..."
  foreach ($p in $nextNodeProcs) {
    Write-Host "- PID $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force
  }

  # Give Windows a moment to release file handles.
  Start-Sleep -Milliseconds 300
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
