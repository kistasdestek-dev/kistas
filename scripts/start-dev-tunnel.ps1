param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $ProjectRoot '.tmp-dev-tunnel'
$StatePath = Join-Path $RuntimeDir 'state.json'
$UrlPath = Join-Path $ProjectRoot 'dev-tunnel-url.txt'
$TunnelLog = Join-Path $RuntimeDir 'tunnel.log'
$TunnelErr = Join-Path $RuntimeDir 'tunnel-error.log'
$Cloudflared = Join-Path $ProjectRoot '.tools\cloudflared.exe'

# Onceki aktif tüneli sonlandır
& (Join-Path $PSScriptRoot 'stop-dev-tunnel.ps1') 2>$null | Out-Null

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $Cloudflared)) {
  throw "Cloudflared binary bulunamadı: $Cloudflared"
}

# 1. Port 3000 kontrolü
Write-Host "[1/3] Port $Port (Next.js Dev Sunucusu) kontrol ediliyor..." -ForegroundColor Cyan
$ServerResponding = $false
try {
  $res = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -Method Head -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
  if ($res.StatusCode -eq 200 -or $res.StatusCode -eq 304 -or $res.StatusCode -eq 307 -or $res.StatusCode -eq 308) {
    $ServerResponding = $true
  }
} catch {
  # Bazen Head desteklenmezse GET dene
  try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -Method Get -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    $ServerResponding = $true
  } catch {}
}

if (-not $ServerResponding) {
  throw "Port $Port üzerinde çalışan aktif bir Next.js sunucusu bulunamadı. Lütfen önce dev sunucusunu başlatın."
}

# 2. Cloudflared başlat
Write-Host "[2/3] Cloudflare Quick Tunnel başlatılıyor..." -ForegroundColor Cyan
Remove-Item $TunnelLog, $TunnelErr -Force -ErrorAction SilentlyContinue

$Tunnel = Start-Process -FilePath $Cloudflared `
  -ArgumentList @('tunnel', '--protocol', 'http2', '--url', "http://127.0.0.1:$Port", '--http-host-header', "localhost:$Port", '--no-autoupdate', '--loglevel', 'info') `
  -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $TunnelLog -RedirectStandardError $TunnelErr

# 3. URL'i yakala
Write-Host "[3/3] Güvenli tünel adresi bekleniyor..." -ForegroundColor Cyan
$PublicUrl = $null
for ($attempt = 0; $attempt -lt 120; $attempt++) {
  Start-Sleep -Milliseconds 300
  $LogText = @($TunnelLog, $TunnelErr) |
    Where-Object { Test-Path -LiteralPath $_ } |
    ForEach-Object { Get-Content -LiteralPath $_ -Raw -ErrorAction SilentlyContinue }
  $Match = [regex]::Match(($LogText -join "`n"), 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($Match.Success) {
    $PublicUrl = $Match.Value
    break
  }
  if ($Tunnel.HasExited) {
    break
  }
}

if (-not $PublicUrl) {
  Stop-Process -Id $Tunnel.Id -Force -ErrorAction SilentlyContinue
  throw "Cloudflare URL alınamadı. Hata günlüğü: $TunnelErr"
}

$State = [ordered]@{
  tunnelPid = $Tunnel.Id
  port      = $Port
  url       = $PublicUrl
  startedAt = (Get-Date).ToString('o')
}
$State | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
$PublicUrl | Set-Content -LiteralPath $UrlPath -Encoding ascii

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " KISTAS MOBİL ERİŞİM TÜNELİ AKTİF (PORT $Port)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Telefon Bağlantı Linki: $PublicUrl" -ForegroundColor Yellow
Write-Host "Durdurmak için: npm run tunnel:stop" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
