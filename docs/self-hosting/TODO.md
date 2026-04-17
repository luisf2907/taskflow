# TODO — self-hosted

Débito técnico e limitações conhecidas, em ordem aproximada de prioridade.

## Bloqueadores do perfil solo (funcionar end-to-end)

- [x] **CLI admin** — `scripts/cli.mjs` com `bootstrap`, `user:*`,
      `workspace:*`, `health`. Fase 2 Commit B concluído.
- [x] **`/api/health` endpoint** — já existia, agora público no proxy
      (Fase 2 Commit A). Container app fica healthy.
- [x] **Solo mode auto-login** — `/api/auth/solo-login` cria user se
      não existe e seta sessão (Fase 2 Commit A + hotfixes).
- [x] **Driver storage `local-disk`** (Fase 3 completa) — drivers
      supabase + local-disk implementados em `src/lib/drivers/storage/`.
      Uploads de wiki, anexos, reunião audio via signed URL, tudo via
      `/api/storage/*`. `modules/storage.md` documenta detalhes.
- [x] **Driver realtime `pg-notify-sse`** (Fase 4 completa) —
      triggers pg_notify aplicados via bootstrap.sql. SSE endpoints em
      `/api/realtime/board/<id>` e `/api/realtime/workspace/<id>`.
      Client adapter em `use-realtime.ts` detecta driver.
      `modules/realtime.md` documenta. Polling ainda não
      implementado — se necessário, adicionar `refreshInterval`
      global no SWRConfig.
- [x] **Realtime de planning-poker e notificações** (Fase 5 E) —
      triggers pg_notify em `poker_sessoes`, `poker_votos`,
      `notificacoes`. Hooks migrados pra EventSource. Novo endpoint
      `/api/realtime/user/[userId]` pra notifs. Poker reusa endpoint
      de workspace.

## Fase 5 completa

- [x] **Email driver** — resend/smtp/console/disabled. `modules/email.md`.
- [x] **VCS driver** — github/gitea/disabled + oauth/pat/instance-pat
      token modes. 10 rotas refatoradas pra `getVcsToken()`.
      `modules/vcs.md`.
- [x] **Observability driver** — sentry/glitchtip/console/noop.
      Sentry configs respeitam OBS_DRIVER. `modules/observability.md`.
- [x] **UI condicional** — botões de IA, tab "Gravar" de reuniões,
      Settings → GitHub em instance-pat mode.
- [x] **Trigger `on_auth_user_created`** — causa: `pg_dump --schema=public`
      nao captura triggers em tabelas de outro schema (`auth.users`).
      Fix: trigger adicionado explicitamente no bootstrap.sql (secao 4b)
      e em `supabase/cloud/07-trigger-auth-perfis.sql`. Workaround
      manual (CLI upsert) continua como fallback.

## Drivers não implementados

- [ ] **LLM drivers** (Fase 5): implementação concreta para `ollama`,
      `openai-compat`, `anthropic`. Hoje só `gemini` e `disabled`
      funcionam.
- [ ] **Email drivers** (Fase 5): `smtp` (Nodemailer), `postmark`,
      `console`. Hoje só `resend` e `disabled`.
- [ ] **Observability drivers** (Fase 5): `glitchtip`, `console`,
      `noop`. Hoje só `sentry`.
- [ ] **VCS drivers** (Fase 5): `gitea`, `instance-pat` mode. Hoje só
      `github` com `oauth` e `pat`.
- [ ] **Voice driver `disabled`** (Fase 5): UI precisa esconder tab
      "Gravar" quando `VOICE_DRIVER=disabled`.

## Infra

- [x] **Perfil team** (Fase 6): `docker-compose.team.yml` com Redis
      container (rate limiting nativo via ioredis), AUTH_MODE=closed,
      SMTP configuravel, troca de senha obrigatoria no primeiro login
      (app_metadata + /trocar-senha). `.env.team.example` + quickstart.
- [x] **Perfil full** (Fase 6): `docker-compose.full.yml` com MinIO
      (S3-compat), GlitchTip (error tracking), Redis. S3 driver
      implementado (`src/lib/drivers/storage/s3.ts` via @aws-sdk).
      `.env.full.example` + `quickstart-full.md`.
- [x] **Dockerfile do voice-worker** (Fase 6): `docker/Dockerfile.voice-worker`
      com CUDA 12.4, PyTorch 2.5, faster-whisper, pyannote. Baseado no
      repo `taskflow-voice`. Referenciado (comentado) no compose full.
