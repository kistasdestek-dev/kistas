param()

Add-Type -AssemblyName System.Drawing

$destDir = "c:\Users\mehmet.ozdemir\Desktop\KISTAS\assets\categories\icons"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

function Process-IconCell {
    param(
        [System.Drawing.Bitmap]$sourceBmp,
        [int]$srcX,
        [int]$srcY,
        [int]$srcW,
        [int]$srcH,
        [string]$outputPath
    )
    
    $outSize = 256
    $dest = new-object System.Drawing.Bitmap($outSize, $outSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Scale and center into 256x256
    $scale = [Math]::Min([float]$outSize / $srcW, [float]$outSize / $srcH)
    $dw = [int]($srcW * $scale)
    $dh = [int]($srcH * $scale)
    $dx = [int](($outSize - $dw) / 2)
    $dy = [int](($outSize - $dh) / 2)

    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($sourceBmp, (new-object System.Drawing.Rectangle($dx, $dy, $dw, $dh)), (new-object System.Drawing.Rectangle($srcX, $srcY, $srcW, $srcH)), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    # Alpha keying for smooth transparent background & soft shadow preservation
    for ($y = 0; $y -lt $outSize; $y++) {
        for ($x = 0; $x -lt $outSize; $x++) {
            $p = $dest.GetPixel($x, $y)
            if ($p.A -eq 0) { continue }

            $minCh = [Math]::Min($p.R, [Math]::Min($p.G, $p.B))
            $maxCh = [Math]::Max($p.R, [Math]::Max($p.G, $p.B))
            $diff = $maxCh - $minCh

            # Pure / near-white background
            if ($minCh -ge 248 -and $diff -le 7) {
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } elseif ($minCh -ge 235 -and $diff -le 12) {
                # Feather near-white edge
                $alpha = [int](([float](248 - $minCh) / 13.0) * 255)
                $alpha = [Math]::Max(0, [Math]::Min(255, $alpha))
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
            } elseif ($minCh -ge 175 -and $diff -le 18) {
                # Soft ambient shadow: convert washed white shadow to transparent dark shadow
                $brightness = [int](($p.R + $p.G + $p.B) / 3)
                $shadowAlpha = [int](([float](255 - $brightness) / 80.0) * 110)
                $shadowAlpha = [Math]::Max(0, [Math]::Min(130, $shadowAlpha))
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($shadowAlpha, 15, 15, 25))
            }
        }
    }

    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Output "Extracted $(Split-Path $outputPath -Leaf)"
}

# 1. GAMES ATLAS (1024x1024, 4x4, 256x256 cells)
$gamesBmp = [System.Drawing.Bitmap]::FromFile("c:\Users\mehmet.ozdemir\Desktop\KISTAS\assets\categories\atlas_games_3d.jpg")
$gamesMap = @(
    @{ id = "game-family"; row = 0; col = 0 },
    @{ id = "game-action"; row = 0; col = 1 },
    @{ id = "game-casual"; row = 0; col = 2 },
    @{ id = "game-puzzle"; row = 0; col = 3 },
    @{ id = "game-card"; row = 1; col = 0 },
    @{ id = "game-word"; row = 1; col = 1 },
    @{ id = "game-adventure"; row = 1; col = 2 },
    @{ id = "game-board"; row = 1; col = 3 },
    @{ id = "game-music"; row = 2; col = 0 },
    @{ id = "game-rpg"; row = 2; col = 1 },
    @{ id = "game-simulation"; row = 2; col = 2 },
    @{ id = "game-trivia"; row = 2; col = 3 },
    @{ id = "game-sports"; row = 3; col = 0 },
    @{ id = "game-strategy"; row = 3; col = 1 },
    @{ id = "game-racing"; row = 3; col = 2 },
    @{ id = "game-controller"; row = 3; col = 3 }
)

foreach ($item in $gamesMap) {
    $sx = $item.col * 256
    $sy = $item.row * 256
    $outFile = Join-Path $destDir "$($item.id).png"
    Process-IconCell $gamesBmp $sx $sy 256 256 $outFile
}
$gamesBmp.Dispose()

# 2. APPS ATLAS A (1200x896, 4x3, cell width=300, cell height=298.66, crop height=258 to exclude text)
$appsABmp = [System.Drawing.Bitmap]::FromFile("c:\Users\mehmet.ozdemir\Desktop\KISTAS\assets\categories\atlas_apps_3d_a.jpg")
$appsAMap = @(
    @{ id = "app-shopping"; row = 0; col = 0 },
    @{ id = "app-magazines"; row = 0; col = 1 },
    @{ id = "app-education"; row = 0; col = 2 },
    @{ id = "app-entertainment"; row = 0; col = 3 },
    @{ id = "app-finance"; row = 1; col = 0 },
    @{ id = "app-photo-video"; row = 1; col = 1 },
    @{ id = "app-developer-tools"; row = 1; col = 2 },
    @{ id = "app-design"; row = 1; col = 3 },
    @{ id = "app-news"; row = 2; col = 0 },
    @{ id = "app-weather"; row = 2; col = 1 },
    @{ id = "app-business"; row = 2; col = 2 },
    @{ id = "app-books"; row = 2; col = 3 }
)

foreach ($item in $appsAMap) {
    $sx = $item.col * 300
    $sy = [int]($item.row * (896.0 / 3.0))
    $outFile = Join-Path $destDir "$($item.id).png"
    Process-IconCell $appsABmp $sx $sy 300 258 $outFile
}
$appsABmp.Dispose()

# 3. APPS ATLAS B (1200x896, 4x3, cell width=300, cell height=298.66, crop height=258 to exclude text)
$appsBBmp = [System.Drawing.Bitmap]::FromFile("c:\Users\mehmet.ozdemir\Desktop\KISTAS\assets\categories\atlas_apps_3d_b.jpg")
$appsBMap = @(
    @{ id = "app-music"; row = 0; col = 0 },
    @{ id = "app-navigation"; row = 0; col = 1 },
    @{ id = "app-reference"; row = 0; col = 2 },
    @{ id = "app-health-fitness"; row = 0; col = 3 },
    @{ id = "app-travel"; row = 1; col = 0 },
    @{ id = "app-social"; row = 1; col = 1 },
    @{ id = "app-sports"; row = 1; col = 2 },
    @{ id = "app-utilities"; row = 1; col = 3 },
    @{ id = "app-lifestyle"; row = 2; col = 0 },
    @{ id = "app-food-drink"; row = 2; col = 1 },
    @{ id = "app-productivity"; row = 2; col = 2 },
    @{ id = "app-tools"; row = 2; col = 3 }
)

foreach ($item in $appsBMap) {
    $sx = $item.col * 300
    $sy = [int]($item.row * (896.0 / 3.0))
    $outFile = Join-Path $destDir "$($item.id).png"
    Process-IconCell $appsBBmp $sx $sy 300 258 $outFile
}
$appsBBmp.Dispose()

Write-Output "ALL 40 ICONS SUCCESSFULLY EXTRACTED!"
