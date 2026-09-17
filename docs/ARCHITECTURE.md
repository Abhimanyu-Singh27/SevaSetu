# SevaSetu technical architecture

## Product boundary

The first release owns the marketplace loop: discover a professional, request a service, accept or reject, track status, complete the job, review, and retain history. The web UI must consume versioned application services rather than query Prisma directly. Mobile clients will use the same contracts.

## Proposed monorepo direction

```text
apps/web        Next.js web experience and route handlers
apps/api        NestJS API, WebSocket gateway, background workers
packages/types  shared DTOs and domain enums
packages/ui     accessible SevaSetu design system
packages/validation Zod schemas shared by clients and API
packages/api-client typed REST client for web and mobile
infrastructure  Docker, deployment, observability
docs            ADRs, OpenAPI, ERD, security decisions
```

The current project starts as `apps/web`-ready Next.js code in this folder. Extracting `apps/api` is a later milestone, not a reason to couple UI components to persistence.

## Domain modules

Auth and identity, customer profiles, worker profiles and verification, service catalog, discovery/ranking, service requests, conversations/messages, notifications, reviews, reports, locations, files, admin, analytics, audit, and future payments.

## Security model

Server-side RBAC is mandatory for every mutation. Worker and customer records are scoped by ownership and request participation. Exact customer coordinates are private by default and are disclosed only to the assigned worker after consent. Verification files use private object storage and short-lived signed URLs. Rate limits are independently configured for auth, search, requests, chat, reports, and reviews. Admin actions create immutable audit events.

## Ranking

Search ranking uses service match and distance as eligibility signals, then a Bayesian rating estimate, completed-job confidence, recent activity, response/completion rates, cancellation penalty, availability, and verification. Sponsored placement must be a separately labelled product and cannot silently alter the organic score.

## Delivery milestones

1. Foundation: workspace, PostgreSQL/Prisma schema, API contracts, auth, roles, UI primitives.
2. Marketplace: worker onboarding, service catalog, discovery, profile, ranking.
3. Core loop: request lifecycle, status history, customer/worker dashboards.
4. Trust and communication: chat, notifications, reviews, reports, verification.
5. Admin: moderation, user controls, analytics, audit trail.
6. Hardening: security tests, accessibility, performance, OpenAPI, deployment, monitoring.

## Immediate action handling

Mutations follow `authorize -> validate -> transaction -> audit -> publish -> respond`. The API returns the committed resource immediately; clients update their local view from that response without waiting for a refresh. A transactional outbox publishes the corresponding realtime event to Redis/WebSocket subscribers, with retries and idempotency keys for reconnects. WebSocket delivery is an accelerator, never the source of truth: reconnecting clients reconcile from the API using the event cursor.

The current web foundation contains the shared event names and Zod input contracts in `src/lib`. The next implementation step is wiring these contracts to a Prisma client and a PostgreSQL-backed API route/module once `DATABASE_URL` is supplied.