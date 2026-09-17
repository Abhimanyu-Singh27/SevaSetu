param(
  [string]$OutputDirectory = "./backups"
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$output = Join-Path $OutputDirectory "sevasetu-$timestamp.dump"
pg_dump --format=custom --no-owner --file=$output $env:DATABASE_URL
Write-Output "Created $output"
