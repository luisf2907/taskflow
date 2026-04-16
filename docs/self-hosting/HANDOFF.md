# Handoff — Self-Hosted Taskflow

Documento pra continuar o trabalho numa nova conversa com a LLM.
Branch: `feat/self-hosted` — 47 commits acima do `main`, pushada em
`https://github.com/luisf2907/taskflow/tree/feat/self-hosted`.

---

## O que é

Taskflow = kanban multi-tenant (workspaces, quadros, cartões, sprints,
wiki, reuniões com transcrição IA, planning poker, integração GitHub).
Stack atual cloud: Next.js 16 + Supabase Cloud (Auth/Postgres/Storage/
Realtime) + Gemini + Resend + Sentry + Upstash + voice worker externo.

Esta branch adiciona **modo self-hosted 100% funcional** — roda numa
máquina via `docker compose` com 6 containers, sem depender de SaaS
externo. Mantém 100% das features do cloud via camada de drivers
plugáveis configuráveis por env.

---

## Estado atual — o que está feito

### Fase 1 — Infra base ✅
- `docker/docker-compose.solo.yml`: 6 containers (postgres+pgvector,
  gotrue, postgrest, nginx, bootstrap, app)
- `supabase/self-hosted/bootstrap.sql` (2820 linhas): schema
  consolidado do dump de produção — aplicado uma vez no primeiro up
- `scripts/gen-secrets.mjs` + `setup-env.mjs`: gera JWT secret, chaves
  Supabase assinadas, ENCRYPTION_KEY
- `docker/postgres-init/*.sql`: pré-cria schemas auth/storage e roles
  (anon/authenticated/service_role/authenticator)
- `docker/nginx.conf`: gateway CORS + reverse proxy pra GoTrue e
  PostgREST
- `docs/self-hosting/README.md`, `quickstart-solo.md`, `TODO.md`

### Fase 2 — Auth + CLI ✅
- **Solo mode**: `AUTH_MODE=solo` bypassa tela de login, cria user
  `admin@taskflow.local` automaticamente na primeira visita via
  `/api/auth/solo-login` (usa GoTrue admin API + magic link exchange)
- **CLI em Node.js puro** (`scripts/cli.mjs`): bootstrap, user:create,
  user:list, user:reset-password, user:delete, workspace:create,
  workspace:list, workspace:invite (gera link copiável sem email),
  health
- **`/api/health`** endpoint público (HEALTHCHECK Docker)
- **Workaround do trigger faltoso**: `on_auth_user_created` não
  dispara em self-hosted por motivo desconhecido; solo-login e CLI
  fazem upsert manual em `public.perfis`

### Fase 3 — Storage drivers ✅
- `src/lib/drivers/storage/`: interface + impls `supabase` (cloud
  default) e `local-disk` (self-hosted)
- `src/app/api/storage/upload` (POST/PUT) + `object/[bucket]/[...path]`
  (GET/DELETE)
- `src/lib/storage-client.ts`: client-side wrapper unificado
- Wiki uploads, anexos de card, áudio de reunião (signed URL) —
  migrados pra passar pelo driver
- Signed URLs em local-disk usam HMAC-SHA256 com JWT_SECRET
- **S3-compat**: placeholder (Fase 6)

### Fase 4 — Realtime SSE ✅
- Triggers `pg_notify('realtime_events', payload)` em 8 tabelas:
  quadros, colunas, cartoes, comentarios, atividades, notificacoes,
  poker_sessoes, poker_votos
- `src/lib/realtime/pg-listen.ts`: helper com `postgres.js`
- 3 SSE endpoints: `/api/realtime/board/[quadroId]`,
  `workspace/[workspaceId]`, `user/[userId]`
- Client adapter em `use-realtime.ts`, `use-planning-poker.ts`,
  `use-notificacoes.ts` — detecta `features.realtime.driver` e troca
  `supabase.channel()` por `new EventSource(...)`
- **Importante**: NEXT_PUBLIC_REALTIME_DRIVER precisa estar setado
  em build time pro Next.js inlinar no bundle client

### Fase 5 — Drivers restantes ✅
- **Email driver** (`src/lib/drivers/email/`): resend/smtp/console/
  disabled. Gmail relay, Mailgun etc via SMTP. Console loga pretty
  no stdout. Disabled = convites viram link copiável.
- **VCS driver** (`src/lib/drivers/vcs/config.ts`): github/gitea,
  URL configurável (`VCS_API_URL`), 3 token modes:
  - `oauth` (cloud default)
  - `pat` (user cola em Settings)
  - `instance-pat` (1 PAT global pra todo instance — home lab)
  - 10 rotas API refatoradas pra `getVcsToken()` com fallback correto
- **Observability driver**: sentry/glitchtip/console/noop. Sentry SDK
  é 100% compat com GlitchTip — só troca DSN.
- **UI condicional**: botões de IA somem se `LLM_DRIVER=disabled`,
  tab "Gravar" some se `VOICE_DRIVER=disabled`, Settings → GitHub
  vira read-only em `instance-pat` mode
