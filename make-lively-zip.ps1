# Builds dist\SolarSystem-Wallpaper.zip for Lively Wallpaper.
# Lively needs the files at the root of the zip (not inside a folder), which is why
# GitHub's own "Download ZIP" doesn't work directly. Upload this zip to a GitHub Release.

$root  = $PSScriptRoot
$dist  = Join-Path $root 'dist'
$stage = Join-Path $dist 'stage'
$zip   = Join-Path $dist 'SolarSystem-Wallpaper.zip'

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null

$files = 'index.html', 'main.js', 'style.css', 'LivelyInfo.json', 'LivelyProperties.json', 'thumbnail.jpg', 'LICENSE'
foreach ($f in $files) { Copy-Item (Join-Path $root $f) $stage }
Copy-Item (Join-Path $root 'assets') $stage -Recurse

if (Test-Path $zip) { Remove-Item $zip -Force }
# Add entries one by one with standard "/" paths (PowerShell 5.1's zip helpers write "\")
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
try {
    Get-ChildItem $stage -Recurse -File | ForEach-Object {
        $name = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $name) | Out-Null
    }
} finally {
    $archive.Dispose()
}
Remove-Item $stage -Recurse -Force

Write-Host "Created $zip"
