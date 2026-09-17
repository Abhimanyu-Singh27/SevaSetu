# SevaSetu provider setup

This is the recommended free-to-start stack. Create separate resources for staging and production. Upgrade limits before public traffic requires it.

## 1. Neon PostgreSQL

1. Create a Neon project named `sevasetu-staging` and another named `sevasetu-production`.
2. Enable automated backups and point-in-time recovery where available on the selected plan.
3. Copy the pooled connection string, not the direct connection string.
4. Set `DATABASE_URL` in the matching Vercel environment.
5. Apply migrations from the SevaSetu folder:

```powershell
npx prisma migrate deploy
```

6. Test a backup restore into a disposable database with `scripts/restore-database.ps1`.

Do not share a database between staging and production.

## 2. Upstash Redis

1. Create separate Redis databases for staging and production.
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Set both values in Vercel for the matching environment.
4. Confirm `/api/health` reports `rateLimit: true` and `realtime: true`.

## 3. Cloudflare R2 private storage

1. Create `sevasetu-staging-private` and `sevasetu-production-private` buckets.
2. Disable public bucket access.
3. Enable encryption and lifecycle cleanup for abandoned uploads.
4. Create scoped access keys limited to the matching bucket.
5. Set `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
6. Verify that the upload API returns `503` when storage is missing and only returns a presigned URL after configuration.

## 4. Malware scanning

A Vercel function should not run ClamAV itself. Use a private scanning service or queue worker that accepts `{ objectKey }`, reads the private R2 object, scans it, and returns HTTP 2xx only when clean.

1. Deploy the scanner separately for staging and production.
2. Keep the scanner endpoint private or protected by network/auth controls.
3. Set `UPLOAD_SCANNER_URL` to the matching endpoint.
4. Test clean, oversized, unsupported, and infected-file cases before launch.

Production upload completion fails closed when `UPLOAD_SCANNER_URL` is absent or the scanner does not return success.

## 5. Vercel HTTPS and CDN

1. Create two Vercel projects connected to the SevaSetu repository: `sevasetu-staging` and `sevasetu-production`.
2. Set the project root to `SevaSetu` if the repository contains multiple projects.
3. Use the generated `*.vercel.app` HTTPS domains initially; add a custom domain later.
4. Configure environment variables separately for Preview/Staging and Production.
5. Keep `NEXT_PUBLIC_APP_URL` equal to the exact HTTPS origin for each environment.
6. Confirm the response includes `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.

## 6. Secret management

Use Vercel encrypted environment variables for the first deployment. For a larger operation, move secrets to a dedicated manager such as 1Password Secrets Automation, Doppler, AWS Secrets Manager, or GCP Secret Manager.

Never commit `.env`, provider tokens, MFA encryption keys, or database URLs. Generate secrets locally:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Required secrets are listed in `.env.example`. Run `scripts/validate-production-env.ps1` before a production deployment.

## 7. Transactional email

1. Create a Resend account and verify a sending domain when available.
2. For initial testing, use the provider's permitted test sender and verified recipient.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` separately in staging and production.
4. Test registration verification, password reset, bounce handling, and delivery logs.

Do not invite real users until the production sending domain is verified.

## 8. Monitoring and alerts

1. Create separate Sentry projects for staging and production.
2. Add the Sentry server SDK and `SENTRY_DSN` through the secret manager when error tracking is enabled.
3. Monitor `/api/health` every minute from an uptime provider.
4. Alert on HTTP 503, database failures, rate-limit failures, scanner failures, email failures, and elevated 5xx rates.
5. Define an on-call owner and incident runbook before launch.

## 9. Staged deployment

- Pull requests: dependency review, CodeQL, npm audit, Prisma validation, lint, unit/security tests, build.
- Staging: migrations, E2E/accessibility tests, load test, backup restore drill, manual marketplace smoke test.
- Production: approved release tag, production migration, health check, smoke test, monitoring confirmation, rollback owner.

## 10. Penetration testing and legal approval

These cannot be automated or delegated to the codebase. Before public launch, an authorized security professional must test authentication, MFA, IDOR, CSRF, XSS, injection, uploads, rate limits, location disclosure, and event authorization. Legal counsel must approve the privacy policy, terms, retention, deletion, worker/customer obligations, and incident-contact details.

Record both approvals in the release ticket and do not treat a successful build as approval.
