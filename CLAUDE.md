# CLAUDE.md — InSite

Guidance for future coding sessions. Keep this product **generic**: no customer- or brand-specific code.

## What it is

Multi-tenant WordPress site management dashboard. Agencies sign up, create a workspace, connect sites via the `insite-connector` plugin, then monitor versions/health and run updates.

## Monorepo

```
apps/web                 Next.js App Router dashboard (Vercel)
packages/db              Drizzle schema + Neon client
packages/shared          HMAC, connection key, shared types
plugins/insite-connector WordPress plugin (PHP 7.4+)
```

Package manager: **pnpm** + **Turborepo**.

### Commands

```bash
pnpm install
pnpm --filter @insite/shared build && pnpm --filter @insite/db build
pnpm --filter web dev
pnpm --filter @insite/shared test
pnpm --filter web test
pnpm db:push | pnpm db:migrate | pnpm db:generate
cd plugins/insite-connector && ./vendor/bin/phpunit
```

## Architecture rules

1. **Tenant isolation:** Every app query is scoped to the active workspace. Use `requireWorkspace()` / `requireSite()` from `apps/web/src/lib/tenant.ts`. Never load a `siteId` without joining/filtering on `organizationId`.
2. **Roles:** `owner` | `admin` | `member`. Members are read-only (`assertCanWrite`).
3. **Secrets:** Site HMAC secrets encrypted with AES-256-GCM (`ENCRYPTION_KEY`). Never log plaintext secrets or connection keys.
4. **Connector auth:** HMAC-SHA256 over `METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH`. Shared test vectors in `packages/shared/test-vectors.json` — keep TS and PHP in sync.
5. **Background work:** Long-running refresh and bulk updates go through **Inngest**. Vercel Cron only enqueues. Bulk updates are **sequential**; after each site update, homepage must return HTTP 200 or the batch stops.
6. **Site Health:** Not on every refresh. Status = versions/plugins/themes. Health = on-demand (`GET /health`).
7. **Phase 2 tables** (`uptime_checks`, `incidents`) exist in schema only — no UI or jobs yet.

## Auth

Better Auth + organization plugin. Email/password only in Phase 1. Signup auto-creates a workspace (owner). Invites via Resend.

## Connector endpoints

- `GET /wp-json/insite/v1/status`
- `GET /wp-json/insite/v1/health`
- `POST /wp-json/insite/v1/update`
- `GET /wp-json/insite/v1/errors`

Pairing: Tools → InSite shows base64url connection key `{ url, secret }`.

## Conventions

- TypeScript strict; prefer server components + server actions for mutations.
- UI: shadcn-style primitives under `components/ui`, light theme, teal accent — not purple AI chrome.
- WordPress plugin: escape output, capability checks, no exotic PHP extensions.
- Do not add billing, OAuth, or customer-specific branding in Phase 1.

## Env

See `.env.example`. Critical: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `INNGEST_*`, `CRON_SECRET`.
