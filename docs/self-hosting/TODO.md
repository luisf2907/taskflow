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
- [ ] **Trigger `on_auth_user_created` não funciona em self-hosted** —
      investigar causa. Workaround: CLI + solo-login fazem upsert
      manual em `public.perfis`.

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
- [ ] **Perfil full** (Fase 6): docker-compose com MinIO, Supabase
      Realtime, Voice Worker, GlitchTip. Paridade SaaS.
- [ ] **Dockerfile do voice-worker** (Fase 6): empacotar FastAPI +
      Whisper + pyannote + CUDA.
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
- [ ] **Rotação de secrets** — comandos `token:rotate` e procedimento
      pra trocar `ENCRYPTION_KEY` com migração de dados encriptados.

## Documentação

- [ ] **docs/self-hosting/modules/** — 1 arquivo por driver explicando
      opções e trade-offs.
- [ ] **backup-recovery.md**, **upgrade.md**, **troubleshooting.md**
      (Fase 7).

## Observabilidade e testes

- [ ] **Smoke test script** por profile (Fase 8) — `docker compose up` +
      checks HTTP básicos.
- [ ] **CI self-hosted** (Fase 8) — GitHub Actions que sobe stack solo
      e roda smoke test.

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
- [ ] Validar schema drift: script que compara dump de produção com
      `bootstrap.sql` e avisa se divergiram.
- [ ] Make targets pra migração de storage cloud→local e health detalhado.
- [ ] `.env.team.example`, `.env.full.example`.

## Regenerar bootstrap.sql

Quando schema de produção mudar, regenerar é manual:

```bash
supabase db dump --linked --schema public > dump-public.sql
supabase db dump --linked --schema storage > dump-storage.sql
```

E reconstruir `supabase/self-hosted/bootstrap.sql` substituindo seção
2. Automatizar num script (`scripts/regen-bootstrap.sh`) é TODO.
