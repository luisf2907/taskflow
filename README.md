# Taskflow

Kanban moderno com sprints, wiki, Planning Poker, integração nativa com GitHub (OAuth, branches, PRs, webhooks), gravação de reuniões com transcrição por IA (Whisper) e geração de cards via IA (Gemini). SaaS multi-tenant.

Stack: Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind 4 · Supabase (Postgres + Auth + Storage + Realtime) · Sentry · Upstash Redis · TipTap · dnd-kit.

> ⚠️ **Atenção devs e LLMs:** Next.js 16 tem mudanças breaking. `middleware` foi renomeado para `proxy` (ver `src/proxy.ts`). Consulte `node_modules/next/dist/docs/` antes de alterar convenções de framework.

---

## Setup rápido

### Pré-requisitos

- Node 20+
- Conta no [Supabase](https://supabase.com) (free tier serve para dev)
- Opcional: conta Upstash Redis, Sentry, Resend, Google AI Studio (Gemini)
- Opcional: worker de voz (FastAPI + Whisper) — só necessário se for mexer em reuniões

### Passos

```bash
# 1. Clonar e instalar
git clone <repo-url> taskflow
cd taskflow
npm install

# 2. Configurar .env.local
cp .env.example .env.local
# preencher pelo menos: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY

# 3. Gerar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# copiar o valor para ENCRYPTION_KEY no .env.local

# 4. Aplicar migrations no seu projeto Supabase
# No dashboard Supabase: SQL Editor → rodar em ordem os arquivos de supabase/migrations/
# Ou via CLI: supabase db push (requer supabase link)

# 5. Rodar
npm run dev
# abrir http://localhost:3000
```

### Variáveis de ambiente

Validadas via Zod em [src/lib/env.ts](src/lib/env.ts). Variáveis obrigatórias (sem elas o server não sobe):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (64 hex chars, AES-256-GCM)

Opcionais (features degradam sem elas): `GEMINI_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `VOICE_WORKER_URL/API_KEY/WEBHOOK_SECRET`. Ver [.env.example](.env.example) para descrição de cada uma.

---

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # build de produção
npm run start        # server de produção (pós-build)
npm run lint         # eslint
npm run format       # prettier --write em src/
npm run format:check # prettier --check
npm run test         # vitest (unit tests)
npm run test:watch   # vitest watch mode
npm run analyze      # build com bundle analyzer (abre report no browser)
```

---

## Arquitetura

```
src/
├── app/                    # App Router (rotas, páginas, API routes)
│   ├── api/                # API routes (REST + MCP + webhooks)
│   ├── dashboard/          # home do user autenticado
│   ├── quadro/[id]/        # quadro kanban
│   ├── workspace/[id]/     # workspace (membros, sprints, wiki, reuniões)
│   ├── login/, termos/,    # páginas públicas
│   │   privacidade/, ...
│   └── layout.tsx
├── components/             # componentes React compartilhados
├── lib/
│   ├── env.ts              # validação Zod das envs
│   ├── crypto.ts           # AES-256-GCM (GitHub tokens, API keys)
│   ├── logger.ts           # logger custom c/ buffer + Sentry
│   ├── rate-limit.ts       # Upstash + fallback in-memory
│   └── supabase/           # clients (SSR, browser, service role)
├── proxy.ts                # middleware de auth (Next.js 16 renomeou!)
├── instrumentation.ts      # Sentry bootstrap
└── sentry.*.config.ts      # Sentry configs (client/server/edge)
supabase/
└── migrations/             # 044 migrations ordenadas (000 → 044)
```

### Rotas protegidas vs públicas

O `src/proxy.ts` protege **tudo** por default. Rotas públicas (whitelist):

- `/`, `/pricing`, `/termos`, `/privacidade`, `/reset-password`
- `/help/*`, `/convite/*`
- `/api/v1/*`, `/api/mcp/*` (auth via API key)
- `/api/api-keys/*` (gerencia as próprias API keys, usa cookie)
- `/api/reunioes/*/webhook` (auth via HMAC do worker de voz)
- `/api/webhooks/*` (não passa pelo proxy)

Qualquer outra rota redireciona pra `/login` se não autenticado.

### Integrações

- **GitHub**: OAuth, branches, PRs, webhooks. Tokens encriptados (AES-256-GCM) em `github_tokens`. Ver `src/app/api/github/*` e `src/app/api/pr-*`.
- **Gemini**: geração e enhance de cards, resumo de reunião. Ver `src/app/api/ai/*`.
- **Voice worker**: FastAPI externo (GPU) que recebe áudio e manda transcrição de volta via webhook HMAC. Ver `src/app/api/reunioes/*`.
- **MCP Server**: expõe a API do Taskflow via Model Context Protocol (Claude Desktop, etc). Ver `src/app/api/mcp/*` e `src/app/api/v1/*`.

---

## Banco de dados

PostgreSQL via Supabase. Migrations em ordem numérica em `supabase/migrations/` — aplicar em sequência.

RLS (Row Level Security) habilitado em todas as tabelas multi-tenant. Policies otimizadas em `025_rls_performance_overhaul.sql` usando helpers `my_workspace_ids()` e `is_workspace_member()`.

---

## Deploy

Vercel é o alvo padrão:

1. Importar repo no Vercel
2. Configurar **todas** as envs obrigatórias + as opcionais que quiser ativar
3. Build e deploy automáticos a cada push na `main`

Antes do go-live, ver o checklist em `.claude/plans/curious-fluttering-crane.md` (auditoria de production-readiness).

---

## Contribuindo

1. Branch a partir de `main`: `git checkout -b feat/minha-feature`
2. Commits com escopo: `feat(kanban): ...`, `fix(auth): ...`
3. `npm run lint && npm run format:check && npm run test` antes de push
4. Abrir PR descrevendo o _porquê_ da mudança

---

## Licença

Proprietária. Todos os direitos reservados.
