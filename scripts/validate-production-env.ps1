$ErrorActionPreference = "Stop"

$required = @(
  "DATABASE_URL",
  "SESSION_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "MFA_ENCRYPTION_KEY",
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "UPLOAD_SCANNER_URL"
)

$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) })
if ($missing.Count -gt 0) { throw "Missing production variables: $($missing -join ', ')" }
if ($env:NEXT_PUBLIC_APP_URL -notmatch '^https://') { throw "NEXT_PUBLIC_APP_URL must use HTTPS" }
if ($env:MFA_ENCRYPTION_KEY.Length -lt 32) { throw "MFA_ENCRYPTION_KEY must be at least 32 characters" }
Write-Output "Production environment configuration is present."
