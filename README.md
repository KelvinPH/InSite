# InSite

Open, multi-tenant dashboard for managing many WordPress sites — uptime (Phase 2), issues, and updates — from one place.

## Stack

| Piece | Tech |
|-------|------|
| Dashboard | Next.js (App Router) on Vercel — `apps/web` |
| Database | Neon Postgres + Drizzle — `packages/db` |
| Shared | HMAC + types — `packages/shared` |
| Connector | WordPress plugin — `plugins/insite-connector` |
| Auth | Better Auth (email/password + organizations) |
| Jobs | Inngest + Vercel Cron |
| Email | Resend (invites) |

## Prerequisites

- Node 20+, pnpm 10+
- PHP 7.4+ and Composer (plugin tests / wp-env)
- A Neon (or other Postgres) database
- Optional locally: [Inngest Dev Server](https://www.inngest.com/docs/local-development), Resend API key, Docker (for `@wordpress/env`)

## Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local — set DATABASE_URL to your Neon or local Postgres URL
# ENCRYPTION_KEY must be 64 hex chars: openssl rand -hex 32
```

Local Postgres via Docker (optional):

```bash
docker run -d --name insite-postgres \
  -e POSTGRES_USER=insite -e POSTGRES_PASSWORD=insite -e POSTGRES_DB=insite \
  -p 5432:5432 postgres:16-alpine
# DATABASE_URL=postgresql://insite:insite@localhost:5432/insite
```

Generate a 32-byte encryption key:

```bash
openssl rand -hex 32
```

Push schema (dev) or migrate:

```bash
# set DATABASE_URL in packages/db/.env or the environment
export DATABASE_URL="postgresql://..."
pnpm db:push
# or
pnpm db:migrate
```

Build packages and start the app:

```bash
pnpm --filter @insite/shared build
pnpm --filter @insite/db build
pnpm --filter web dev
```

In another terminal (background jobs):

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

### WordPress connector (local)

```bash
cd plugins/insite-connector
composer install
pnpm install   # optional, for wp-env
pnpm exec wp-env start
# In WP admin: activate InSite Connector → Tools → InSite → copy connection key
```

HMAC unit tests (same vectors as TypeScript):

```bash
cd plugins/insite-connector && composer test
# or
./vendor/bin/phpunit
```

Shared package tests:

```bash
pnpm --filter @insite/shared test
pnpm --filter web test
```

## Deploy

1. Create a Neon database and run `pnpm db:migrate` (or `db:push`).
2. Deploy `apps/web` to Vercel (root directory `apps/web`, or monorepo with Turborepo).
3. Set env vars from `.env.example` in Vercel.
4. Sync Inngest with your Vercel app (`/api/inngest`).
5. Vercel Cron hits `/api/cron/refresh` every 15 minutes with `Authorization: Bearer $CRON_SECRET`.
6. Point Resend `EMAIL_FROM` at a verified domain.

## Phase 1 features

- Workspaces (organizations), roles: owner / admin / member (read-only)
- Pair sites via connection key; encrypted secrets at rest
- Sites overview, site detail, plugin × site matrix with sequential bulk updates
- Status refresh via cron + Inngest; on-demand Site Health
- Activity log

## Phase 2 (schema stubs only)

Uptime checks, incidents, vulnerability scanning, backups, alerts, billing.