- **LLM**: mantido só Gemini por enquanto (user preferiu adiar
  ollama/openai-compat/anthropic). Disabled funciona end-to-end.

---

## O que falta — roadmap restante

### 🟠 Fase 6 — Perfis team e full (~18h)

**`docker/docker-compose.team.yml`** (6h)
- Adiciona: `redis` (rate limit real), `ollama` (LLM local), `postfix`
  (SMTP interno opcional)
- Cenário: 2-20 pessoas em LAN
- Reusa o compose solo como base + services extras

**`docker/docker-compose.full.yml`** (8h)
- Adiciona: `supabase/realtime` container (alternativa ao pg-notify-sse),
  `minio` (S3-compat storage), `glitchtip` (error tracking), integração
  com voice-worker remoto
- Cenário: paridade SaaS, produção
- Mais containers (~12 total), ~8GB RAM

**`docker/Dockerfile.voice-worker`** (4h)
- Empacota FastAPI + Whisper + pyannote + CUDA. O worker hoje é um
  repo separado do user — precisa dockerizar ou publicar imagem.
- Requer GPU NVIDIA no host.

**`docker-compose.dev.yml`** (2h — opcional)
- Só postgres + gotrue, pra dev local do app com `next dev` na host

### 🟡 Fase 7 — Docs completas (~14h)

- **`quickstart-team.md`** + **`quickstart-full.md`**
- **`backup-recovery.md`**: procedimento formalizado (hoje é manual
  via pg_dump + tar do storage)
