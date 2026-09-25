$ErrorActionPreference = 'SilentlyContinue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $ProjectRoot '.tmp-dev-tunnel'
$StatePath = Join-Path $RuntimeDir 'state.json'
$UrlPath = Join-Path $ProjectRoot 'dev-tunnel-url.txt'

if (Test-Path -LiteralPath $StatePath) {
  $State = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  if ($State.tunnelPid) {
    Stop-Process -Id $State.tunnelPid -Force -ErrorAction SilentlyContinue
  }
}

# Genel cloudflared taraması (proje bazlı)
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

if (Test-Path -LiteralPath $RuntimeDir) {
  Remove-Item -LiteralPath $RuntimeDir -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path -LiteralPath $UrlPath) {
  Remove-Item -LiteralPath $UrlPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Kıstas mobil geliştirme tüneli sonlandırıldı." -ForegroundColor Cyan
