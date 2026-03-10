param(
  [string]$OutDir = "dist",
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$preflight = Join-Path $PSScriptRoot "launch-preflight.mjs"

if (-not $SkipPreflight) {
  Write-Host "Running launch preflight..."
  node $preflight
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

$outPath = Join-Path $root $OutDir
if (-not (Test-Path $outPath)) {
  New-Item -Path $outPath -ItemType Directory | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "road-shooter-launch-$stamp.zip"
$zipPath = Join-Path $outPath $zipName

$packageItems = @(
  "index.html",
  "manifest.json",
  "sw.js",
  "privacy-policy.html",
  "icon-192.svg",
  "icon-512.svg",
  "og-image.svg",
  "css",
  "js",
  "vendor",
  "README-LAUNCH.md",
  "FIRE_PROJECT_CONTENT_ANALYSIS.md"
) | ForEach-Object { Join-Path $root $_ }

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path $packageItems -DestinationPath $zipPath -Force
Write-Host ""
Write-Host "Release package created:"
Write-Host $zipPath
