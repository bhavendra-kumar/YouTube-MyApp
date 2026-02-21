param(
  [Parameter(Mandatory = $true)]
  [int]$Port
)

$ErrorActionPreference = 'SilentlyContinue'

function Get-ListeningPid([int]$p) {
  $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return [int]$conn.OwningProcess }
  return $null
}

$procId = Get-ListeningPid -p $Port
if (-not $procId) {
  Write-Host "[free-port] Port $Port is free"
  exit 0
}

Write-Host "[free-port] Port $Port is in use by PID $procId. Stopping it..."
try {
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
} catch {
  Write-Host "[free-port] Failed to stop PID ${procId}: $($_.Exception.Message)"
}

Start-Sleep -Milliseconds 500
$procId2 = Get-ListeningPid -p $Port
if ($procId2) {
  Write-Host "[free-port] Port $Port is still in use by PID $procId2"
  exit 1
}

Write-Host "[free-port] Port $Port freed"
exit 0
