$ErrorActionPreference = 'Stop'
$ProjectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$RootPrefix = $ProjectRoot.TrimEnd('\') + '\'
$RuntimeDir = Join-Path $ProjectRoot '.tmp-remote-preview'
$StatePath = Join-Path $RuntimeDir 'state.json'
$NextDist = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'dist-web-next'))
$LiveDist = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'dist-web'))
$PreviousDist = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'dist-web-previous'))

function Assert-WorkspacePath([string]$Path) {
  if (-not $Path.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Guvenli olmayan calisma yolu: $Path"
  }
}

function Remove-WorkspaceDirectory([string]$Path) {
  Assert-WorkspacePath $Path
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

if (-not (Test-Path -LiteralPath $StatePath)) {
  throw 'Calisan onizleme bulunamadi. Ilk kez npm run preview:tunnel komutunu kullanin.'
}

$State = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$Server = Get-Process -Id ([int]$State.serverPid) -ErrorAction SilentlyContinue
$Tunnel = Get-Process -Id ([int]$State.tunnelPid) -ErrorAction SilentlyContinue
if (-not $Server -or -not $Tunnel) {
  throw 'Onizleme veya Cloudflare tuneli calismiyor. npm run preview:tunnel ile yeniden baslatin.'
}

$EnvPath = Join-Path $ProjectRoot '.env'
if (Test-Path -LiteralPath $EnvPath) {
  $ForbiddenPublicSecrets = @(Get-Content -LiteralPath $EnvPath | Where-Object {
    $_ -match '^\s*EXPO_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|TOKEN|ACCESS_KEY)[A-Z0-9_]*\s*='
  })
  if ($ForbiddenPublicSecrets.Count -gt 0) {
    throw 'Public isimli secret bulundu. EXPO_PUBLIC_ degiskenleri web paketine gomulemez.'
  }
}

Assert-WorkspacePath $NextDist
Assert-WorkspacePath $LiveDist
Assert-WorkspacePath $PreviousDist
Remove-WorkspaceDirectory $NextDist
Remove-WorkspaceDirectory $PreviousDist

Set-Location $ProjectRoot
Write-Host '[1/4] Yeni web paketi ayri klasorde hazirlaniyor...'
& npx.cmd expo export --platform web --output-dir dist-web-next
if ($LASTEXITCODE -ne 0) { throw 'Expo web export basarisiz oldu.' }

if (Test-Path (Join-Path $ProjectRoot 'videos')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $NextDist 'videos') | Out-Null
  Copy-Item -Path (Join-Path (Join-Path $ProjectRoot 'videos') '*') -Destination (Join-Path $NextDist 'videos') -Recurse -Force
}

Write-Host '[2/4] Statik dosyalar sikistiriliyor...'
& node.exe (Join-Path $PSScriptRoot 'prepare-web-assets.mjs') dist-web-next
if ($LASTEXITCODE -ne 0) { throw 'Statik dosya sikistirma basarisiz oldu.' }

Write-Host '[3/4] Calisan onizleme kesintisiz yenileniyor...'
try {
  if (-not (Test-Path -LiteralPath $LiveDist)) {
    New-Item -ItemType Directory -Path $LiveDist | Out-Null
  }
  Copy-Item -Path (Join-Path $NextDist '*') -Destination $LiveDist -Recurse -Force
  if (Test-Path (Join-Path $ProjectRoot 'videos')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $LiveDist 'videos') | Out-Null
    Copy-Item -Path (Join-Path (Join-Path $ProjectRoot 'videos') '*') -Destination (Join-Path $LiveDist 'videos') -Recurse -Force
  }
  Remove-Item -LiteralPath $NextDist -Recurse -Force -ErrorAction SilentlyContinue
} catch {
  throw
}

$LocalResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$($State.port)" -Method Head -TimeoutSec 10 -UseBasicParsing
if ($LocalResponse.StatusCode -ne 200) { throw 'Yerel onizleme saglik kontrolu basarisiz oldu.' }

Write-Host '[4/4] Hazir. Cloudflare adresi degismedi.'
Write-Host ''
Write-Host "Telefon baglantisi: $($State.url)" -ForegroundColor Cyan
