# SevaSetu

A local services marketplace built with Next.js, PostgreSQL, and Prisma. Customers, workers, and administrators share a consistent portal with role-specific workflows and English/Hindi preferences.

## Account workflows

| Role | Available workflows |
| --- | --- |
| Customer | Search professionals by service/city, save workers, request a service, follow its timeline, cancel eligible requests, raise disputes/reports, review completed work, and message the assigned professional. |
| Worker | Accept or decline requests, confirm appointments, update service progress, record completed-job amounts, publish services and prices, set availability, submit identity documents, and view reviews and activity analytics. |
| Administrator | Manage customer/worker access, maintain the service catalog, assign unclaimed requests, review identity submissions, resolve support cases, inspect reviews and financial records, send account notifications, and audit administrative actions. |

All portals include notifications with read controls, profile editing, language/theme preferences, and the ability to revoke other sign-in sessions. Duplicate worker service/pricing navigation has been consolidated; old pricing links remain supported.

## Data and behavior

- Dashboard totals, charts, public marketplace statistics, catalog entries, and activity lists come from database queries. Empty records produce an empty state; database failures are not presented as sample activity.
- Request access is scoped to its customer or assigned worker. Administrative mutations require an administrator session and record an audit event.
- Request transitions compare the current state before writing. Completion records earnings regardless of availability, and profile edits preserve existing service prices.
- Finance displays recorded financial entries. It does not process card payments or establish that a bank settlement occurred.
- GPS search uses browser-provided coordinates and each professional's saved service radius. Manual search uses the city on their profile. The simulated map has been removed.
- English/Hindi preferences persist in a cookie and, for signed-in accounts, the database. Names, messages, and other participant-authored content remain as written. Logo wording and copyright remain English.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure a PostgreSQL `DATABASE_URL`, authentication secrets, and the services used by your environment.
3. Generate the client with `npm run db:generate`.
4. Apply existing migrations with `npx prisma migrate deploy`.
5. Optionally run `npm run db:seed` to create the starter service catalog. This does not create fictional customers, workers, reviews, or bookings.
6. Start the application with `npm run dev`.

Email verification/password recovery use the configured email provider. Identity-document uploads use the configured private storage and verification services. Their forms report a configuration or delivery failure when these services are unavailable.

## Checks

```text
npm run lint
npx tsc --noEmit
npm test
npm run test:e2e
```

Unit tests cover role-based access, notification ownership, pricing validation and preservation, request transitions, earnings recording, moderation conflicts, and bilingual rendering of all supported portal sections. They use isolated database mocks.

Browser checks cover public entry points, language persistence, error translations, branding exceptions, and mobile overflow. Install Playwright browsers first, or set `PLAYWRIGHT_CHANNEL=msedge` to use installed Microsoft Edge. Set `PLAYWRIGHT_BASE_URL` when testing an already-running server.
