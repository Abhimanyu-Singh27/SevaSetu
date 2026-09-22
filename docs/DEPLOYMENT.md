# SevaSetu deployment runbook

## Environments

Use separate Vercel projects or Vercel environments for `staging` and `production`, with separate PostgreSQL databases, Redis namespaces, object-storage buckets, scanner credentials, email domains, and secrets. Never point staging at production data.

## Local database prerequisite

Account creation requires PostgreSQL. With Docker Desktop installed, start the local database from the SevaSetu folder:

```powershell
docker compose up -d postgres
npx prisma migrate deploy
```

Confirm port `5432` is listening before opening the registration page. If Docker is unavailable, use a managed PostgreSQL connection in `.env` and run `npx prisma migrate deploy`.

## Required providers

- Managed PostgreSQL with connection pooling, automated backups, and point-in-time recovery.
- Upstash Redis or another Redis-compatible service for rate limits and event publication.
- Private S3-compatible object storage with public access blocked and server-side encryption enabled.
- Malware scanning service reachable through `UPLOAD_SCANNER_URL`.
- HTTPS domain/CDN through Vercel or another TLS-capable edge provider.
- Secret manager for all values in `.env.example`; do not place production secrets in GitHub or source files.
- Brevo or Resend transactional email with a verified sender/domain.
- Monitoring provider connected to `/api/health`, application errors, database errors, email failures, scanner failures, and elevated 4xx/5xx rates.

## Staging release

1. Push a branch to GitHub and deploy it to the staging Vercel project.
2. Set `NODE_ENV=production` and staging-only secrets.
3. Run `npx prisma migrate deploy` against the staging database.
4. Run `npm run test`, `npm run test:e2e`, and `npm run test:a11y` with `PLAYWRIGHT_BASE_URL` set to staging.
5. Run k6 against staging with representative authenticated traffic.
6. Run `scripts/backup-database.ps1` and restore into a disposable database.
7. Confirm `/api/health` returns HTTP 200 and all configuration checks are true.

## Production release

1. Obtain approval from security, operations, and legal reviewers.
2. Configure the production secrets in the provider secret manager.
3. Run `scripts/validate-production-env.ps1` in the deployment environment.
4. Apply migrations with `npx prisma migrate deploy`. The Vercel build also applies pending migrations before `next build`.
5. Deploy the tagged release to the production Vercel project.
6. Verify `/api/health`, login, email verification, MFA, request creation, chat, uploads, and account deactivation.
7. Confirm monitoring alerts and rollback instructions before inviting users.

## Backup restore drill

Backups are only considered operational after a restore has been performed. Export with `scripts/backup-database.ps1`, restore with `scripts/restore-database.ps1`, run Prisma migrations/status checks, and execute the smoke tests against the restored database. Record the restore duration and recovered timestamp.

## Security and legal gates

A qualified reviewer must perform penetration testing covering authentication, MFA, IDOR, CSRF, XSS, injection, uploads, rate limits, location disclosure, and WebSocket/event authorization. Legal counsel must approve the privacy policy, terms, retention/deletion language, worker/customer obligations, and incident-contact details before public launch.