- [x] **docker-compose.dev.yml** (Fase 6): so infra (postgres, gotrue,
      postgrest, nginx) pra rodar `npm run dev` no host com hot reload.
- [ ] **storage-api container** para perfil full (quando operador
      quiser `STORAGE_DRIVER=supabase` em self-hosted).

## Segurança

- [x] **Bucket `anexos` sem policies** — fechado em duas camadas:
      (1) `guardAnexoAccess()` em `src/lib/anexos-guard.ts` valida
      membership nos handlers `/api/storage/upload` e `/api/storage/object`
      (unico gate real, porque `SupabaseStorageDriver` usa service_role);
      (2) policies em `storage.objects` como defense-in-depth (bootstrap.sql
      + `supabase/migrations/045_anexos_storage_policies.sql`).
      Leitura continua publica — so write e restrito por workspace do cartao.
- [ ] **Testes de RLS** (Fase 8) — 2 users de workspaces diferentes,
      garantir isolamento.
- [x] **Rotação de secrets** — CLI `token:rotate` implementado (ver
      Fase 9 quick-win abaixo).

## Documentação

- [x] **Docs completos** (Fase 7): troubleshooting.md, backup-recovery.md,
      upgrade.md, deploy/vps.md (Caddy + Traefik + HTTPS), modules/voice.md,
      modules/llm.md. README.md atualizado com indice completo.

## Observabilidade e testes

- [x] **CI self-hosted** (Fase 8) — `.github/workflows/ci-self-hosted.yml`:
      sobe stack solo, valida health, cria users via CLI, testa endpoints,
      roda teste RLS, testa backup. Logs em caso de falha.
- [x] **Testes de RLS** (Fase 8) — `scripts/test-rls.mjs`: cria 2 users
      em workspaces diferentes, valida isolamento (12 assertions). Roda
      no CI e local.
- [x] **Imagens Docker GHCR** (Fase 8) — `.github/workflows/publish-image.yml`:
      build + push pra `ghcr.io/luisf2907/taskflow-app` em push pra
      main/feat/self-hosted. Cache via GitHub Actions cache.
- [x] **Release automation** (Fase 8) — `.github/workflows/release.yml`:
      push de tag `v*` → build → publish imagem com tag de versao →
      GitHub Release com changelog auto-gerado.

## Polimento (Fase 9)

- [x] **CLI `backup` + `restore`** — `scripts/cli/backup.mjs` e
      `restore.mjs` com manifest + sha256. `make backup` e
      `make restore FROM=... YES=1`. Documentado em `quickstart-solo.md`.
      Fase 9 quick-win primeira parte.
- [x] **CLI `token:rotate`** — `scripts/cli/token.mjs` com `--jwt`
      (re-emite JWT_SECRET + ANON + SERVICE_ROLE, admin rebuilda app) e
      `--encryption` (re-encripta github_tokens em transacao atomica, para
      app durante ~30s). `--all` faz ambos. Documentado em
      `modules/auth.md`. Fase 9 quick-win segunda parte.
- [x] **Polling driver** — `REALTIME_DRIVER=polling` via `refreshInterval: 10s`
      global no SWRConfig. Hooks de realtime sao no-op; SWR revalida
      periodicamente.
- [x] **Gitea parser fix** — `parsearRepo()` agora aceita qualquer
      hostname (URL generico via `new URL()`) em vez de regex hardcoded
      `github.com`.
- [x] **Schema drift validation** — `scripts/validate-schema.mjs`
      compara tabelas e policies do bootstrap.sql com o DB rodando.
- [x] **CLI migrate:storage** — `scripts/cli/migrate-storage.mjs`
      copia arquivos entre drivers (local-disk → s3-compat, etc).
      Roda dentro do container app. NAO deleta na origem.
- [x] `.env.team.example`, `.env.full.example` — criados com todas
      opcoes organizadas por secao.

## Regenerar bootstrap.sql

Quando schema de produção mudar, regenerar é manual:

```bash
supabase db dump --linked --schema public > dump-public.sql
supabase db dump --linked --schema storage > dump-storage.sql
```

E reconstruir `supabase/self-hosted/bootstrap.sql` substituindo seção
2. Automatizar num script (`scripts/regen-bootstrap.sh`) é TODO.