- **`upgrade.md`**: como atualizar quando tiver versão nova
- **`troubleshooting.md`**: consolida erros comuns
- **`deploy/vps.md`**: guia de deploy em VPS com Caddy/Traefik + HTTPS
  automático (Let's Encrypt)
- **`modules/llm.md`**, **`voice.md`**: faltantes

### 🟡 Fase 8 — CI e imagens publicadas (~12h)

- **GitHub Actions** que:
  - Sobe stack solo e valida endpoints
  - Testa RLS isolamento multi-tenant (2 users, workspaces diferentes)
  - Builda e publica imagens em `ghcr.io/luisf2907/taskflow-app:latest`
- **Imagens Docker publicadas** → `docker pull` em vez de build local
  (leva 30s em vez de 5min)
- **Release automation**: tag → build → publish → changelog

### 🟢 Fase 9 — Polimento (~15h)

- **CLI `backup` / `restore`** — automatiza pg_dump + storage tar
- **CLI `migrate:storage`** — move arquivos entre drivers
  (cloud → local-disk, local-disk → s3)
- **CLI `token:rotate`** — rotação de JWT_SECRET e ENCRYPTION_KEY
  com re-encrypt de tokens existentes
- **Polling driver**: implementar `REALTIME_DRIVER=polling` com
  `refreshInterval` global no SWRConfig
- **Fix trigger `on_auth_user_created`**: investigar por que não
  dispara em self-hosted (postgres-init pre-cria schema auth com
  owner=postgres, GoTrue cria auth.users depois com outro owner?)
- **LLM drivers adicionais**: ollama, openai-compat, anthropic
  (user disse que ficou pra depois)

### ⚠️ Débitos conhecidos (não no plano)

- **Bucket `anexos` sem RLS policies** — problema também no cloud
  prod. Replicado no bootstrap. Admin deve adicionar policies.
- **Regex `parsearRepo` hardcoded github.com** (`src/lib/github/client.ts`)
  — não reconhece URLs Gitea. Token e API funcionam, só o parser
  inicial falha. Fix fácil usando hostname de `VCS_API_URL`.
- **Postmark email driver**: stub, não implementado. Fase 6+.

---

## Arquivos/diretórios chave

```
.env.solo.example              # Template de envs pro perfil solo
docker/
  Dockerfile.app               # Multi-stage Next.js standalone
  docker-compose.solo.yml      # Stack atual (6 containers)
  nginx.conf                   # Gateway CORS + routing
  postgres-init/               # Init scripts do DB
scripts/
  cli.mjs                      # CLI admin dispatcher
  cli/                         # Subcomandos (user, workspace, health, bootstrap)
  gen-secrets.mjs              # Gera secrets
  setup-env.mjs                # Gera .env.local
  bootstrap.sh                 # Aplica SQL no primeiro up
supabase/self-hosted/
  bootstrap.sql                # Schema consolidado (2820 linhas)
  realtime-triggers.sql        # Triggers pg_notify (re-aplicáveis)
src/lib/
  env.ts                       # Schema Zod de envs
  features.ts                  # Feature flags derivadas de envs
  drivers/
    email/                     # Email driver + impls
    storage/                   # Storage driver + impls
    vcs/config.ts              # VCS helpers (token + baseUrl)
  realtime/pg-listen.ts        # Helper LISTEN Postgres
  storage-client.ts            # Client-side storage API
  supabase/
    client.ts                  # Browser client
    server.ts                  # SSR + service client
    storage-key.ts             # Cookie name constante (evita split-URL)
src/app/api/
  auth/solo-login/             # Auto-login em solo mode
  health/                      # Docker healthcheck
  realtime/
    board/[quadroId]/          # SSE pro kanban
    workspace/[workspaceId]/   # SSE pra workspace (+ poker)
    user/[userId]/             # SSE pra notificações
  storage/
    upload/                    # POST/PUT upload
    object/[bucket]/[...path]/ # GET/DELETE serve
  (todas as rotas github/pr-* refatoradas pra getVcsToken)
src/hooks/
  use-realtime.ts              # Board/workspace/atividades
  use-planning-poker.ts        # SSE-aware
  use-notificacoes.ts          # SSE-aware
docs/self-hosting/
  README.md, TODO.md, HANDOFF.md (este)
  quickstart-solo.md
  configuration.md             # Referência de todas as envs
  modules/
    auth.md, storage.md, realtime.md, email.md, vcs.md, observability.md
```

---

## Decisões arquiteturais importantes

1. **Driver pattern em vez de reescrita**: app continua usando
   `@supabase/ssr`, `supabase.from(...)`, etc. Drivers ficam atrás
   de API routes (`/api/storage/*`, `/api/realtime/*`) ou factories
   (`getEmailDriver`, `getVcsToken`). Muda backend por env, zero
   código de UI mexe.

2. **NEXT_PUBLIC_ mirrors**: server-only envs (REALTIME_DRIVER, etc)
   não sobrevivem ao build do cliente. Precisa mirror `NEXT_PUBLIC_*`
   pra valores que o client precisa ler. Features.ts faz acessos
   diretos (`process.env.NEXT_PUBLIC_FOO`) — Next.js só inlina assim.

3. **Storage key compartilhado** (`sb-taskflow-auth-token`): evita
   split-URL cookie mismatch. Server usa `http://nginx:8000`, client
   usa `http://localhost:8000` — sem key fixa, cookies tinham nomes
   diferentes.

4. **Postgres direct for LISTEN**: SSE endpoints usam `postgres.js`
   lib direto (não via Supabase SDK) pra conexões persistentes com
   LISTEN/NOTIFY. Cada SSE client abre sua conexão dedicada (max=1,
   idle_timeout=0).

5. **Bootstrap incremental**: scripts/bootstrap.sh skipa o SQL
   completo se `public.workspaces` já existe, MAS reaplica o
   `realtime-triggers.sql` (idempotente com DROP IF EXISTS) toda
   vez. Permite adicionar triggers em versões novas sem destruir o DB.

6. **Solo mode**: `AUTH_MODE=solo` + `SOLO_USER_EMAIL` → proxy
   redireciona pra `/api/auth/solo-login` → GoTrue admin generateLink
   + verifyOtp → sessão. Use prod só em localhost/LAN confiável.

---

## Como testar em outra máquina (referência rápida)

```powershell
git clone https://github.com/luisf2907/taskflow.git
cd taskflow
git checkout feat/self-hosted

node scripts/setup-env.mjs

docker compose -f docker/docker-compose.solo.yml --env-file .env.local up -d
# Aguarda ~5min (build)

node --env-file=.env.local scripts/cli.mjs health
# Deve dizer "Stack 100% saudavel"

# Browser: http://localhost:3000 → auto-loga em solo mode
```

Pra multi-user, trocar `AUTH_MODE=solo` → `closed` no .env.local +
`docker compose up -d --force-recreate app`, e criar users via CLI:

```powershell
node --env-file=.env.local scripts/cli.mjs user:create --email x --password y --name Z
node --env-file=.env.local scripts/cli.mjs workspace:invite --workspace "Meu Time" --email x@y
```

---

## Contexto sobre o usuário

- Plataforma: Windows com PowerShell (conda env)
- Não tem `make` instalado → usar `node scripts/cli.mjs` direto
- Prefere testar UI no próprio browser (não chamar `preview_start`)
- Linguagem: português BR
- Trabalha iterativamente com commits atômicos + push no final
- Prefere "modular e swappable" sobre "simples mas amarrado"

---

## Sugestão de próximo movimento

Pela ordem de impacto:

1. **Testar Fase 5** no browser (rebuild + testes de IA/voice/
   notifs em tempo real). Se tudo ok → seguir.
2. **Fase 9 quick-wins** (~8h): CLI `backup`/`restore` +
   `token:rotate`. Destrava operação real sem medo.
3. **Fase 6**: `docker-compose.team.yml` + `full.yml`. Destrava
   cenários com time maior.
4. **Fase 8**: CI + imagens Docker publicadas no GHCR. Destrava
   "distribuir pra terceiros".
5. **Fase 7**: docs finais.

Ou se o usuário só quer usar pessoalmente com time pequeno, Fase 5
já é suficiente — features opcionais (Fase 6+) podem esperar demanda
concreta.
