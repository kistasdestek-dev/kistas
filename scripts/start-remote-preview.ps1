param(
  [int]$Port = 8090,
  [switch]$Wait,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $ProjectRoot '.tmp-remote-preview'
$StatePath = Join-Path $RuntimeDir 'state.json'
$UrlPath = Join-Path $ProjectRoot 'remote-preview-url.txt'
$ServerOut = Join-Path $RuntimeDir 'server.log'
$ServerErr = Join-Path $RuntimeDir 'server-error.log'
$TunnelOut = Join-Path $RuntimeDir 'tunnel.log'
$TunnelErr = Join-Path $RuntimeDir 'tunnel-error.log'
$Cloudflared = Join-Path $ProjectRoot '.tools\cloudflared.exe'

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

# Stop only preview processes that belong to this Kistas workspace.
& (Join-Path $PSScriptRoot 'stop-remote-preview.ps1') -KeepState | Out-Null
$EscapedRoot = [regex]::Escape($ProjectRoot)

function Stop-ProcessTree([int]$ProcessId) {
  Get-CimInstance Win32_Process |
    Where-Object { $_.ParentProcessId -eq $ProcessId } |
    ForEach-Object { Stop-ProcessTree $_.ProcessId }
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

$AllProcesses = Get-CimInstance Win32_Process
$LegacyProcesses = @($AllProcesses | Where-Object {
  $_.CommandLine -and (
    ($_.CommandLine -match $EscapedRoot -and $_.CommandLine -match 'cloudflared(?:\.exe)?.+tunnel\s+--url') -or
    $_.CommandLine -match '(npx(?:-cli\.js)?\s+)?expo(?:\.cmd)?\s+start\s+--web' -or
    ($_.CommandLine -match $EscapedRoot -and $_.CommandLine -match 'expo.+(?:bin.+cli|start).+--web')
  )
})
$LegacyIds = @($LegacyProcesses.ProcessId)
$LegacyProcesses |
  Where-Object { $LegacyIds -notcontains $_.ParentProcessId } |
  ForEach-Object { Stop-ProcessTree $_.ProcessId }

if (-not (Test-Path -LiteralPath $Cloudflared)) {
  throw "cloudflared bulunamadi: $Cloudflared"
}

Set-Location $ProjectRoot
$EnvPath = Join-Path $ProjectRoot '.env'
if (Test-Path -LiteralPath $EnvPath) {
  $ForbiddenPublicSecrets = @(Get-Content -LiteralPath $EnvPath | Where-Object {
    $_ -match '^\s*EXPO_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|TOKEN|ACCESS_KEY)[A-Z0-9_]*\s*='
  })
  if ($ForbiddenPublicSecrets.Count -gt 0) {
    throw 'Public isimli secret bulundu. EXPO_PUBLIC_ degiskenleri web paketine gomulur; once ozel ortam degiskenine tasiyin.'
  }
}

$DistWeb = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'dist-web'))
$ResolvedRoot = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\') + '\'
if (-not $DistWeb.StartsWith($ResolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Guvenli olmayan dist-web yolu: $DistWeb"
}
if (-not $SkipBuild -or -not (Test-Path -LiteralPath (Join-Path $DistWeb 'index.html'))) {
  if (Test-Path -LiteralPath $DistWeb) {
    Remove-Item -LiteralPath $DistWeb -Recurse -Force
  }

  Write-Host '[1/4] Production web paketi hazirlaniyor...'
  & npx.cmd expo export --platform web --output-dir dist-web
  if ($LASTEXITCODE -ne 0) { throw 'Expo web export basarisiz oldu.' }

  if (Test-Path (Join-Path $ProjectRoot 'videos')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $DistWeb 'videos') | Out-Null
    Copy-Item -Path (Join-Path (Join-Path $ProjectRoot 'videos') '*') -Destination (Join-Path $DistWeb 'videos') -Recurse -Force
  }
} else {
  Write-Host '[1/4] Mevcut production web paketi kullaniliyor (SkipBuild)...'
}

Remove-Item $ServerOut, $ServerErr, $TunnelOut, $TunnelErr -Force -ErrorAction SilentlyContinue

Write-Host '[2/4] Sikistirilmis statik sunucu baslatiliyor...'
$Server = Start-Process -FilePath 'node.exe' `
  -ArgumentList @((Join-Path $PSScriptRoot 'serve-web-preview.mjs'), '--port', $Port) `
  -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr

$LocalReady = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  Start-Sleep -Milliseconds 250
  try {
    $Response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -Method Head -TimeoutSec 2 -UseBasicParsing
    if ($Response.StatusCode -eq 200) { $LocalReady = $true; break }
  } catch {}
  if ($Server.HasExited) { break }
}
if (-not $LocalReady) {
  Stop-Process -Id $Server.Id -Force -ErrorAction SilentlyContinue
  throw "Statik sunucu baslatilamadi. Log: $ServerErr"
}

Write-Host '[3/4] Tek Cloudflare Quick Tunnel baslatiliyor...'
$Tunnel = Start-Process -FilePath $Cloudflared `
  -ArgumentList @('tunnel', '--protocol', 'http2', '--url', "http://127.0.0.1:$Port", '--no-autoupdate', '--loglevel', 'info') `
  -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $TunnelOut -RedirectStandardError $TunnelErr

$PublicUrl = $null
for ($attempt = 0; $attempt -lt 120; $attempt++) {
  Start-Sleep -Milliseconds 250
  $LogText = @($TunnelOut, $TunnelErr) |
    Where-Object { Test-Path -LiteralPath $_ } |
    ForEach-Object { Get-Content -LiteralPath $_ -Raw -ErrorAction SilentlyContinue }
  $Match = [regex]::Match(($LogText -join "`n"), 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($Match.Success) { $PublicUrl = $Match.Value; break }
  if ($Tunnel.HasExited) { break }
}

if (-not $PublicUrl) {
  Stop-Process -Id $Server.Id, $Tunnel.Id -Force -ErrorAction SilentlyContinue
  throw "Cloudflare URL alinamadi. Log: $TunnelErr"
}

$State = [ordered]@{
  serverPid = $Server.Id
  tunnelPid = $Tunnel.Id
  port = $Port
  url = $PublicUrl
  startedAt = (Get-Date).ToString('o')
}
$State | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
$PublicUrl | Set-Content -LiteralPath $UrlPath -Encoding ascii

Write-Host '[4/4] Hazir.'
Write-Host ''
Write-Host "Telefon baglantisi: $PublicUrl" -ForegroundColor Cyan
Write-Host "Durdurmak icin: npm run preview:stop"

if ($Wait) {
  Wait-Process -Id $Server.Id, $Tunnel.Id
}
