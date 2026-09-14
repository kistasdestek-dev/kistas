param(
  [switch]$KeepState
)

$ErrorActionPreference = 'SilentlyContinue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $ProjectRoot '.tmp-remote-preview'
$StatePath = Join-Path $RuntimeDir 'state.json'

if (Test-Path -LiteralPath $StatePath) {
  $State = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  @($State.serverPid, $State.tunnelPid) |
    Where-Object { $_ } |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

if (-not $KeepState -and (Test-Path -LiteralPath $StatePath)) {
  Remove-Item -LiteralPath $StatePath -Force
}

Write-Host 'Kistas uzaktan onizleme surecleri durduruldu.'
