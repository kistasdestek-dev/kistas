param([switch]$Preview)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$safeDirectory = $projectRoot.Replace('\', '/')

function Invoke-ProjectGit {
    param([string[]]$GitArgs)
    & git --no-pager -c "safe.directory=$safeDirectory" @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Git islemi basarisiz: $($GitArgs[0])"
    }
}

function Assert-NoOpenCriticalFindings {
    param([string]$Roadmap)
    foreach ($line in ($Roadmap -split "`n")) {
        if ($line -match '^\|\s*(SEC-\d+|KST-KNOWN-\d+)\s*\|') {
            $findingId = $Matches[1]
            if ($line -match '\|\s*P[01]\s*\|' -and $line -notmatch '\|\s*DOGRULANDI\s*\|') {
                throw "Acik P0/P1 guvenlik bulgusu var: $findingId. Yayinlama durduruldu."
            }
        }
    }
}

function Assert-NoMigrations {
    param([string[]]$Paths)
    if (@($Paths | Where-Object { $_ -match '^supabase/migrations/' }).Count -gt 0) {
        throw 'Bu pakette veritabani migration dosyasi var. Migration ayri uygulanip dogrulanmadan yayinlanamaz.'
    }
}

function Assert-NoUnsafePaths {
    param([string[]]$Paths)
    $unsafe = @($Paths | Where-Object { $_ -match '(^|/)\.env(?!\.example$)(\.|$)|^(backups|dist|dist-web|scratch|\.tools)/' })
    if ($unsafe.Count -gt 0) {
        throw "Pakette gizli/gecici dosya var: $($unsafe -join ', '). Yayinlama durduruldu."
    }
}

