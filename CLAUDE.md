# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js 16 Breaking Changes

This project runs Next.js 16, which has breaking changes vs. training data. **Always read `node_modules/next/dist/docs/` before writing framework-level code.** Key difference: `middleware.ts` was renamed to `proxy.ts` (see `src/proxy.ts`).

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # eslint
npm run format       # prettier --write src/
npm run format:check # prettier --check
npm run test         # vitest (all tests)
npm run test:watch   # vitest watch mode
npx tsc --noEmit     # type-check without emitting
```

### Self-hosted CLI (branch feat/self-hosted)

```bash
node --env-file=.env.local scripts/cli.mjs <command>
node --env-file=.env.local scripts/cli.mjs help          # list all commands
node --env-file=.env.local scripts/cli.mjs backup         # dump DB + storage
node --env-file=.env.local scripts/cli.mjs restore --from <dir> --yes
node --env-file=.env.local scripts/cli.mjs token:rotate --encryption --yes
```

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind 4 · Supabase (Postgres+Auth+Storage+Realtime) · Sentry · Upstash Redis · TipTap · dnd-kit.

**Language:** All UI text, comments, DB columns, and variable names are in Brazilian Portuguese.

### Driver pattern (self-hosted)

The app supports both cloud (Supabase SaaS) and self-hosted deployment via pluggable drivers selected by env vars. Drivers live behind API routes or factories — the UI layer never changes.

- **`src/lib/features.ts`** — Typed feature flags derived from env vars. Components check `features.ai`, `features.email`, etc. to conditionally render. `NEXT_PUBLIC_*` vars must be accessed directly (not via object) for Next.js build-time inlining.
- **`src/lib/drivers/storage/`** — `supabase` | `local-disk` | `s3-compat`
- **`src/lib/drivers/email/`** — `resend` | `smtp` | `console` | `disabled`
- **`src/lib/drivers/vcs/config.ts`** — Pure config helpers (URL, driver, tokenMode). **`vcs/token.ts`** has the server-only `getVcsToken()` — split intentionally because `config.ts` is imported transitively by client components via `@/lib/github/client`.
- **`src/lib/realtime/pg-listen.ts`** — SSE alternative to Supabase Realtime using `pg_notify`

### Auth and proxy

`src/proxy.ts` protects all routes by default. Public paths are whitelisted. Auth modes: `standard` (signup+OAuth), `closed` (admin creates users via CLI), `solo` (auto-login bypass). The proxy also enforces `must_change_password` redirect for team profile users on first login.

### Env validation

`src/lib/env.ts` — Zod schemas for all env vars. Empty strings from Docker compose (`${VAR:-}`) are cleaned to `undefined` before validation. Two schemas: `envSchema` (client-safe `NEXT_PUBLIC_*`) and `serverEnvSchema` (includes secrets).

### Rate limiting

`src/lib/rate-limit.ts` — Three backends in priority order: `REDIS_URL` (ioredis TCP) > `UPSTASH_REDIS_REST_URL` (HTTP) > in-memory Map. Each falls back gracefully on connection failure.

### Storage

`src/lib/storage-client.ts` — Client-side wrapper. Server-side uploads go through `/api/storage/upload` and `/api/storage/object/[bucket]/[...path]`. The `SupabaseStorageDriver` uses service_role (bypasses RLS), so authorization guards live in the API handlers (see `src/lib/anexos-guard.ts`).

### Realtime

Hooks `use-realtime.ts`, `use-planning-poker.ts`, `use-notificacoes.ts` detect `NEXT_PUBLIC_REALTIME_DRIVER` and switch between `supabase.channel()` and `new EventSource(...)`. SSE endpoints: `/api/realtime/board/[id]`, `/api/realtime/workspace/[id]`, `/api/realtime/user/[id]`.

### Database

PostgreSQL via Supabase. Migrations in `supabase/migrations/` (000–046). RLS on all multi-tenant tables using `my_workspace_ids()` and `is_workspace_member()` helpers. Self-hosted bootstrap: `supabase/self-hosted/bootstrap.sql` (consolidated schema applied once on first `docker compose up`).

### Encryption

`src/lib/crypto.ts` — AES-256-GCM via Web Crypto API. Format: `base64(iv[12] + ciphertext + tag[16])`. Used for `github_tokens.encrypted_token`. CLI `token:rotate` reimplements this in Node pure (`scripts/cli/crypto.mjs`) for compatibility.

## Self-hosted Docker profiles

- **Solo** (`docker/docker-compose.solo.yml`) — 6 containers, ~500MB, `AUTH_MODE=solo`
- **Team** (`docker/docker-compose.team.yml`) — 7 containers (+Redis), ~700MB, `AUTH_MODE=closed`
- Bootstrap is incremental: `scripts/bootstrap.sh` skips full SQL if schema exists, but re-applies idempotent migrations listed in `UPGRADE_MIGRATIONS`.

## Key conventions

- Commits: `feat(scope):`, `fix(scope):`, `docs(scope):` format
- Destructive CLI commands require `--yes` flag (pattern in `scripts/cli/user.mjs:userDelete`)
- CLI helpers in `scripts/cli/lib.mjs` (log with colors, parseArgs, requireArgs, ensurePerfilRow)
- Docker operations from host use `scripts/cli/docker.mjs` (`dockerExec`, `run`, `containerHealth`)
- Supabase cookie name fixed to `sb-taskflow-auth-token` via `src/lib/supabase/storage-key.ts` to avoid split-URL mismatch between internal (`http://nginx:8000`) and external (`http://localhost:8000`) URLs
