# Admin operations

The admin reporting API is available only to an authenticated `ADMIN` session.

## Reports

- `GET /api/v1/admin/reports?type=users` supports `q`, `role`, `status`, `city`, `verification`, `from`, `to`, `page`, and `limit`.
- `GET /api/v1/admin/reports?type=requests` supports `q`, `requestStatus`, `from`, `to`, `page`, and `limit`, and returns grouped counts for every request status.
- Add `format=csv` to download a CSV export.
- `GET /api/v1/admin/users/:id` returns selected-user activity, request counts, location count, addresses, worker metrics, reports, finance, fraud, and location-event totals.

## Operational workflows

- `POST /api/v1/requests/:id/proof` submits completion proof after a request is completed.
- `PATCH /api/v1/requests/:id/proof` records customer approval.
- `POST /api/v1/locations` stores a location event only when explicit consent is supplied; retention is capped at 90 days.
- `GET|POST /api/v1/admin/finance` reads or writes ledger entries for earnings, platform fees, refunds, and payouts.
- `GET|PATCH /api/v1/admin/fraud` lists and reviews fraud signals.
- `GET|PATCH /api/v1/admin/disputes` lists and resolves dispute cases.
- `POST /api/v1/admin/broadcasts` sends an audited notification broadcast to active customers, workers, or both.

## Privacy and retention

Exact coordinates must not be displayed in general user lists or CSV exports. Location history requires explicit consent and a retention date. A scheduled production job must delete expired `LocationEvent` records and apply the retention policy to uploaded proof files.

## Release gates

Before production use, configure monitoring for `/api/health`, database failures, failed email/upload/scanner operations, authentication abuse, and 5xx rates. The health endpoint treats database, session, application URL, and rate limiting as core readiness; email, storage, upload scanning, and realtime are reported as optional capabilities until configured. Configure automated PostgreSQL backups, complete a restore drill, run dependency/security scanning, and perform a penetration review covering authorization/IDOR, MFA, uploads, XSS, injection, rate limits, location disclosure, and dispute/finance endpoints.

The application now sends security headers including HSTS, `X-Content-Type-Options`, frame denial, strict referrer policy, same-origin opener/resource policies, disabled DNS prefetch, and disabled cross-domain policies. Keep HTTPS enabled at the hosting provider before relying on HSTS.
