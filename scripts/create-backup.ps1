# Kıstas Otomatik Yedekleme Scripti
# Kullanım: powershell -ExecutionPolicy Bypass -File scripts/create-backup.ps1

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$displayDate = Get-Date -Format "dd.MM.yyyy"
$displayTime = Get-Date -Format "HH:mm"

$backupFileName = "KISTAS_backup_$timestamp.zip"
$backupDir = Join-Path $PSScriptRoot "..\backups"
$backupFilePath = Join-Path $backupDir $backupFileName

Write-Host "Yedekleme baslatiliyor: $backupFileName..." -ForegroundColor Cyan

# Gecici staging dizini
$stagingDir = Join-Path $PSScriptRoot "..\.backup_staging"
if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

$itemsToCopy = @(
    "src",
    "assets",
    "videos",
    "supabase",
    "docs",
    "scripts",
    "PARSRAPOR",
    "App.tsx",
    "index.ts",
    "package.json",
    "package-lock.json",
    "app.json",
    "tsconfig.json",
    "PROJECT_MAP.md",
    "AGENTS.md",
    ".env",
    ".env.example",
    ".gitignore"
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

foreach ($item in $itemsToCopy) {
    $srcPath = Join-Path $projectRoot $item
    if (Test-Path $srcPath) {
        $destPath = Join-Path $stagingDir $item
        Copy-Item -Path $srcPath -Destination $destPath -Recurse -Force
    }
}

# Zip arsivini olustur
if (Test-Path $backupFilePath) {
    Remove-Item -Force $backupFilePath
}

Write-Host "Sıkıstırılıyor..." -ForegroundColor Yellow
Compress-Archive -Path "$stagingDir\*" -DestinationPath $backupFilePath -CompressionLevel Optimal

# Staging temizle
Remove-Item -Recurse -Force $stagingDir

$fileSize = (Get-Item $backupFilePath).Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)

Write-Host "Yedek basariyla alindi: $backupFilePath ($fileSizeMB MB)" -ForegroundColor Green
