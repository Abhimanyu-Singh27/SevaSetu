param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [Parameter(Mandatory=$true)][string]$TargetDatabaseUrl
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
pg_restore --clean --if-exists --no-owner --dbname=$TargetDatabaseUrl $BackupFile
Write-Output "Restored $BackupFile"
