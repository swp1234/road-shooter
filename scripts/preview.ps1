param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting preview server from: $root"
node (Join-Path $PSScriptRoot "preview-server.mjs") $Port