try {
    Set-Location -LiteralPath $projectRoot
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $gitCandidates = @(
            (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe'),
            (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe')
        )
        foreach ($candidate in $gitCandidates) {
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $env:PATH = "$(Split-Path -Path $candidate -Parent);$env:PATH"
                break
            }
        }
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git bulunamadi.' }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js bulunamadi.' }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm bulunamadi.' }

    $branch = (@(Invoke-ProjectGit @('branch', '--show-current')) -join '').Trim()
    if ($branch -ne 'main') { throw "Yayinlama yalniz main dalindan yapilir. Su an: $branch" }

    $remote = (@(Invoke-ProjectGit @('remote', 'get-url', 'origin')) -join '').Trim()
    $allowedRemotes = @('https://github.com/kistasdestek-dev/kistas.git', 'git@github.com:kistasdestek-dev/kistas.git')
    if ($remote -notin $allowedRemotes) { throw 'GitHub hedefi beklenen ozel Kistas deposu degil. Yayinlama durduruldu.' }

    Write-Host ''
    Write-Host 'KISTAS YAYINLAMA' -ForegroundColor Cyan
    Write-Host 'GitHub hedefi: kistasdestek-dev/kistas (main)'
    Write-Host ''

    $pendingCommits = @(Invoke-ProjectGit @('log', '--oneline', 'origin/main..HEAD'))
    Write-Host 'GitHub''a henuz gonderilmemis hazir paketler:' -ForegroundColor Yellow
    if ($pendingCommits.Count -eq 0) { Write-Host '  Yok' } else { $pendingCommits | ForEach-Object { Write-Host "  $_" } }

    $localChanges = @(Invoke-ProjectGit @('status', '--short', '--untracked-files=all'))
    Write-Host ''
    Write-Host 'Bilgisayardaki henuz pakete girmemis dosyalar:' -ForegroundColor Yellow
    if ($localChanges.Count -eq 0) { Write-Host '  Yok' } else { $localChanges | ForEach-Object { Write-Host "  $_" } }
    Write-Host ''

    if ($Preview) { exit 0 }

    Write-Host '1 - Yalniz hazir paketleri gonder (yerel dosyalar gitmez)'
    Write-Host '2 - Listelenen TUM yerel degisiklikleri yeni pakete al ve gonder'
    Write-Host '0 - Vazgec'
    $choice = (Read-Host 'Seciminiz').Trim()
    if ($choice -eq '0') { Write-Host 'Hicbir sey gonderilmedi.'; exit 0 }
    if ($choice -notin @('1', '2')) { throw 'Gecersiz secim.' }

    Invoke-ProjectGit @('fetch', '--quiet', 'origin', 'main')
    $behind = [int]((@(Invoke-ProjectGit @('rev-list', '--count', 'HEAD..origin/main')) -join '').Trim())
    if ($behind -gt 0) { throw 'GitHub''da bu bilgisayarda olmayan yeni degisiklikler var. Once bunlar birlestirilmeli; yayinlama durduruldu.' }

    if ($choice -eq '1') {
        $pendingCommits = @(Invoke-ProjectGit @('log', '--oneline', 'origin/main..HEAD'))
        if ($pendingCommits.Count -eq 0) { throw 'Gonderilecek hazir paket yok.' }
        $paths = @(Invoke-ProjectGit @('diff', '--name-only', 'origin/main..HEAD'))
        Assert-NoMigrations $paths
        Assert-NoUnsafePaths $paths
        $roadmap = @(Invoke-ProjectGit @('show', 'HEAD:docs/SECURITY_ROADMAP.md')) -join "`n"
        Assert-NoOpenCriticalFindings $roadmap
        Write-Host 'Gonderilecek paketler:' -ForegroundColor Yellow
        $pendingCommits | ForEach-Object { Write-Host "  $_" }
    } else {
        if ($localChanges.Count -eq 0) { throw 'Yeni yerel degisiklik yok. Hazir paket varsa 1 secin.' }
        $alreadyStaged = @(Invoke-ProjectGit @('diff', '--cached', '--name-only'))
        if ($alreadyStaged.Count -gt 0) { throw 'Onceden Git''e secilmis dosyalar var. Karisik yayinlamayi onlemek icin durduruldu.' }
        $allReady = (Read-Host 'Listelenen TUM dosyalar tamam mi? Devam icin EVET yazin').Trim()
        if ($allReady -cne 'EVET') { Write-Host 'Hicbir sey gonderilmedi.'; exit 0 }

        Invoke-ProjectGit @('add', '--all')
        $committed = $false
        try {
            $paths = @(Invoke-ProjectGit @('diff', '--cached', '--name-only'))
            if ($paths.Count -eq 0) { throw 'Yeni pakette dosya yok.' }
            Assert-NoMigrations $paths
            Assert-NoUnsafePaths $paths
            $roadmap = @(Invoke-ProjectGit @('show', ':docs/SECURITY_ROADMAP.md')) -join "`n"
            Assert-NoOpenCriticalFindings $roadmap
            Invoke-ProjectGit @('diff', '--cached', '--check')
            & node scripts/security/check-repo-secrets.mjs
            if ($LASTEXITCODE -ne 0) { throw 'Gizli anahtar kontrolu basarisiz.' }

            Write-Host ''
            Write-Host 'Yayina gidecek dosya ozeti:' -ForegroundColor Yellow
            Invoke-ProjectGit @('diff', '--cached', '--stat')
            Write-Host ''
            Write-Host 'Web yayin kontrolleri calisiyor...' -ForegroundColor Cyan
            & npm.cmd run release:web
            if ($LASTEXITCODE -ne 0) { throw 'Web yayin kontrolleri basarisiz.' }

            $unstaged = @(Invoke-ProjectGit @('diff', '--name-only'))
            $untracked = @(Invoke-ProjectGit @('ls-files', '--others', '--exclude-standard'))
            if ($unstaged.Count -gt 0 -or $untracked.Count -gt 0) {
                throw 'Kontroller sirasinda yeni/degisen dosyalar olustu. Dosyalari yeniden inceleyip tekrar deneyin.'
            }

            $message = (Read-Host 'Bu pakete kisa bir ad verin').Trim()
            if ($message.Length -lt 5 -or $message.Length -gt 80) { throw 'Paket adi 5-80 karakter olmali.' }
            $confirmed = (Read-Host 'Canliya gondermek icin YAYINLA yazin').Trim()
            if ($confirmed -cne 'YAYINLA') { Write-Host 'Vazgecildi. Hicbir sey gonderilmedi.'; exit 0 }

            Invoke-ProjectGit @('commit', '-m', $message)
            $committed = $true
        } finally {
            if (-not $committed) { Invoke-ProjectGit @('reset', '--quiet') }
        }
    }

    if ($choice -eq '1') {
        $confirmed = (Read-Host 'Canliya gondermek icin YAYINLA yazin').Trim()
        if ($confirmed -cne 'YAYINLA') { Write-Host 'Vazgecildi. Hicbir sey gonderilmedi.'; exit 0 }
    }

    Invoke-ProjectGit @('push', 'origin', 'main')
    Write-Host ''
    Write-Host 'GitHub''a gonderildi. Cloudflare Pages yayini henuz tamamlanmadi.' -ForegroundColor Green
    Write-Host 'Cloudflare > Workers & Pages > kistas > Deployments ekraninda son paketin Success olmasini bekleyin.'
    if (@($paths | Where-Object { $_ -match '^supabase/email-templates/' }).Count -gt 0) {
        Write-Host 'Not: E-posta sablonlari GitHub ile Supabase''e otomatik aktarilmaz.' -ForegroundColor Yellow
    }
    exit 0
} catch {
    Write-Host ''
    Write-Host "Yayinlama durduruldu: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
