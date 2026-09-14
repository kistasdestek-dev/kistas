param(
    [int]$Size = 256
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $projectRoot 'assets/categories/icons'
$outputDirectory = Join-Path $sourceDirectory 'optimized'

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$sourceFiles = Get-ChildItem -LiteralPath $sourceDirectory -Filter '*-v2.png' -File | Sort-Object Name

foreach ($sourceFile in $sourceFiles) {
    $sourceImage = [System.Drawing.Image]::FromFile($sourceFile.FullName)
    try {
        $outputImage = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $outputImage.SetResolution(96, 96)
            $graphics = [System.Drawing.Graphics]::FromImage($outputImage)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage(
                    $sourceImage,
                    [System.Drawing.Rectangle]::new(0, 0, $Size, $Size),
                    0,
                    0,
                    $sourceImage.Width,
                    $sourceImage.Height,
                    [System.Drawing.GraphicsUnit]::Pixel
                )
            }
            finally {
                $graphics.Dispose()
            }

            $destinationPath = Join-Path $outputDirectory $sourceFile.Name
            $outputImage.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $outputImage.Dispose()
        }
    }
    finally {
        $sourceImage.Dispose()
    }
}

Write-Output "Optimized $($sourceFiles.Count) category icons to ${Size}x${Size}."
